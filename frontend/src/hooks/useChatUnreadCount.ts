import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import chatApi from '../services/chatApi';

const CHAT_UNREAD_REFRESH_EVENT = 'chatUnreadCountRefresh';
const FALLBACK_POLL_MS = 2 * 60 * 1000;

export const notifyChatUnreadCountRefresh = () => {
  window.dispatchEvent(new Event(CHAT_UNREAD_REFRESH_EVENT));
};

export const useChatUnreadCount = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      // Single aggregate query instead of hydrating every chat group for one number.
      setUnreadCount(await chatApi.getUnreadCount());
    } catch (error) {
      console.error('Failed to refresh chat unread count:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    };

    window.addEventListener(CHAT_UNREAD_REFRESH_EVENT, refreshUnreadCount);
    window.addEventListener('focus', refreshUnreadCount);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Real-time updates arrive via /user/queue/events (useEventNotifications calls
    // notifyChatUnreadCountRefresh on chat_message_received). This slow poll is only a
    // safety net for a dropped socket.
    const intervalId = window.setInterval(refreshUnreadCount, FALLBACK_POLL_MS);

    return () => {
      window.removeEventListener(CHAT_UNREAD_REFRESH_EVENT, refreshUnreadCount);
      window.removeEventListener('focus', refreshUnreadCount);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, refreshUnreadCount]);

  return unreadCount;
};
