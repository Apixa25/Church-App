import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authAPI } from '../services/api';
import webSocketService from '../services/websocketService';
import { tokenService } from '../services/tokenService';

export interface User {
  userId: string;
  id: string; // Alias for userId for compatibility
  email: string;
  name: string;
  role: string;
  profilePicUrl?: string;
  bannerImageUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  interests?: string[];
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  geocodeStatus?: string;
  birthday?: string;
  spiritualGift?: string;
  equippingGifts?: string;
  createdAt?: string;
  // Social properties
  username?: string;
  isVerified?: boolean;
  followerCount?: number;
  followingCount?: number;
  postsCount?: number;
  heartsCount?: number;
  isLikedByCurrentUser?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  updateUser?: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const updateUser = (userData: Partial<User>) => {
    setUser(prevUser => {
      if (prevUser) {
        // Preserve profilePicUrl and bannerImageUrl if not explicitly provided or if empty
        // This prevents clearing Google OAuth profile pictures when updating other fields
        const updatedUser = { ...prevUser, ...userData };
        
        // Only update profilePicUrl if it's explicitly provided and not empty
        if (userData.profilePicUrl === null || userData.profilePicUrl === undefined || 
            (typeof userData.profilePicUrl === 'string' && userData.profilePicUrl.trim() === '')) {
          // Preserve existing profilePicUrl
          updatedUser.profilePicUrl = prevUser.profilePicUrl;
        }
        
        // Only update bannerImageUrl if it's explicitly provided and not empty
        if (userData.bannerImageUrl === null || userData.bannerImageUrl === undefined || 
            (typeof userData.bannerImageUrl === 'string' && userData.bannerImageUrl.trim() === '')) {
          // Preserve existing bannerImageUrl
          updatedUser.bannerImageUrl = prevUser.bannerImageUrl;
        }
        
        // Update localStorage with the new user data
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      }
      return null;
    });
  };

  const isAuthenticated = Boolean(user && token);

  // 🆕 Logout function - defined early so it can be used in validation
  const logout = useCallback((): void => {
    setUser(null);
    setToken(null);
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Clear token refresh timer
    tokenService.clearRefreshTimer();

    // Update WebSocket service to disconnect
    webSocketService.updateToken(null);
    
    // Redirect to login if not already there
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
  }, []);

  // Function to fetch fresh user data from backend
  const fetchFreshUserData = useCallback(async (authToken: string) => {
    try {
      // Import profileAPI dynamically to avoid circular dependency
      const { profileAPI } = await import('../services/api');
      const response = await profileAPI.getMyProfile();
      const freshUserData = response.data;
      
      // Update user state with fresh data
      setUser(prevUser => {
        if (prevUser) {
          const updatedUser = { ...prevUser, ...freshUserData };
          
          // 🖼️ FIX: Always use backend profilePicUrl if it exists (Google OAuth images come from backend)
          // Only preserve prevUser.profilePicUrl if backend returns null/empty AND prevUser has a valid URL
          if (freshUserData.profilePicUrl && 
              typeof freshUserData.profilePicUrl === 'string' && 
              freshUserData.profilePicUrl.trim() !== '') {
            // Backend has a valid profilePicUrl - use it (this is the Google OAuth image)
            updatedUser.profilePicUrl = freshUserData.profilePicUrl;
          } else if (prevUser.profilePicUrl && 
                     typeof prevUser.profilePicUrl === 'string' && 
                     prevUser.profilePicUrl.trim() !== '') {
            // Backend doesn't have one, but prevUser does - preserve it
            updatedUser.profilePicUrl = prevUser.profilePicUrl;
          }
          
          // 🖼️ FIX: Always use backend bannerImageUrl if it exists (same logic as profilePicUrl)
          if (freshUserData.bannerImageUrl && 
              typeof freshUserData.bannerImageUrl === 'string' && 
              freshUserData.bannerImageUrl.trim() !== '') {
            // Backend has a valid bannerImageUrl - use it
            updatedUser.bannerImageUrl = freshUserData.bannerImageUrl;
          } else if (prevUser.bannerImageUrl && 
                     typeof prevUser.bannerImageUrl === 'string' && 
                     prevUser.bannerImageUrl.trim() !== '') {
            // Backend doesn't have one, but prevUser does - preserve it
            updatedUser.bannerImageUrl = prevUser.bannerImageUrl;
          }
          
          // Update localStorage with fresh user data
          localStorage.setItem('user', JSON.stringify(updatedUser));
          return updatedUser;
        }
        return null;
      });
    } catch (error: any) {
      console.error('Failed to fetch fresh user data:', error);
      
      // If backend returns 401, session is invalid - logout immediately
      if (error.response?.status === 401) {
        logout();
      }
      // For other errors (network issues, etc.), user can continue with cached data
    }
  }, [logout]);

