import React, { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../contexts/AuthContext';
import './BottomNav.css';

interface BottomNavProps {
  onPostClick?: () => void;
  onCameraClick?: () => void;
  showComposer?: boolean; // Add this prop to know if composer is open
}

const BottomNav: React.FC<BottomNavProps> = ({ onPostClick, onCameraClick, showComposer = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  
  // 🔄 Double-tap detection for Home button refresh
  const lastTapTimeRef = useRef<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const DOUBLE_TAP_THRESHOLD = 300; // milliseconds

  if (!isMobile) {
    return null;
  }

  // 🔒 Hide bottom nav on login/register/auth pages or when not authenticated
  const isAuthPage = ['/login', '/register', '/auth/callback', '/auth/error'].includes(location.pathname) 
                     || location.pathname.startsWith('/invite/');
  if (!isAuthenticated || isAuthPage) {
    return null;
  }

  // Hide bottom nav when in an active chat (e.g., /chats/:chatId)
  const isInActiveChat = /^\/chats\/[^/]+$/.test(location.pathname);
  if (isInActiveChat) {
    return null;
  }

  const isActive = (path: string | null) => {
    if (path === null) return false; // Post button doesn't have a path
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // Helper function to navigate to Home (without forcing refresh)
  const goToHome = () => {
    navigate('/dashboard', { 
      // Removed reset: true - let PostFeed use cached data if available
      replace: true 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 🔄 Refresh handler - invalidates React Query cache AND triggers feed refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    console.log('🔄 Double-tap detected! Refreshing feed...');
    
    // Scroll to top first
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Invalidate React Query cache for dashboard data
    await queryClient.invalidateQueries();
    
    // 🎯 Dispatch custom event for PostFeed refresh (PostFeed doesn't use React Query)
    // Dashboard listens for this event and increments feedRefreshKey
    window.dispatchEvent(new CustomEvent('feedRefresh'));
    
    // Brief visual feedback
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // 🏠 Home button tap handler with double-tap detection
  const handleHomeTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    
    if (isActive('/dashboard') && timeSinceLastTap < DOUBLE_TAP_THRESHOLD) {
      // 🔄 DOUBLE TAP detected while on home - REFRESH!
      handleRefresh();
      lastTapTimeRef.current = 0; // Reset to prevent triple-tap issues
    } else if (isActive('/dashboard')) {
      // Single tap while on home - just scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      lastTapTimeRef.current = now;
    } else {
      // Not on home - navigate to home
      goToHome();
      lastTapTimeRef.current = now;
    }
  };

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: isRefreshing ? '🔄' : '🏠',
      path: '/dashboard',
      onClick: handleHomeTap
    },
    {
      id: 'quick-actions',
      label: 'Actions',
      icon: '⚡',
      path: '/quick-actions',
      onClick: () => {
        // 🎯 Second tap: If already on quick-actions, go to Home
        if (isActive('/quick-actions')) {
          goToHome();
        } else {
          navigate('/quick-actions');
        }
      }
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: '💬',
      path: '/chats',
      onClick: () => {
        // 🎯 Second tap: If already on messages, go to Home
        if (isActive('/chats')) {
          goToHome();
        } else {
          navigate('/chats');
        }
      }
    },
    {
      id: 'camera',
      label: 'Camera',
      icon: '📷',
      path: null,
      onClick: () => {
        onCameraClick?.();
      }
    },
    {
      id: 'post',
      label: 'Post',
      icon: '✍️',
      path: null,
      onClick: () => {
        // 🎯 Second tap: If composer is already open, close it and go to Home
        if (showComposer) {
          onPostClick?.(); // Close composer first
          goToHome();
        } else {
          // Open composer
          onPostClick?.();
        }
      }
    }
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`bottom-nav-tab ${
              tab.id === 'post' ? 'post-elevated' : ''
            } ${
              tab.path && isActive(tab.path) ? 'active' : ''
            } ${
              tab.id === 'post' && showComposer ? 'active' : ''
            }`}
            onClick={tab.onClick}
            aria-label={tab.label}
          >
            <span className={`bottom-nav-icon ${tab.id === 'home' && isRefreshing ? 'refreshing' : ''}`}>
              {tab.icon}
            </span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="bottom-nav-safe-area"></div>
    </nav>
  );
};

export default BottomNav;
