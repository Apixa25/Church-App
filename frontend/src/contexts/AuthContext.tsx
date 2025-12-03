import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import webSocketService from '../services/websocketService';

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

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      
      // Update WebSocket service with existing token
      webSocketService.updateToken(savedToken);
      
      // Fetch fresh user data from backend to ensure profilePicUrl is current
      fetchFreshUserData(savedToken);
    }
    
    setLoading(false);
  }, []);

  // Function to fetch fresh user data from backend
  const fetchFreshUserData = async (token: string) => {
    try {
      // Import profileAPI dynamically to avoid circular dependency
      const { profileAPI } = await import('../services/api');
      const response = await profileAPI.getMyProfile();
      const freshUserData = response.data;
      
      // Update user state with fresh data
      setUser(prevUser => {
        if (prevUser) {
          const updatedUser = { ...prevUser, ...freshUserData };
          
          // Preserve profilePicUrl and bannerImageUrl if backend returns null/empty
          // This prevents clearing Google OAuth profile pictures
          if (!freshUserData.profilePicUrl || 
              (typeof freshUserData.profilePicUrl === 'string' && freshUserData.profilePicUrl.trim() === '')) {
            updatedUser.profilePicUrl = prevUser.profilePicUrl;
          }
          
          if (!freshUserData.bannerImageUrl || 
              (typeof freshUserData.bannerImageUrl === 'string' && freshUserData.bannerImageUrl.trim() === '')) {
            updatedUser.bannerImageUrl = prevUser.bannerImageUrl;
          }
          
          // Update localStorage with fresh user data
          localStorage.setItem('user', JSON.stringify(updatedUser));
          return updatedUser;
        }
        return null;
      });
    } catch (error) {
      console.error('Failed to fetch fresh user data:', error);
      // Don't throw error - user can still use the app with cached data
    }
  };

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

    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Update WebSocket service to disconnect
    webSocketService.updateToken(null);
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