import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { GroupProvider } from './contexts/GroupContext';
import { FeedFilterProvider } from './contexts/FeedFilterContext';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import AuthCallback from './components/AuthCallback';
import ProtectedRoute from './components/ProtectedRoute';
import PublicPostPreview from './components/PublicPostPreview';
import ProfileView from './components/ProfileView';
import ProfileEdit from './components/ProfileEdit';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import ChatSearch from './components/ChatSearch';
import PrayerRequestsPage from './components/PrayerRequestsPage';
import PrayerRequestDetail from './components/PrayerRequestDetail';
import AnnouncementPage from './components/AnnouncementPage';
import CalendarPage from './components/CalendarPage';
import EventDetailsPage from './components/EventDetailsPage';
import ResourcePage from './components/ResourcePage';
import MyRSVPsPage from './components/MyRSVPsPage';
import DonationPage from './components/DonationPage';
import DonationAnalytics from './components/DonationAnalytics';
import AdminDashboard from './components/AdminDashboard';
import SettingsPage from './components/SettingsPage';
import WorshipRoomList from './components/WorshipRoomList';
import WorshipRoom from './components/WorshipRoom';
import './App.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <GroupProvider>
          <FeedFilterProvider>
            <Router>
              <div className="App">
                <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<div>Authentication Error</div>} />
            <Route path="/posts/:postId" element={<PublicPostPreview />} />
            
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
            
            {/* Calendar/Events routes */}
            <Route 
              path="/calendar" 
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/events" 
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/events/:eventId" 
              element={
                <ProtectedRoute>
                  <EventDetailsPage />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/my-rsvps" 
              element={
                <ProtectedRoute>
                  <MyRSVPsPage />
                </ProtectedRoute>
              } 
            />

            {/* Resources/Library routes */}
            <Route 
              path="/resources" 
              element={
                <ProtectedRoute>
                  <ResourcePage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/resources/create" 
              element={
                <ProtectedRoute>
                  <ResourcePage />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/resources/:resourceId" 
              element={
                <ProtectedRoute>
                  <ResourcePage />
                </ProtectedRoute>
              } 
            />

            <Route
              path="/library"
              element={
                <ProtectedRoute>
                  <ResourcePage />
                </ProtectedRoute>
              }
            />

            {/* Donation routes */}
            <Route
              path="/donations"
              element={
                <ProtectedRoute>
                  <DonationPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/giving"
              element={
                <ProtectedRoute>
                  <DonationPage />
                </ProtectedRoute>
              }
            />

            {/* Admin donation analytics */}
            <Route
              path="/admin/donations/analytics"
              element={
                <ProtectedRoute>
                  <DonationAnalytics />
                </ProtectedRoute>
              }
            />

            {/* Admin Dashboard routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/:tab"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Settings routes */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings/:tab"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Worship routes */}
            <Route
              path="/worship"
              element={
                <ProtectedRoute>
                  <WorshipRoomList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/worship/:roomId"
              element={
                <ProtectedRoute>
                  <WorshipRoom />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </Router>
          </FeedFilterProvider>
        </GroupProvider>
      </OrganizationProvider>
    </AuthProvider>
  );
};

export default App;
