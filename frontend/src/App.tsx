import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import ProfileView from './components/ProfileView';
import ProfileEdit from './components/ProfileEdit';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import ChatSearch from './components/ChatSearch';
import PrayerRequestsPage from './components/PrayerRequestsPage';
import PrayerRequestDetail from './components/PrayerRequestDetail';
import AnnouncementPage from './components/AnnouncementPage';
import './App.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<div>Authentication Error</div>} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <ProfileView />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/profile/edit" 
              element={
                <ProtectedRoute>
                  <ProfileEdit />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/profile/:userId" 
              element={
                <ProtectedRoute>
                  <ProfileView />
                </ProtectedRoute>
              } 
            />
            
            {/* Chat routes */}
            <Route 
              path="/chats" 
              element={
                <ProtectedRoute>
                  <ChatList />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/chats/:groupId" 
              element={
                <ProtectedRoute>
                  <ChatRoom />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/chat/search" 
              element={
                <ProtectedRoute>
                  <ChatSearch />
                </ProtectedRoute>
              } 
            />
            
            {/* Prayer Request routes */}
            <Route 
              path="/prayers" 
              element={
                <ProtectedRoute>
                  <PrayerRequestsPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/prayers/:prayerId" 
              element={
                <ProtectedRoute>
                  <PrayerRequestDetail />
                </ProtectedRoute>
              } 
            />
            
            {/* Announcement routes */}
            <Route 
              path="/announcements" 
              element={
                <ProtectedRoute>
                  <AnnouncementPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/announcements/create" 
              element={
                <ProtectedRoute>
                  <AnnouncementPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/announcements/:announcementId" 
              element={
                <ProtectedRoute>
                  <AnnouncementPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
