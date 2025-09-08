import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🏛️ Church App Dashboard</h1>
          <div className="user-info">
            <div className="user-details">
              {user?.profilePicUrl && (
                <img 
                  src={user.profilePicUrl} 
                  alt={user.name}
                  className="profile-pic"
                />
              )}
              <div>
                <p className="user-name">👋 Welcome, {user?.name}!</p>
                <p className="user-role">Role: {user?.role}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-button">
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>📊 Quick Stats</h3>
            <p>Welcome to your church community platform!</p>
            <ul>
              <li>✅ Authentication: Complete</li>
              <li>🔄 User Profile: {user?.name}</li>
              <li>📧 Email: {user?.email}</li>
              <li>👥 Role: {user?.role}</li>
            </ul>
          </div>

          <div className="dashboard-card">
            <h3>🚧 Coming Soon</h3>
            <p>More sections will be implemented:</p>
            <ul>
              <li>👤 User Profiles</li>
              <li>💬 Group Chats</li>
              <li>🙏 Prayer Requests</li>
              <li>📢 Announcements</li>
              <li>📅 Calendar/Events</li>
              <li>📚 Resources Library</li>
              <li>💝 Giving/Donations</li>
              <li>⚙️ Admin Tools</li>
              <li>🔧 Settings</li>
            </ul>
          </div>

          <div className="dashboard-card">
            <h3>🎯 Current Status</h3>
            <p>Section 1: Signup/Login - ✅ Complete!</p>
            <p>Ready to proceed with Section 2: User Profiles</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;