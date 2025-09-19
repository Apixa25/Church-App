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

export interface PrayerRequestUpdate {
  type: 'prayer_request' | 'prayer_interaction' | 'prayer_update';
  prayerRequestId: string;
  userId?: string;
  content?: any;
  timestamp: string;
}

export interface PrayerInteractionUpdate {
  type: 'prayer_interaction';
  prayerRequestId: string;
  interactionType: string;
  userId: string;
  content?: string;
  timestamp: string;
}

export interface EventUpdate {
  type: 'event_created' | 'event_updated' | 'event_cancelled' | 'event_deleted';
  eventId: string;
  eventTitle?: string;
  eventStartTime?: string;
  creatorId: string;
  content?: any;
  timestamp: string;
}

export interface EventRsvpUpdate {
  type: 'event_rsvp' | 'rsvp_updated' | 'rsvp_cancelled';
  eventId: string;
  eventTitle?: string;
  eventStartTime?: string;
  userId: string;
  userName?: string;
  response?: string;
  guestCount?: number;
  timestamp: string;
}

export interface PostUpdate {
  type: 'post_created' | 'post_updated' | 'post_deleted';
  postId: string;
  userId: string;
  userName?: string;
  content?: string;
  postType?: string;
  timestamp: string;
}

export interface PostInteractionUpdate {
  type: 'post_like' | 'post_unlike' | 'post_comment' | 'post_share' | 'post_bookmark';
  postId: string;
  userId: string;
  userName?: string;
  content?: string;
  timestamp: string;
}

