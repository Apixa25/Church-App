import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
import './BottomNav.css';

interface BottomNavProps {
  onPostClick?: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onPostClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!isMobile) {
    return null;
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: '🏠',
      path: '/dashboard',
      onClick: () => {
        // Navigate to dashboard with reset flag to restore initial state
        navigate('/dashboard', { 
          state: { reset: true },
          replace: true 
        });
        // Scroll to top immediately
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    {
      id: 'quick-actions',
      label: 'Actions',
      icon: '⚡',
      path: '/quick-actions',
      onClick: () => navigate('/quick-actions')
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: '💬',
      path: '/chats',
      onClick: () => navigate('/chats')
    },
    {
      id: 'post',
      label: 'Post',
      icon: '✍️',
      path: null,
      onClick: () => onPostClick?.()
    }
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`bottom-nav-tab ${tab.path && isActive(tab.path) ? 'active' : ''}`}
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