  // 🆕 CORE FIX: Validate session on app startup BEFORE showing authenticated content
  // This ensures users don't see content with an expired token
  useEffect(() => {
    const validateAndRestoreSession = async () => {
      const savedToken = localStorage.getItem('authToken');
      const savedRefreshToken = localStorage.getItem('refreshToken');
      const savedUser = localStorage.getItem('user');

      // No saved session - user needs to login
      if (!savedToken || !savedUser) {
        setLoading(false);
        return;
      }

      try {
        // Check if access token is expired
        const isAccessTokenExpired = tokenService.isTokenExpired(savedToken);
        
        if (isAccessTokenExpired) {
          // Check if refresh token exists and is not expired
          if (savedRefreshToken && !tokenService.isTokenExpired(savedRefreshToken)) {
            // Try to refresh the token BEFORE restoring session
            const refreshed = await tokenService.refreshTokenSilently();

            if (refreshed?.token) {
              // Refresh successful - restore session with new token
              setToken(refreshed.token);
              const userData = JSON.parse(savedUser);
              setUser(userData);
              webSocketService.updateToken(refreshed.token);
              tokenService.scheduleTokenRefresh();

              // Fetch fresh user data in background
              fetchFreshUserData(refreshed.token);
            } else {
              // Refresh returned null (shouldn't happen but handle it)
              throw new Error('Token refresh returned empty response');
            }
          } else {
            // Refresh token is also expired or missing
            throw new Error('Refresh token expired');
          }
        } else {
          // Access token is still valid - restore session immediately
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
          webSocketService.updateToken(savedToken);
          tokenService.scheduleTokenRefresh();

          // Fetch fresh user data to verify with backend
          fetchFreshUserData(savedToken);
        }
      } catch (error) {
        // Clear invalid session data
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
        setToken(null);
        // Note: We don't redirect here - the ProtectedRoute will handle redirect to login
      } finally {
        setLoading(false);
      }
    };

    validateAndRestoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🆕 Handle app coming back to foreground (PWA support)
  // This catches cases where the token expires while the app is in the background
  useEffect(() => {
    const handleVisibilityChange = async () => {
      // Only check when app becomes visible AND user appears to be logged in
      if (document.visibilityState === 'visible' && token && user) {
        // Check if access token expired while app was backgrounded
        if (tokenService.isTokenExpired(token)) {
          try {
            const refreshed = await tokenService.refreshTokenSilently();
            if (refreshed?.token) {
              setToken(refreshed.token);
              webSocketService.updateToken(refreshed.token);
            } else {
              throw new Error('Refresh failed');
            }
          } catch (error) {
            logout();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [token, user, logout]);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await authAPI.login({ email, password });
      const authData = response.data;

      const userData: User = {
        userId: authData.userId,
        id: authData.userId, // Alias for compatibility
        email: authData.email,
        name: authData.name,
        role: authData.role,
        profilePicUrl: authData.profilePicUrl,
      };

      // Save to state
      setUser(userData);
      setToken(authData.token);

      // Save to localStorage
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      // Update WebSocket service with new token
      webSocketService.updateToken(authData.token);

      // Schedule automatic token refresh (silent refresh)
      tokenService.scheduleTokenRefresh();

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await authAPI.register({ name, email, password });
      const authData = response.data;

      const userData: User = {
        userId: authData.userId,
        id: authData.userId, // Alias for compatibility
        email: authData.email,
        name: authData.name,
        role: authData.role,
        profilePicUrl: authData.profilePicUrl,
      };

      // Save to state
      setUser(userData);
      setToken(authData.token);

      // Save to localStorage
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      // Update WebSocket service with new token
      webSocketService.updateToken(authData.token);

      // Schedule automatic token refresh (silent refresh)
      tokenService.scheduleTokenRefresh();

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
