import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface WebSocketMessage {
  type: string;
  content?: any;
  timestamp: string;
  userId?: string;
}

export interface TypingStatus {
  type: 'typing_status';
  userId: string;
  isTyping: boolean;
  timestamp: string;
}

export interface PresenceUpdate {
  type: 'presence_update';
  userId: string;
  status: string;
  timestamp: string;
}

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected && this.client?.connected) {
        resolve();
        return;
      }

      // Refresh token before connecting
      this.token = localStorage.getItem('authToken');
      
      if (!this.token) {
        console.error('No JWT token found for WebSocket connection');
        reject(new Error('Authentication required - no token found'));
        return;
      }

      this.client = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8083/api/ws'),
        connectHeaders: {
          Authorization: `Bearer ${this.token}`,
        },
        debug: (str: string) => {
          console.log('WebSocket Debug:', str);
        },
        onConnect: (frame: any) => {
          console.log('WebSocket Connected:', frame);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        },
        onStompError: (frame: any) => {
          console.error('WebSocket STOMP Error:', frame);
          this.isConnected = false;
          
          // Check if it's an authentication error
          if (frame.headers && frame.headers.message && 
              frame.headers.message.includes('401') || 
              frame.headers.message.includes('Unauthorized')) {
            console.error('WebSocket authentication failed - token may be invalid');
            reject(new Error('Authentication failed - please login again'));
          } else {
            reject(new Error('WebSocket connection failed'));
          }
        },
        onWebSocketError: (error: any) => {
          console.error('WebSocket Error:', error);
          this.isConnected = false;
          reject(error);
        },
        onDisconnect: () => {
          console.log('WebSocket Disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        },
      });

      this.client.activate();
    });
  }

  disconnect(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions.clear();
    
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    
    this.isConnected = false;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  // Subscribe to group messages
  subscribeToGroupMessages(
    groupId: string,
    callback: (message: any) => void
  ): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = `group-messages-${groupId}`;
    
    // Clean up existing subscription if it exists to prevent duplicates
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      console.log('Cleaning up existing subscription for:', subscriptionKey);
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = `/topic/group/${groupId}/messages`;
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing group message:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to group notifications (joins, leaves, etc.)
  subscribeToGroupNotifications(
    groupId: string,
    callback: (notification: WebSocketMessage) => void
  ): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = `group-notifications-${groupId}`;
    
    // Clean up existing subscription if it exists to prevent duplicates
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      console.log('Cleaning up existing subscription for:', subscriptionKey);
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = `/topic/group/${groupId}`;
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing group notification:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to typing indicators
  subscribeToTyping(
    groupId: string,
    callback: (typing: TypingStatus) => void
  ): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = `typing-${groupId}`;
    
    // Clean up existing subscription if it exists to prevent duplicates
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      console.log('Cleaning up existing subscription for:', subscriptionKey);
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = `/topic/group/${groupId}/typing`;
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing typing status:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to read receipts
  subscribeToReadReceipts(
    groupId: string,
    callback: (readStatus: any) => void
  ): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = `read-${groupId}`;
    
    // Clean up existing subscription if it exists to prevent duplicates
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      console.log('Cleaning up existing subscription for:', subscriptionKey);
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = `/topic/group/${groupId}/read`;
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing read status:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to user-specific errors
  subscribeToErrors(callback: (error: any) => void): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'errors';
    
    // Clean up existing subscription if it exists to prevent duplicates
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      console.log('Cleaning up existing subscription for:', subscriptionKey);
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/user/queue/errors';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing error message:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to presence updates
  subscribeToPresence(callback: (presence: PresenceUpdate) => void): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'presence';
    
    // Clean up existing subscription if it exists to prevent duplicates
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      console.log('Cleaning up existing subscription for:', subscriptionKey);
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/topic/presence';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing presence update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Send message via WebSocket
  sendMessage(groupId: string, message: any): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/chat/send/${groupId}`,
      body: JSON.stringify(message),
    });
  }

  // Send typing status
  sendTypingStatus(groupId: string, isTyping: boolean): void {
    if (!this.isConnected || !this.client) {
      return; // Don't throw error for typing status
    }

    this.client.publish({
      destination: `/app/chat/typing/${groupId}`,
      body: JSON.stringify({ isTyping }),
    });
  }

  // Join group via WebSocket
  joinGroup(groupId: string): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/chat/join/${groupId}`,
      body: JSON.stringify({}),
    });
  }

  // Leave group via WebSocket
  leaveGroup(groupId: string): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/chat/leave/${groupId}`,
      body: JSON.stringify({}),
    });
  }

  // Mark messages as read
  markAsRead(groupId: string, timestamp?: string): void {
    if (!this.isConnected || !this.client) {
      return; // Don't throw error for read status
    }

    this.client.publish({
      destination: `/app/chat/read/${groupId}`,
      body: JSON.stringify({ timestamp: timestamp || new Date().toISOString() }),
    });
  }

  // Edit message via WebSocket
  editMessage(messageId: string, content: string): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/chat/edit/${messageId}`,
      body: JSON.stringify({ content }),
    });
  }

  // Delete message via WebSocket
  deleteMessage(messageId: string): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/chat/delete/${messageId}`,
      body: JSON.stringify({}),
    });
  }

  // Update presence
  updatePresence(status: string): void {
    if (!this.isConnected || !this.client) {
      return; // Don't throw error for presence
    }

    this.client.publish({
      destination: '/app/chat/presence',
      body: JSON.stringify({ status }),
    });
  }

  // Get connection status
  isWebSocketConnected(): boolean {
    return this.isConnected && this.client?.connected === true;
  }

  // Update token (when user logs in/out)
  updateToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('authToken', token);
      
      // If we're connected, reconnect with the new token
      if (this.isConnected) {
        this.disconnect();
        // Small delay before reconnecting to allow proper cleanup
        setTimeout(() => {
          this.connect().catch(error => {
            console.error('Failed to reconnect WebSocket with new token:', error);
          });
        }, 100);
      }
    } else {
      localStorage.removeItem('authToken');
      this.disconnect(); // Disconnect if no token
    }
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;