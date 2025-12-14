import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { requestNotificationPermission as requestWebNotification } from '../config/firebase';
import api from './api';

/**
 * Universal Push Notification Service
 * Handles push notifications for both web (Firebase) and mobile (Capacitor)
 */
class PushNotificationService {
  private isNative = Capacitor.isNativePlatform();

  /**
   * Initialize push notifications
   * Registers listeners and requests permission if needed
   */
  async initialize(): Promise<void> {
    console.log('[PushNotificationService] Initializing on platform:', Capacitor.getPlatform());

    if (this.isNative) {
      await this.initializeMobile();
    } else {
      await this.initializeWeb();
    }
  }

  /**
   * Initialize web push notifications (Firebase)
   */
  private async initializeWeb(): Promise<void> {
    console.log('[PushNotificationService] Initializing web push notifications');

    // Web notifications are handled via the firebase config
    // This is a placeholder for any additional web-specific logic
  }

  /**
   * Initialize mobile push notifications (Capacitor)
   */
  private async initializeMobile(): Promise<void> {
    console.log('[PushNotificationService] Initializing mobile push notifications');

    // Check permission status
    const permStatus = await PushNotifications.checkPermissions();

    console.log('[PushNotificationService] Current permission status:', permStatus.receive);

    // Request permission if not granted
    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      const result = await PushNotifications.requestPermissions();
      if (result.receive !== 'granted') {
        console.log('[PushNotificationService] Push notification permission denied');
        return;
      }
    }

    // Register with FCM/APNS
    await PushNotifications.register();

    // Setup listeners
    this.setupMobileListeners();
  }

  /**
   * Setup mobile push notification listeners
   */
  private setupMobileListeners(): void {
    // Token registration
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[PushNotificationService] Push registration success, token:', token.value);

      // Register token with backend
      try {
        await api.post('/api/notifications/register-token', {
          token: token.value
        });
        console.log('[PushNotificationService] Token registered with backend');
      } catch (error) {
        console.error('[PushNotificationService] Failed to register token with backend:', error);
      }
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('[PushNotificationService] Push registration error:', error);
    });

    // Push notification received (app in foreground)
    PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('[PushNotificationService] Push received (foreground):', notification);

      // You can show a custom in-app notification here if desired
    });

    // Push notification tapped (user clicked notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[PushNotificationService] Push action performed:', action);

      // Handle navigation based on notification data
      const { data } = action.notification;

      if (data) {
        this.handleNotificationClick(data);
      }
    });
  }

  /**
   * Handle notification click - navigate to appropriate screen
   */
  private handleNotificationClick(data: any): void {
    const { type, postId, prayerId, eventId, chatId } = data;

    // This would integrate with your router
    // For now, just log the action
    console.log('[PushNotificationService] Handling notification click:', type, data);

    // Example routing logic (you'd integrate this with React Router):
    if (type === 'prayer_request' && prayerId) {
      // Navigate to prayer detail
      window.location.href = `/prayer/${prayerId}`;
    } else if (type === 'post_like' || type === 'post_comment') {
      // Navigate to feed
      window.location.href = '/feed';
    } else if (type === 'event_reminder' && eventId) {
      // Navigate to event
      window.location.href = `/events/${eventId}`;
    } else if (type === 'chat_message' && chatId) {
      // Navigate to chat
      window.location.href = `/chat/${chatId}`;
    } else if (type === 'announcement') {
      // Navigate to announcements
      window.location.href = '/announcements';
    }
  }

  /**
   * Request notification permission
   * Works on both web and mobile
   */
  async requestPermission(): Promise<boolean> {
    if (this.isNative) {
      return await this.requestMobilePermission();
    } else {
      return await this.requestWebPermission();
    }
  }

  /**
   * Request web notification permission
   */
  private async requestWebPermission(): Promise<boolean> {
    try {
      const token = await requestWebNotification();
      if (token) {
        // Register token with backend
        await api.post('/api/notifications/register-token', { token });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PushNotificationService] Web permission request failed:', error);
      return false;
    }
  }

  /**
   * Request mobile notification permission
   */
  private async requestMobilePermission(): Promise<boolean> {
    try {
      const result = await PushNotifications.requestPermissions();

      if (result.receive === 'granted') {
        await PushNotifications.register();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[PushNotificationService] Mobile permission request failed:', error);
      return false;
    }
  }

  /**
   * Get current permission status
   */
  async getPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'> {
    if (this.isNative) {
      const status = await PushNotifications.checkPermissions();
      return status.receive as 'granted' | 'denied' | 'prompt';
    } else {
      if ('Notification' in window) {
        return Notification.permission as 'granted' | 'denied' | 'prompt';
      }
      return 'denied';
    }
  }

  /**
   * Unregister from push notifications
   */
  async unregister(): Promise<void> {
    try {
      // Unregister from backend
      await api.delete('/api/notifications/unregister-token');

      // Unregister from platform
      if (this.isNative) {
        await PushNotifications.removeAllListeners();
        // Note: There's no unregister() in Capacitor - tokens persist until app reinstall
      }

      console.log('[PushNotificationService] Unregistered from push notifications');
    } catch (error) {
      console.error('[PushNotificationService] Failed to unregister:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
