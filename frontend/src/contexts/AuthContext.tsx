import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import webSocketService from '../services/websocketService';

export interface User {
  userId: string;
  email: string;
  name: string;
  role: string;
  profilePicUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      const response = await authAPI.login({ email, password });
      const authData = response.data;

      const userData: User = {
        userId: authData.userId,
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