import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
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

  if (!isMobile) {
    return null;
  }

  const isActive = (path: string | null) => {
    if (path === null) return false; // Post button doesn't have a path
    return location.pathname === path || location.pathname.startsWith(path);
  };

  // Helper function to navigate to Home
  const goToHome = () => {
    navigate('/dashboard', { 
      state: { reset: true },
      replace: true 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: '🏠',
      path: '/dashboard',
      onClick: () => {
        // If already on home, just scroll to top
        if (isActive('/dashboard')) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          goToHome();
        }
      }
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
            className={`bottom-nav-tab ${tab.path && isActive(tab.path) ? 'active' : ''} ${tab.id === 'post' && showComposer ? 'active' : ''}`}
            onClick={tab.onClick}
            aria-label={tab.label}
          >
            <span className="bottom-nav-icon">{tab.icon}</span>
            <span className="bottom-nav-label">{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="bottom-nav-safe-area"></div>
    </nav>
  );
};

export default BottomNav;
