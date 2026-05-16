import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import statusBarService from './services/statusBarService';
import { applyStoredSettings } from './services/settingsApi';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { GroupProvider } from './contexts/GroupContext';
import { FeedFilterProvider } from './contexts/FeedFilterContext';
import { ActiveContextProvider } from './contexts/ActiveContextContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import LoadingSpinner from './components/LoadingSpinner';
import BottomNav from './components/BottomNav';
import './App.css';
import './components/Dashboard.css';
import { GlobalSearchProvider } from './components/global-search/GlobalSearchProvider';
import { UploadQueueProvider } from './contexts/UploadQueueContext';
import UploadProgressIndicator from './components/UploadProgressIndicator';
import UpdateNotification from './components/UpdateNotification';
import FirebaseInitializer from './components/FirebaseInitializer';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { Capacitor } from '@capacitor/core';
import deepLinkingService from './services/deepLinkingService';

// ⚡ LAZY-LOADED ROUTE COMPONENTS
// Each screen is loaded on-demand when the user navigates to it,
// dramatically reducing the initial bundle size.
const LoginForm = lazy(() => import('./components/LoginForm'));
const RegisterForm = lazy(() => import('./components/RegisterForm'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const AuthCallback = lazy(() => import('./components/AuthCallback'));
const AuthError = lazy(() => import('./components/AuthError'));
const PublicPostPreview = lazy(() => import('./components/PublicPostPreview'));
const PublicResourcePreview = lazy(() => import('./components/PublicResourcePreview'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const PostDetailPage = lazy(() => import('./components/PostDetailPage'));
const ProfileView = lazy(() => import('./components/ProfileView'));
const ProfileEdit = lazy(() => import('./components/ProfileEdit'));
const ChatList = lazy(() => import('./components/ChatList'));
const ChatRoom = lazy(() => import('./components/ChatRoom'));
const ChatSearch = lazy(() => import('./components/ChatSearch'));
const PrayerRequestsPage = lazy(() => import('./components/PrayerRequestsPage'));
const PrayerRequestDetail = lazy(() => import('./components/PrayerRequestDetail'));
const AnnouncementPage = lazy(() => import('./components/AnnouncementPage'));
const CalendarPage = lazy(() => import('./components/CalendarPage'));
const EventDetailsPage = lazy(() => import('./components/EventDetailsPage'));
const ResourcePage = lazy(() => import('./components/ResourcePage'));
const MyRSVPsPage = lazy(() => import('./components/MyRSVPsPage'));
const DonationPage = lazy(() => import('./components/DonationPage'));
const DonationAnalytics = lazy(() => import('./components/DonationAnalytics'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const WorshipRoomList = lazy(() => import('./components/WorshipRoomList'));
const WorshipRoom = lazy(() => import('./components/WorshipRoom'));
const OrganizationBrowser = lazy(() => import('./components/OrganizationBrowser'));
const GroupBrowser = lazy(() => import('./components/GroupBrowser'));
const GroupPage = lazy(() => import('./components/GroupPage'));
const GroupSettings = lazy(() => import('./components/GroupSettings'));
const InviteLinkJoinPage = lazy(() => import('./components/InviteLinkJoinPage'));
const QuickActionsPage = lazy(() => import('./components/QuickActionsPage'));
const MarketplacePage = lazy(() => import('./components/MarketplacePage'));
const PostComposer = lazy(() => import('./components/PostComposer'));
const CameraCapture = lazy(() => import('./components/CameraCapture'));

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

// 🔧 Scroll Safety Component - Ensures body overflow is never stuck
// This prevents scrolling issues from modals that don't clean up properly
const ScrollSafety: React.FC = () => {
  const location = useLocation();

  // Reset body scroll on mount (catches any stuck state from previous session)
  useEffect(() => {
    // Reset any stuck body styles that might prevent scrolling
    // This runs immediately on mount to catch any state left from a previous session
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  }, []);

  // Reset body scroll on route change (catches modals that didn't clean up)
  useEffect(() => {
    // Small delay to ensure any modal cleanup has run first
    const timeoutId = setTimeout(() => {
      const bodyOverflowStyle = document.body.style.overflow;
      
      // Check if body overflow is stuck as 'hidden'
      // Only reset if it's explicitly set and no modals are open
      if (bodyOverflowStyle === 'hidden') {
        // Check for visible modals - query common modal selectors
        const visibleModals = document.querySelectorAll(
          '[class*="modal-overlay"]:not([style*="display: none"]), ' +
          '[class*="modal-overlay"]:not([style*="display:none"]), ' +
          '.composer-modal-overlay:not([style*="display: none"]), ' +
          '.composer-modal-overlay:not([style*="display:none"])'
        );
        
        // If no visible modals, body overflow is probably stuck - reset it
        if (visibleModals.length === 0) {
          console.log('🔧 ScrollSafety: Detected stuck body overflow, resetting...');
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
        }
      }
    }, 300); // Increased delay to give modals more time to set state

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  return null;
};

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

    // 🔧 SAFETY FIX: Ensure body scroll is never stuck from a previous session
    // This resets any stuck overflow: hidden that might have been left by a modal
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';

    // Set up service worker update handler
    serviceWorkerRegistration.setUpdateHandler((registration: ServiceWorkerRegistration) => {
      setUpdateAvailable(true);
      setWaitingWorker(registration);
    });

    // Initialize deep linking for native platforms
    if (Capacitor.isNativePlatform()) {
      deepLinkingService.initialize();
      deepLinkingService.addListener((route) => {
        let path = '/dashboard';
        switch (route.type) {
          case 'organization':
            path = route.action === 'join' ? `/organizations/${route.id}/join` : `/organizations/${route.id}`;
            break;
          case 'group':
            path = route.action === 'join' ? `/groups/${route.id}/join` : `/groups/${route.id}`;
            break;
          case 'user':
            path = `/profile/${route.id}`;
            break;
          case 'post':
            path = `/posts/${route.id}`;
            break;
          case 'event':
            path = `/events/${route.id}`;
            break;
          case 'prayer':
            path = `/prayer/${route.id}`;
            break;
        }
        window.location.href = path;
      });
    }
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
                  <ScrollSafety />
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
                    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><LoadingSpinner type="multi-ring" size="medium" text="Loading..." /></div>}>
                    <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<AuthError />} />
            <Route path="/posts/:postId" element={<PublicPostPreview />} />
            <Route path="/public/posts/:postId/preview" element={<PublicPostPreview />} />
            <Route path="/public/resources/:resourceId/preview" element={<PublicResourcePreview />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/invite/:inviteCode" element={<InviteLinkJoinPage />} />

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
              path="/groups/:groupId/settings"
              element={
                <ProtectedRoute>
                  <GroupSettings />
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

            <Route
              path="/marketplace"
              element={
                <ProtectedRoute>
                  <MarketplacePage />
                </ProtectedRoute>
              }
            />

                  {/* Default redirect */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                  </Suspense>

                  {/* Global Post Composer Modal */}
                  {showComposer && (
                    <div className="composer-modal-overlay" onClick={handleComposerClose}>
                      <div className="composer-modal-content" onClick={(e) => e.stopPropagation()}>
                        <Suspense fallback={<LoadingSpinner type="multi-ring" size="medium" text="Loading composer..." />}>
                          <PostComposer
                            onCancel={handleComposerClose}
                            onPostCreated={handleComposerClose}
                            placeholder="Share what's happening in your community..."
                            initialMediaFile={capturedMediaFile}
                          />
                        </Suspense>
                      </div>
                    </div>
                  )}

                  {/* Global Camera Capture Modal */}
                  {showCamera && (
                    <Suspense fallback={<LoadingSpinner type="multi-ring" size="medium" text="Loading camera..." />}>
                      <CameraCapture
                        onCapture={handleCameraCapture}
                        onClose={() => setShowCamera(false)}
                      />
                    </Suspense>
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
