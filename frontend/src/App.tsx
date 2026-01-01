import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import statusBarService from './services/statusBarService';
import { applyStoredSettings } from './services/settingsApi';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { GroupProvider } from './contexts/GroupContext';
import { FeedFilterProvider } from './contexts/FeedFilterContext';
import { ActiveContextProvider } from './contexts/ActiveContextContext';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './components/Dashboard';
import AuthCallback from './components/AuthCallback';
import AuthError from './components/AuthError';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import PublicPostPreview from './components/PublicPostPreview';
import PostDetailPage from './components/PostDetailPage';
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
import OrganizationBrowser from './components/OrganizationBrowser';
import GroupBrowser from './components/GroupBrowser';
import GroupPage from './components/GroupPage';
import WebSocketStatusIndicator from './components/WebSocketStatusIndicator';
import QuickActionsPage from './components/QuickActionsPage';
import BottomNav from './components/BottomNav';
import PostComposer from './components/PostComposer';
import CameraCapture from './components/CameraCapture';
import './App.css';
import './components/Dashboard.css'; // Import for composer modal styles
import { GlobalSearchProvider } from './components/global-search/GlobalSearchProvider';
import { UploadQueueProvider } from './contexts/UploadQueueContext';
import UploadProgressIndicator from './components/UploadProgressIndicator';
import UpdateNotification from './components/UpdateNotification';
import FirebaseInitializer from './components/FirebaseInitializer';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// 🚀 React Query Configuration - Smart Caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 min
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache for 10 min (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnMount: false, // Don't refetch on mount if data is fresh
      retry: 1, // Only retry once on failure
    },
  },
});

const App: React.FC = () => {
  const [showComposer, setShowComposer] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedMediaFile, setCapturedMediaFile] = useState<File | undefined>(undefined);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Apply stored theme and font settings immediately (no flash of wrong theme)
    applyStoredSettings();

    // Initialize native status bar styling
    statusBarService.initialize();

    // Set up service worker update handler
    serviceWorkerRegistration.setUpdateHandler((registration: ServiceWorkerRegistration) => {
      setUpdateAvailable(true);
      setWaitingWorker(registration);
    });
  }, []);

  const handleCameraCapture = (file: File) => {
    console.log('📸 App.tsx: Camera captured file:', file.name, file.size);
    // Store the captured file and open the composer
    setCapturedMediaFile(file);
    setShowCamera(false);
    setShowComposer(true);
  };
  
  const handleComposerClose = () => {
    setShowComposer(false);
    // Clear the captured file when composer closes
    setCapturedMediaFile(undefined);
  };

  const handleUpdate = () => {
    if (waitingWorker && waitingWorker.waiting) {
      // Tell the service worker to skip waiting and activate
      waitingWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Listen for the service worker to take control
      waitingWorker.addEventListener('controllerchange', () => {
        // Reload the page to get the new version
        window.location.reload();
      });
      
      // Fallback: reload after a short delay if controllerchange doesn't fire
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      // Fallback: just reload if no waiting worker
      window.location.reload();
    }
  };

  const handleDismissUpdate = () => {
    setUpdateAvailable(false);
    setWaitingWorker(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <OrganizationProvider>
            <GroupProvider>
              <ActiveContextProvider>
                <FeedFilterProvider>
                  <UploadQueueProvider>
                  <Router>
                  <GlobalSearchProvider>
                  {/* 🔥 Firebase Initializer - auto-initializes FCM when user is authenticated */}
                  <FirebaseInitializer />
                  {/* 🚀 Global Upload Progress Indicator - shows at top during background uploads */}
                  <UploadProgressIndicator />
                  {/* 🔄 Update Notification - shows when new version is available */}
                  {updateAvailable && (
                    <UpdateNotification
                      onUpdate={handleUpdate}
                      onDismiss={handleDismissUpdate}
                      autoRefreshDelay={10} // Auto-refresh after 10 seconds
                    />
                  )}
                  <div className="App">
                    {/* WebSocket status is now shown on the profile picture in Dashboard */}
                    {/* <WebSocketStatusIndicator /> */}
                    <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<AuthError />} />
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

            {/* Authenticated post detail page (for viewing and commenting) */}
            <Route
              path="/app/posts/:postId"
              element={
                <ProtectedRoute>
                  <PostDetailPage />
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
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/:tab"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
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

            {/* Organization routes */}
            <Route 
              path="/organizations" 
              element={
                <ProtectedRoute>
                  <OrganizationBrowser />
                </ProtectedRoute>
              } 
            />

            {/* Group routes */}
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <GroupBrowser />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute>
                  <GroupPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/quick-actions"
              element={
                <ProtectedRoute>
                  <QuickActionsPage />
                </ProtectedRoute>
              }
            />

                  {/* Default redirect */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>

                  {/* Global Post Composer Modal */}
                  {showComposer && (
                    <div className="composer-modal-overlay" onClick={handleComposerClose}>
                      <div className="composer-modal-content" onClick={(e) => e.stopPropagation()}>
                        <PostComposer
                          onCancel={handleComposerClose}
                          onPostCreated={handleComposerClose}
                          placeholder="Share what's happening in your community..."
                          initialMediaFile={capturedMediaFile}
                        />
                      </div>
                    </div>
                  )}

                  {/* Global Camera Capture Modal */}
                  {showCamera && (
                    <CameraCapture
                      onCapture={handleCameraCapture}
                      onClose={() => setShowCamera(false)}
                    />
                  )}

                  {/* Global Bottom Navigation - Mobile Only */}
                  <BottomNav
                    onPostClick={() => setShowComposer(prev => !prev)}
                    onCameraClick={() => setShowCamera(true)}
                    showComposer={showComposer}
                  />
                  </div>
                </GlobalSearchProvider>
              </Router>
              </UploadQueueProvider>
              </FeedFilterProvider>
            </ActiveContextProvider>
          </GroupProvider>
        </OrganizationProvider>
      </WebSocketProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
