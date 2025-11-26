import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import webSocketService from '../services/websocketService';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: {
    connected: boolean;
    url: string;
    reconnectAttempts: number;
  };
  connect: () => Promise<void>;
  disconnect: () => void;
  ensureConnection: () => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    url: '',
    reconnectAttempts: -1  // -1 means "never attempted connection yet"
  });

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    const status = webSocketService.getConnectionStatus();
    setConnectionStatus(status);
    setIsConnected(status.connected);
  }, []);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.warn('⚠️ Cannot connect WebSocket: user not authenticated');
      return;
    }

    try {
      if (!webSocketService.isWebSocketConnected()) {
        console.log('🔄 Connecting WebSocket via context...');
        await webSocketService.connect();
        updateConnectionStatus();
      } else {
        console.log('✅ WebSocket already connected, reusing connection');
        updateConnectionStatus();
      }
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
      updateConnectionStatus();
      throw error;
    }
  }, [isAuthenticated, user, updateConnectionStatus]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket via context...');
    webSocketService.disconnect();
    updateConnectionStatus();
  }, [updateConnectionStatus]);

  // Ensure connection is ready (with retry logic)
  const ensureConnection = useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.warn('⚠️ Cannot ensure WebSocket connection: user not authenticated');
      return;
    }

    if (webSocketService.isWebSocketConnected()) {
      updateConnectionStatus();
      return;
    }

    try {
      await connect();
      // Wait a bit for connection to be fully established
      let attempts = 0;
      const maxAttempts = 20; // 2 seconds total (20 * 100ms)
      while (!webSocketService.isWebSocketConnected() && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!webSocketService.isWebSocketConnected()) {
        throw new Error('WebSocket connection timeout');
      }

      updateConnectionStatus();
    } catch (error) {
      console.error('❌ Failed to ensure WebSocket connection:', error);
      updateConnectionStatus();
      throw error;
    }
  }, [isAuthenticated, user, connect, updateConnectionStatus]);

  // Set up connection status listener
  useEffect(() => {
    const unsubscribe = webSocketService.addConnectionListener((connected) => {
      setIsConnected(connected);
      updateConnectionStatus();
    });

    // Initial status update
    updateConnectionStatus();

    return () => {
      unsubscribe();
    };
  }, [updateConnectionStatus]);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Small delay to ensure auth token is available
      const timer = setTimeout(() => {
        connect().catch((error) => {
          console.error('❌ Auto-connect WebSocket failed:', error);
        });
      }, 500);

      return () => clearTimeout(timer);
    } else {
      // Disconnect when user logs out
      disconnect();
    }
  }, [isAuthenticated, user, connect, disconnect]);

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    ensureConnection
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;