export interface CommentUpdate {
  type: 'comment_created' | 'comment_updated' | 'comment_deleted';
  commentId: string;
  postId: string;
  userId: string;
  userName?: string;
  content?: string;
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
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  connect(): Promise<void> {
    // If already connected, return immediately
    if (this.isConnected && this.client?.connected) {
      console.log('WebSocket already connected, reusing existing connection');
      return Promise.resolve();
    }

    // If already connecting, return the existing promise
    if (this.connectionPromise) {
      console.log('WebSocket connection already in progress, waiting for existing connection...');
      return this.connectionPromise;
    }

    // Create new connection promise
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      // If already connecting, wait for that connection
      if (this.client && this.client.state === 1) { // 1 = CONNECTING state
        console.log('WebSocket connection already in progress, waiting...');
        const checkConnection = () => {
          if (this.isConnected && this.client?.connected) {
            resolve();
          } else if (!this.client || this.client.state === 0) { // 0 = INACTIVE state
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
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
          this.connectionPromise = null; // Clear the connection promise
          resolve();
        },
        onStompError: (frame: any) => {
          console.error('WebSocket STOMP Error:', frame);
          this.isConnected = false;
          this.connectionPromise = null; // Clear the connection promise
          
          // Check if it's an authentication error
          if (frame.headers && frame.headers.message && 
              (frame.headers.message.includes('401') || 
              frame.headers.message.includes('Unauthorized'))) {
            console.error('WebSocket authentication failed - token may be invalid');
            reject(new Error('Authentication failed - please login again'));
          } else {
            reject(new Error('WebSocket connection failed'));
          }
        },
        onWebSocketError: (error: any) => {
          console.error('WebSocket Error:', error);
          this.isConnected = false;
          this.connectionPromise = null; // Clear the connection promise
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

    return this.connectionPromise;
  }

  disconnect(): void {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
    this.subscriptions.clear();
    
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    
    this.isConnected = false;
    this.connectionPromise = null; // Clear the connection promise
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

  // Subscribe to prayer request updates
  subscribeToPrayerRequests(callback: (update: PrayerRequestUpdate) => void): () => void {
    if (!this.client || !this.client.connected) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'prayer-requests';
    
    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/topic/prayers';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        console.log('🔥 WebSocket received message on /topic/prayers:', message.body);
        const data = JSON.parse(message.body);
        console.log('🔥 Parsed prayer data:', data);
        callback(data);
      } catch (error) {
        console.error('Error parsing prayer request update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to specific prayer request interactions
  subscribeToPrayerInteractions(
    prayerRequestId: string,
    callback: (interaction: PrayerInteractionUpdate) => void
  ): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = `prayer-interactions-${prayerRequestId}`;
    
    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = `/topic/prayers/${prayerRequestId}/interactions`;
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing prayer interaction update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to user's personal prayer notifications
  subscribeToUserPrayerNotifications(callback: (notification: WebSocketMessage) => void): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'user-prayer-notifications';
    
    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/user/queue/prayers';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        console.log('🔥 WebSocket received message on /user/queue/prayers:', message.body);
        const data = JSON.parse(message.body);
        console.log('🔥 Parsed user prayer notification:', data);
        callback(data);
      } catch (error) {
        console.error('Error parsing prayer notification:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Send prayer interaction via WebSocket
  sendPrayerInteraction(prayerRequestId: string, interaction: any): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/prayers/${prayerRequestId}/interact`,
      body: JSON.stringify(interaction),
    });
  }

  // Subscribe to all event updates
  async subscribeToEventUpdates(callback: (update: EventUpdate) => void): Promise<() => void> {
    await this.ensureConnection();
    
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'event-updates';
    
    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/topic/events';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing event update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to RSVP updates for all events
  subscribeToRsvpUpdates(callback: (update: EventRsvpUpdate) => void): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'rsvp-updates';
    
    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/topic/events/rsvps';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing RSVP update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to specific event RSVP updates
  subscribeToEventRsvps(
    eventId: string,
    callback: (update: EventRsvpUpdate) => void
  ): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = `event-rsvps-${eventId}`;
    
    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = `/topic/events/${eventId}/rsvps`;
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing event RSVP update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to user's personal event notifications
  subscribeToUserEventNotifications(callback: (notification: WebSocketMessage) => void): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'user-event-notifications';
    
    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/user/queue/events';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing event notification:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Send event RSVP via WebSocket
  sendEventRsvp(eventId: string, rsvpData: any): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/events/${eventId}/rsvp`,
      body: JSON.stringify(rsvpData),
    });
  }

  // Send event reminder request
  sendEventReminder(eventId: string): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/events/${eventId}/remind`,
      body: JSON.stringify({}),
    });
  }

  // Get connection status
  isWebSocketConnected(): boolean {
    return this.isConnected && this.client?.connected === true;
  }

  // Ensure connection is ready before subscribing
  private async ensureConnection(): Promise<void> {
    if (!this.isWebSocketConnected()) {
      await this.connect();
      // Wait a bit more for the connection to be fully established
      await new Promise(resolve => setTimeout(resolve, 500));
    }
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

  // ========== SOCIAL FEED WEBSOCKET METHODS ==========

  // Subscribe to all social feed post updates
  subscribeToSocialFeed(callback: (update: PostUpdate) => void): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'social-feed-posts';

    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/topic/social/posts';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing social feed post update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to social feed interactions (likes, comments, shares)
  subscribeToSocialInteractions(callback: (update: PostInteractionUpdate) => void): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'social-feed-interactions';

    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/topic/social/interactions';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing social feed interaction update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to comment updates for all posts
  subscribeToComments(callback: (update: CommentUpdate) => void): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'social-feed-comments';

    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/topic/social/comments';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing comment update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to specific post interactions
  subscribeToPostInteractions(
    postId: string,
    callback: (update: PostInteractionUpdate) => void
  ): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = `post-interactions-${postId}`;

    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = `/topic/social/posts/${postId}/interactions`;
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing post interaction update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to specific post comments
  subscribeToPostComments(
    postId: string,
    callback: (update: CommentUpdate) => void
  ): () => void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = `post-comments-${postId}`;

    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = `/topic/social/posts/${postId}/comments`;
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing post comment update:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Subscribe to user's personal social feed notifications
  async subscribeToUserSocialNotifications(callback: (notification: WebSocketMessage) => void): Promise<() => void> {
    await this.ensureConnection();
    
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = 'user-social-notifications';

    // Clean up existing subscription if it exists
    const existingSubscription = this.subscriptions.get(subscriptionKey);
    if (existingSubscription) {
      existingSubscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    }

    const destination = '/user/queue/social';
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const data = JSON.parse(message.body);
        callback(data);
      } catch (error) {
        console.error('Error parsing social notification:', error);
      }
    });

    this.subscriptions.set(subscriptionKey, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(subscriptionKey);
    };
  }

  // Send social feed interaction via WebSocket
  sendSocialInteraction(interaction: any): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: '/app/social/interact',
      body: JSON.stringify(interaction),
    });
  }

  // Send new post via WebSocket (for real-time feed updates)
  sendNewPost(post: any): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: '/app/social/posts',
      body: JSON.stringify(post),
    });
  }

  // Send comment via WebSocket
  sendComment(postId: string, comment: any): void {
    if (!this.isConnected || !this.client) {
      throw new Error('WebSocket not connected');
    }

    this.client.publish({
      destination: `/app/social/posts/${postId}/comments`,
      body: JSON.stringify(comment),
    });
  }

  // Send typing indicator for social interactions
  sendSocialTyping(postId: string, isTyping: boolean): void {
    if (!this.isConnected || !this.client) {
      return; // Don't throw error for typing status
    }

    this.client.publish({
      destination: `/app/social/posts/${postId}/typing`,
      body: JSON.stringify({ isTyping }),
    });
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;