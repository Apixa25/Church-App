import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import chatApi, { ChatGroup, ChatMessage, GroupMember, SendMessageRequest } from '../services/chatApi';
import webSocketService, { ChatSocketError, TypingStatus } from '../services/websocketService';
import MessageInput, { OutgoingMessage } from './MessageInput';
import ChatMessageComponent from './ChatMessage';
import ChatMembers from './ChatMembers';
import ConfirmationModal from './ConfirmationModal';
import ChatPromptModal from './ChatPromptModal';
import LoadingSpinner from './LoadingSpinner';
import { notifyChatUnreadCountRefresh } from '../hooks/useChatUnreadCount';
import { upsertMessage, getDirectMessageDisplay } from '../utils/chatMessages';

const PAGE_SIZE = 50;
const NEAR_BOTTOM_PX = 120;
const SEND_ACK_TIMEOUT_MS = 10_000;
const TYPING_EXPIRY_MS = 5_000;
const MARK_READ_DEBOUNCE_MS = 800;

type PendingConfirm =
  | { kind: 'delete'; messageId: string }
  | { kind: 'leave' }
  | { kind: 'removeMember'; memberId: string; displayName: string };

const ChatRoom: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [page, setPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(webSocketService.isWebSocketConnected());
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [reportTarget, setReportTarget] = useState<ChatMessage | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const wasConnectedRef = useRef(webSocketService.isWebSocketConnected());
  const lastTypingTime = useRef<number>(0);
  const isNearBottomRef = useRef(true);
  const prependAdjustRef = useRef<{ height: number; top: number } | null>(null);
  const ackTimersRef = useRef<Map<string, number>>(new Map());
  const typingTimersRef = useRef<Map<string, number>>(new Map());
  const markReadTimerRef = useRef<number | null>(null);
  const unsubscribeFunctions = useRef<(() => void)[]>([]);

  const display = useMemo(() => getDirectMessageDisplay(group, user?.name), [group, user?.name]);
  const isDirectMessage = group?.type === 'DIRECT_MESSAGE';

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // ----- scrolling -----

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    isNearBottomRef.current = true;
    setUnseenCount(0);
  }, []);

  // Keep the viewport anchored on the same message after older ones are prepended
  useLayoutEffect(() => {
    const adjust = prependAdjustRef.current;
    const el = messagesContainerRef.current;
    if (adjust && el) {
      el.scrollTop = el.scrollHeight - adjust.height + adjust.top;
      prependAdjustRef.current = null;
    }
  }, [messages]);

  // ----- read receipts -----

  const scheduleMarkAsRead = useCallback(() => {
    if (!groupId) return;
    if (markReadTimerRef.current) {
      window.clearTimeout(markReadTimerRef.current);
    }
    markReadTimerRef.current = window.setTimeout(() => {
      markReadTimerRef.current = null;
      if (document.visibilityState !== 'visible') return;
      chatApi.markAsRead(groupId, new Date().toISOString())
        .then(() => {
          notifyChatUnreadCountRefresh();
          queryClient.setQueryData<ChatGroup[]>(['chatGroups'], old =>
            old ? old.map(g => (g.id === groupId ? { ...g, unreadCount: 0 } : g)) : old
          );
        })
        .catch(err => console.error('Error marking chat as read:', err));
    }, MARK_READ_DEBOUNCE_MS);
  }, [groupId, queryClient]);

  // ----- optimistic send helpers -----

  const clearAckTimer = useCallback((tempId: string) => {
    const timer = ackTimersRef.current.get(tempId);
    if (timer) {
      window.clearTimeout(timer);
      ackTimersRef.current.delete(tempId);
    }
  }, []);

  const markFailed = useCallback((tempId: string, reason: string) => {
    clearAckTimer(tempId);
    setMessages(prev => prev.map(m =>
      m.tempId === tempId && m.status === 'sending' ? { ...m, status: 'failed', sendError: reason } : m
    ));
  }, [clearAckTimer]);

  const armAckTimer = useCallback((tempId: string) => {
    clearAckTimer(tempId);
    const timer = window.setTimeout(
      () => markFailed(tempId, 'No response from server'),
      SEND_ACK_TIMEOUT_MS
    );
    ackTimersRef.current.set(tempId, timer);
  }, [clearAckTimer, markFailed]);

  // ----- websocket -----

  const handleIncomingMessage = useCallback((message: ChatMessage) => {
    if (message.tempId) {
      clearAckTimer(message.tempId);
    }
    const isOwn = message.userId === user?.userId;
    const shouldStick = isOwn || isNearBottomRef.current;
    const existed = messagesRef.current.some(m =>
      (message.id && m.id === message.id) || (message.tempId && m.tempId === message.tempId)
    );

    setMessages(prev => upsertMessage(prev, message));
    if (!existed && !isOwn && !shouldStick && message.messageType !== 'SYSTEM') {
      setUnseenCount(count => count + 1);
    }

    if (shouldStick) {
      requestAnimationFrame(() => scrollToBottom(isOwn ? 'auto' : 'smooth'));
    }
    if (!isOwn && !message.isDeleted && message.messageType !== 'SYSTEM') {
      scheduleMarkAsRead();
    }
  }, [user?.userId, clearAckTimer, scrollToBottom, scheduleMarkAsRead]);

  const handleTypingStatus = useCallback((typing: TypingStatus) => {
    if (!typing.userId || typing.userId === user?.userId) return;
    const key = typing.userId;
    const existing = typingTimersRef.current.get(key);
    if (existing) {
      window.clearTimeout(existing);
      typingTimersRef.current.delete(key);
    }
    setTypingUsers(prev => {
      const next = new Map(prev);
      if (typing.isTyping) {
        next.set(key, typing.displayName || 'Someone');
      } else {
        next.delete(key);
      }
      return next;
    });
    if (typing.isTyping) {
      typingTimersRef.current.set(key, window.setTimeout(() => {
        typingTimersRef.current.delete(key);
        setTypingUsers(prev => {
          if (!prev.has(key)) return prev;
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      }, TYPING_EXPIRY_MS));
    }
  }, [user?.userId]);

  const handleSocketError = useCallback((error: ChatSocketError) => {
    if (error.tempId) {
      markFailed(error.tempId, error.message || 'Message could not be sent');
      return;
    }
    setInlineError(error.message || 'Connection error');
  }, [markFailed]);

  const loadMembers = useCallback(async () => {
    if (!groupId) return;
    try {
      setMembers(await chatApi.getGroupMembers(groupId));
    } catch (err) {
      console.error('Error loading members:', err);
    }
  }, [groupId]);

  const connectWebSocket = useCallback(async () => {
    if (!groupId) return;

    try {
      await webSocketService.connect();

      const unsubMessages = webSocketService.subscribeToGroupMessages(groupId, handleIncomingMessage);
      const unsubTyping = webSocketService.subscribeToTyping(groupId, handleTypingStatus);
      const unsubNotifications = webSocketService.subscribeToGroupNotifications(groupId, (notification) => {
        const type = notification.type || (notification as any).eventType;
        if (['user_joined', 'user_left', 'member_removed', 'member_updated'].includes(type)) {
          loadMembers();
        }
      });
      const unsubErrors = webSocketService.subscribeToErrors(handleSocketError);
      const unsubPresence = webSocketService.subscribeToPresence((presence) => {
        setMembers(prev => prev.map(m =>
          m.email === presence.userEmail ? { ...m, isOnline: presence.status === 'online' } : m
        ));
      });

      unsubscribeFunctions.current = [unsubMessages, unsubTyping, unsubNotifications, unsubErrors, unsubPresence];
    } catch (err) {
      console.error('Failed to connect to WebSocket:', err);
    }
  }, [groupId, handleIncomingMessage, handleTypingStatus, handleSocketError, loadMembers]);

  useEffect(() => {
    return webSocketService.addConnectionListener(connected => {
      setSocketConnected(connected);
      const reconnected = connected && !wasConnectedRef.current;
      wasConnectedRef.current = connected;
      if (reconnected && groupId && !loading) {
        // Re-attach subscriptions after a reconnect and pick up anything we missed
        connectWebSocket();
        chatApi.getMessages(groupId, 0, PAGE_SIZE)
          .then(res => setMessages(prev => res.content.reverse().reduce(upsertMessage, prev)))
          .catch(() => { /* best effort */ });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, loading]);

  // ----- initial load -----

  const loadChatRoom = useCallback(async () => {
    if (!groupId) return;

    try {
      setLoading(true);
      setLoadError(null);
      setInlineError(null);

      const [groupsResponse, messagesResponse, membersResponse] = await Promise.all([
        chatApi.getGroups(),
        chatApi.getMessages(groupId, 0, PAGE_SIZE),
        chatApi.getGroupMembers(groupId)
      ]);

      const currentGroup = groupsResponse.find(g => g.id === groupId);
      if (!currentGroup) {
        setLoadError('Chat group not found');
        return;
      }

      setGroup(currentGroup);
      setMessages(messagesResponse.content.reverse());
      setMembers(membersResponse);
      setPage(0);
      setHasMoreMessages(messagesResponse.number < messagesResponse.totalPages - 1);

      await connectWebSocket();

      chatApi.markAsRead(groupId)
        .then(() => {
          notifyChatUnreadCountRefresh();
          queryClient.setQueryData<ChatGroup[]>(['chatGroups'], old =>
            old ? old.map(g => (g.id === groupId ? { ...g, unreadCount: 0 } : g)) : old
          );
        })
        .catch(err => console.error('Error marking chat as read:', err));
    } catch (err: any) {
      const status = err?.response?.status;
      setLoadError(
        status === 403 ? "You don't have access to this chat" :
        status === 404 ? 'Chat group not found' :
        'Failed to load chat room'
      );
      console.error('Error loading chat room:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, connectWebSocket, queryClient]);

  useEffect(() => {
    if (!groupId) {
      navigate('/chats');
      return;
    }

    loadChatRoom();

    return () => {
      unsubscribeFunctions.current.forEach(unsub => unsub());
      unsubscribeFunctions.current = [];
      ackTimersRef.current.forEach(timer => window.clearTimeout(timer));
      ackTimersRef.current.clear();
      typingTimersRef.current.forEach(timer => window.clearTimeout(timer));
      typingTimersRef.current.clear();
      if (markReadTimerRef.current) {
        window.clearTimeout(markReadTimerRef.current);
        markReadTimerRef.current = null;
      }
    };
  }, [groupId, loadChatRoom, navigate]);

  // Add body class when in chat room to prevent body scroll
  useEffect(() => {
    document.body.classList.add('in-chat-room');

    const updateChatViewportHeight = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const viewportOffsetTop = window.visualViewport?.offsetTop || 0;
      document.documentElement.style.setProperty('--chat-viewport-height', `${viewportHeight}px`);
      document.documentElement.style.setProperty('--chat-viewport-offset-top', `${viewportOffsetTop}px`);
    };

    updateChatViewportHeight();
    window.visualViewport?.addEventListener('resize', updateChatViewportHeight);
    window.visualViewport?.addEventListener('scroll', updateChatViewportHeight);
    window.addEventListener('resize', updateChatViewportHeight);
    window.addEventListener('orientationchange', updateChatViewportHeight);

    return () => {
      document.body.classList.remove('in-chat-room');
      document.documentElement.style.removeProperty('--chat-viewport-height');
      document.documentElement.style.removeProperty('--chat-viewport-offset-top');
      window.visualViewport?.removeEventListener('resize', updateChatViewportHeight);
      window.visualViewport?.removeEventListener('scroll', updateChatViewportHeight);
      window.removeEventListener('resize', updateChatViewportHeight);
      window.removeEventListener('orientationchange', updateChatViewportHeight);
    };
  }, []);

  // Jump to the newest message once the initial page has rendered
  useEffect(() => {
    if (!loading && messages.length > 0) {
      const id = window.setTimeout(() => scrollToBottom(), 100);
      return () => window.clearTimeout(id);
    }
    // Only on the initial loading transition; live messages use the near-bottom rule.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, scrollToBottom]);

  const loadMoreMessages = async () => {
    if (!groupId || !hasMoreMessages || loadingMore) return;

    try {
      setLoadingMore(true);
      const el = messagesContainerRef.current;
      if (el) {
        prependAdjustRef.current = { height: el.scrollHeight, top: el.scrollTop };
      }
      const nextPage = page + 1;
      const response = await chatApi.getMessages(groupId, nextPage, PAGE_SIZE);
      
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const older = response.content.reverse().filter(m => !existingIds.has(m.id));
        return [...older, ...prev];
      });
      setPage(nextPage);
      setHasMoreMessages(nextPage < response.totalPages - 1);
    } catch (err) {
      prependAdjustRef.current = null;
      console.error('Error loading more messages:', err);
      setInlineError('Could not load earlier messages');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_PX;
    if (isNearBottomRef.current && unseenCount > 0) {
      setUnseenCount(0);
    }
    if (el.scrollTop <= 8 && hasMoreMessages && !loadingMore) {
      loadMoreMessages();
    }
  };

  // ----- sending -----

  const dispatchMessage = useCallback(async (optimistic: ChatMessage) => {
    if (!groupId || !optimistic.tempId) return;
    const tempId = optimistic.tempId;

    try {
      if (optimistic.pendingFile) {
        const saved = await chatApi.sendMediaMessage(
          groupId, optimistic.pendingFile, optimistic.content || undefined, optimistic.parentMessageId, tempId
        );
        clearAckTimer(tempId);
        setMessages(prev => upsertMessage(prev, { ...saved, tempId }));
        return;
      }

      const request: SendMessageRequest = {
        chatGroupId: groupId,
        content: optimistic.content,
        parentMessageId: optimistic.parentMessageId,
        mentionedUserIds: optimistic.mentionedUserIds,
        tempId
      };

      if (webSocketService.isWebSocketConnected()) {
        armAckTimer(tempId);
        webSocketService.sendMessage(groupId, request);
      } else {
        // Socket is down: REST still works and the server broadcasts to everyone else
        const saved = await chatApi.sendMessage(request);
        setMessages(prev => upsertMessage(prev, { ...saved, tempId }));
      }
    } catch (err: any) {
      const reason = err?.response?.data?.error || err?.message || 'Message could not be sent';
      markFailed(tempId, reason);
    }
  }, [groupId, armAckTimer, clearAckTimer, markFailed]);

  const handleSendMessage = async (outgoing: OutgoingMessage) => {
    if (!groupId || !user || (!outgoing.content.trim() && !outgoing.file)) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const parent = outgoing.parentMessageId
      ? messages.find(m => m.id === outgoing.parentMessageId)
      : undefined;

    const optimistic: ChatMessage = {
      id: tempId,
      tempId,
      chatGroupId: groupId,
      chatGroupName: group?.name || '',
      userId: user.userId,
      userName: user.name,
      userDisplayName: user.name,
      userProfilePicUrl: user.profilePicUrl,
      content: outgoing.content.trim(),
      messageType: outgoing.file
        ? (outgoing.file.type.startsWith('image/') ? 'IMAGE' : outgoing.file.type.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT')
        : 'TEXT',
      messageTypeDisplay: '',
      mediaFilename: outgoing.file?.name,
      mediaSize: outgoing.file?.size,
      mediaType: outgoing.file?.type,
      timestamp: new Date().toISOString(),
      isEdited: false,
      isDeleted: false,
      parentMessageId: outgoing.parentMessageId,
      parentMessage: parent,
      replyCount: 0,
      mentionedUserIds: outgoing.mentionedUserIds,
      canEdit: false,
      canDelete: false,
      status: 'sending',
      pendingFile: outgoing.file
    };

    setMessages(prev => [...prev, optimistic]);
    requestAnimationFrame(() => scrollToBottom());
    webSocketService.sendTypingStatus(groupId, false);

    await dispatchMessage(optimistic);
  };

  const handleRetry = (message: ChatMessage) => {
    if (!message.tempId) return;
    setMessages(prev => prev.map(m =>
      m.tempId === message.tempId ? { ...m, status: 'sending', sendError: undefined, timestamp: new Date().toISOString() } : m
    ));
    dispatchMessage({ ...message, status: 'sending', sendError: undefined });
  };

  const handleDiscardFailed = (message: ChatMessage) => {
    if (!message.tempId) return;
    clearAckTimer(message.tempId);
    setMessages(prev => prev.filter(m => m.tempId !== message.tempId));
  };

  const handleTyping = useCallback(() => {
    if (!groupId) return;

    const now = Date.now();
    lastTypingTime.current = now;
    webSocketService.sendTypingStatus(groupId, true);

    window.setTimeout(() => {
      if (Date.now() - lastTypingTime.current >= 2900) {
        webSocketService.sendTypingStatus(groupId, false);
      }
    }, 3000);
  }, [groupId]);

  // ----- message actions -----

  const describeError = (err: any, fallback: string) =>
    err?.response?.data?.error || fallback;

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      const updated = await chatApi.editMessage(messageId, newContent);
      setMessages(prev => upsertMessage(prev, updated));
    } catch (err) {
      console.error('Error editing message:', err);
      setInlineError(describeError(err, 'Failed to edit message'));
    }
  };

  const handleReact = async (message: ChatMessage, emoji: string) => {
    if (!user) return;
    // Optimistic toggle; the server broadcast will reconcile
    setMessages(prev => prev.map(m => {
      if (m.id !== message.id) return m;
      const reactions = { ...(m.reactions || {}) };
      const users = reactions[emoji] ? [...reactions[emoji]] : [];
      const idx = users.indexOf(user.userId);
      if (idx >= 0) users.splice(idx, 1); else users.push(user.userId);
      if (users.length === 0) delete reactions[emoji]; else reactions[emoji] = users;
      return { ...m, reactions };
    }));
    try {
      const updated = await chatApi.toggleReaction(message.id, emoji);
      setMessages(prev => upsertMessage(prev, updated));
    } catch (err) {
      console.error('Error reacting to message:', err);
      setInlineError(describeError(err, 'Could not add reaction'));
      setMessages(prev => upsertMessage(prev, message));
    }
  };

  const handleToggleGroupNotifications = async () => {
    if (!groupId || !group) return;
    const next = !(group.notificationsEnabled ?? true);
    setGroup({ ...group, notificationsEnabled: next });
    try {
      await chatApi.updateNotificationPreference(groupId, next);
      queryClient.setQueryData<ChatGroup[]>(['chatGroups'], old =>
        old ? old.map(g => (g.id === groupId ? { ...g, notificationsEnabled: next } : g)) : old
      );
    } catch (err) {
      console.error('Error updating notification preference:', err);
      setGroup({ ...group, notificationsEnabled: !next });
      setInlineError(describeError(err, 'Could not update notification settings'));
    }
  };

  const runConfirmedAction = async () => {
    if (!pendingConfirm || !groupId) return;
    setActionBusy(true);
    try {
      if (pendingConfirm.kind === 'delete') {
        await chatApi.deleteMessage(pendingConfirm.messageId);
      } else if (pendingConfirm.kind === 'leave') {
        await chatApi.leaveGroup(groupId);
        queryClient.invalidateQueries({ queryKey: ['chatGroups'] });
        navigate('/chats');
      } else if (pendingConfirm.kind === 'removeMember') {
        await chatApi.removeMember(groupId, pendingConfirm.memberId);
        await loadMembers();
      }
      setPendingConfirm(null);
    } catch (err) {
      console.error('Chat action failed:', err);
      setPendingConfirm(null);
      setInlineError(describeError(err,
        pendingConfirm.kind === 'delete' ? 'Failed to delete message' :
        pendingConfirm.kind === 'leave' ? 'Failed to leave group' :
        'Failed to remove member'));
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmitReport = async (description: string) => {
    if (!reportTarget) return;
    setActionBusy(true);
    try {
      await chatApi.reportMessage(reportTarget.id, 'INAPPROPRIATE', description || undefined);
      setReportTarget(null);
      setInlineError(null);
      setNotice('Thanks. This message has been sent to the moderation team.');
    } catch (err) {
      console.error('Error reporting message:', err);
      setReportTarget(null);
      setInlineError(describeError(err, 'Failed to report message'));
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: string) => {
    if (!groupId) return;
    try {
      await chatApi.updateMemberRole(groupId, memberId, role);
      await loadMembers();
    } catch (err) {
      console.error('Error updating member role:', err);
      setInlineError(describeError(err, 'Failed to update member role'));
    }
  };

  const handleToggleMemberMute = async (memberId: string, muted: boolean) => {
    if (!groupId) return;
    try {
      await chatApi.updateMemberMuteStatus(groupId, memberId, muted);
      await loadMembers();
    } catch (err) {
      console.error('Error updating member mute status:', err);
      setInlineError(describeError(err, 'Failed to update member settings'));
    }
  };

  // ----- render -----

  if (loading) {
    return (
      <div className="chat-room loading">
        <LoadingSpinner type="multi-ring" size="medium" text="Loading chat room..." />
      </div>
    );
  }

  if (loadError || !group) {
    return (
      <div className="chat-room error">
        <div className="error-content">
          <h3>{loadError ? '⚠️ Error' : '📭 Group Not Found'}</h3>
          <p>{loadError || "This chat group doesn't exist or you don't have access to it."}</p>
          <div className="error-actions">
            <button onClick={loadChatRoom} className="retry-button">Try Again</button>
            <button onClick={() => navigate('/chats')} className="back-button">Back to Chats</button>
          </div>
        </div>
      </div>
    );
  }

  const notificationsEnabled = group.notificationsEnabled ?? true;
  const typingNames = Array.from(typingUsers.values());
  const confirmCopy = pendingConfirm?.kind === 'delete'
    ? { title: 'Delete message', message: 'Delete this message for everyone?', confirm: 'Delete', icon: '🗑️' }
    : pendingConfirm?.kind === 'leave'
      ? { title: 'Leave group', message: `Are you sure you want to leave ${group.name}?`, confirm: 'Leave', icon: '🚪' }
      : pendingConfirm?.kind === 'removeMember'
        ? { title: 'Remove member', message: `Remove ${pendingConfirm.displayName} from this chat?`, confirm: 'Remove', icon: '👤' }
        : null;

  return (
    <div className="chat-room">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-room-header-left">
          <button 
            onClick={() => navigate('/chats')} 
            className="chat-back-button"
            aria-label="Back to chats"
          >
            <span aria-hidden="true">←</span>
          </button>
          <div className="group-info">
            <div className="group-icon">
              {display.avatarUrl ? (
                <img src={display.avatarUrl} alt={display.name} />
              ) : (
                <span>💬</span>
              )}
            </div>
            <div className="group-details">
              <h3>{display.name}</h3>
              <p>
                {isDirectMessage
                  ? (members.find(m => m.userId !== user?.userId)?.isOnline ? 'Online' : 'Direct message')
                  : `${members.length} members`}
              </p>
            </div>
          </div>
        </div>
        <div className="chat-room-header-actions">
          <button
            onClick={handleToggleGroupNotifications}
            className={`chat-header-icon-button ${notificationsEnabled ? '' : 'muted'}`}
            aria-label={notificationsEnabled ? 'Mute notifications for this chat' : 'Unmute notifications for this chat'}
            aria-pressed={!notificationsEnabled}
            title={notificationsEnabled ? 'Mute notifications' : 'Unmute notifications'}
          >
            {notificationsEnabled ? '🔔' : '🔕'}
          </button>
          <button
            onClick={() => navigate('/chat/search')}
            className="chat-header-icon-button"
            aria-label="Search chat messages"
            title="Search chat messages"
          >
            🔍
          </button>
          {!isDirectMessage && (
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`chat-header-icon-button ${showMembers ? 'active' : ''}`}
              aria-label="View chat members"
              title="View chat members"
            >
              👥
            </button>
          )}
          {!isDirectMessage && (
            <button onClick={() => setPendingConfirm({ kind: 'leave' })} className="leave-button">
              Leave
            </button>
          )}
        </div>
      </div>

      {!socketConnected && (
        <div className="chat-connection-banner" role="status">
          ⚡ Reconnecting… messages you send will be delivered over a fallback connection.
        </div>
      )}

      {inlineError && (
        <div className="chat-inline-error" role="alert">
          <span>⚠️ {inlineError}</span>
          <button type="button" onClick={() => setInlineError(null)} aria-label="Dismiss error">✕</button>
        </div>
      )}

      {notice && (
        <div className="chat-inline-notice" role="status">
          ✅ {notice}
        </div>
      )}

      <div className="chat-content">
        {/* Messages Area */}
        <div className="messages-section">
          <div 
            className="messages-container" 
            ref={messagesContainerRef}
            onScroll={handleScroll}
          >
            {hasMoreMessages && (
              <div className="load-more">
                <button onClick={loadMoreMessages} className="load-more-button" disabled={loadingMore}>
                  {loadingMore ? 'Loading…' : 'Load Earlier Messages'}
                </button>
              </div>
            )}
            
            {messages.map((message, index) => {
              const previousMessage = messages[index - 1];
              const isCompact =
                previousMessage &&
                previousMessage.messageType !== 'SYSTEM' &&
                message.messageType !== 'SYSTEM' &&
                previousMessage.userId === message.userId;

              return (
                <ChatMessageComponent
                  key={message.tempId || message.id}
                  message={message}
                  currentUser={user}
                  isCompact={Boolean(isCompact)}
                  showAuthor={!isDirectMessage}
                  onEdit={handleEditMessage}
                  onDelete={(messageId) => setPendingConfirm({ kind: 'delete', messageId })}
                  onReply={setReplyingTo}
                  onReport={setReportTarget}
                  onReact={handleReact}
                  onRetry={handleRetry}
                  onDiscardFailed={handleDiscardFailed}
                  onMediaLoad={() => { if (isNearBottomRef.current) scrollToBottom(); }}
                />
              );
            })}
            
            {typingNames.length > 0 && (
              <div className="typing-indicators">
                <div className="typing-animation">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">
                  {typingNames.length <= 2
                    ? typingNames.join(' and ')
                    : `${typingNames.slice(0, 2).join(', ')} and ${typingNames.length - 2} more`}
                  {' '}{typingNames.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
          </div>

          {unseenCount > 0 && (
            <button
              type="button"
              className="new-messages-pill"
              onClick={() => scrollToBottom('smooth')}
            >
              ↓ {unseenCount} new {unseenCount === 1 ? 'message' : 'messages'}
            </button>
          )}

          {/* Message Input */}
          <MessageInput
            onSendMessage={handleSendMessage}
            onTyping={handleTyping}
            placeholder={`Message ${display.name}...`}
            disabled={!group.canPost}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            members={isDirectMessage ? [] : members}
            currentUserId={user?.userId}
          />

          {!group.canPost && (
            <div className="cannot-post-notice">
              You don't have permission to post in this group
            </div>
          )}
        </div>

        {/* Members Panel */}
        {showMembers && (
          <ChatMembers 
            members={members}
            currentUser={user}
            group={group}
            onClose={() => setShowMembers(false)}
            onUpdateRole={handleUpdateMemberRole}
            onToggleMute={handleToggleMemberMute}
            onRemoveMember={(memberId, displayName) => setPendingConfirm({ kind: 'removeMember', memberId, displayName })}
          />
        )}
      </div>

      {confirmCopy && (
        <ConfirmationModal
          isOpen={Boolean(pendingConfirm)}
          onClose={() => setPendingConfirm(null)}
          onConfirm={runConfirmedAction}
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmText={confirmCopy.confirm}
          confirmButtonVariant="danger"
          isLoading={actionBusy}
          icon={confirmCopy.icon}
        />
      )}

      <ChatPromptModal
        isOpen={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
        onSubmit={handleSubmitReport}
        title="Report message"
        message="Tell the moderation team what is wrong with this message."
        placeholder="This message needs moderator review."
        confirmText="Send report"
        icon="🚩"
        isLoading={actionBusy}
      />
    </div>
  );
};

export default ChatRoom;
