import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import chatApi from '../services/chatApi';

const CHAT_UNREAD_REFRESH_EVENT = 'chatUnreadCountRefresh';

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
      const groups = await chatApi.getGroups();
      const totalUnread = groups.reduce((total, group) => total + (group.unreadCount || 0), 0);
      setUnreadCount(totalUnread);
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

    const intervalId = window.setInterval(refreshUnreadCount, 30000);

    return () => {
      window.removeEventListener(CHAT_UNREAD_REFRESH_EVENT, refreshUnreadCount);
      window.removeEventListener('focus', refreshUnreadCount);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, refreshUnreadCount]);

  return unreadCount;
};
