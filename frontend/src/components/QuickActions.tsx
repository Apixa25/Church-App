import React from 'react';
import { useNavigate } from 'react-router-dom';
import { QuickAction } from '../services/dashboardApi';

interface QuickActionsProps {
  actions: QuickAction[];
  isLoading?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({ actions, isLoading }) => {
  const navigate = useNavigate();

  const getActionIcon = (iconType: string) => {
    const iconMap: Record<string, string> = {
      user: '👤',
      edit: '✏️',
      prayer: '🙏',
      chat: '💬',
      megaphone: '📢',
      calendar: '📅',
      shield: '🛡️',
      flag: '🚩',
      book: '📚',
      heart: '💝',
      settings: '⚙️',
      rsvp: '🎫',
      resource: '📚',
      upload: '📁',
      music: '🎵'
    };
    return iconMap[iconType] || '📝';
  };

  const handleActionClick = (action: QuickAction) => {
    if (action.buttonText === 'Coming Soon') {
      // Show coming soon message
      alert(`${action.title} is coming soon! 🚧`);
      return;
    }
    
    if (action.actionUrl.startsWith('http')) {
      window.open(action.actionUrl, '_blank');
    } else {
      navigate(action.actionUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="quick-actions loading">
        <h3>⚡ Quick Actions</h3>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading actions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quick-actions">
      <h3>⚡ Quick Actions</h3>
      <div className="actions-grid">
        {actions.map((action) => (
          <div key={action.id} className="action-card">
            <div className="action-icon">
              {getActionIcon(action.iconType)}
            </div>
            <div className="action-content">
              <h4>{action.title}</h4>
              <p>{action.description}</p>
              <button 
                className={`action-button ${action.buttonText === 'Coming Soon' ? 'coming-soon' : 'primary'}`}
                onClick={() => handleActionClick(action)}
              >
                {action.buttonText}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;