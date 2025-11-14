import { App, URLOpenListenerEvent } from '@capacitor/app';

export interface DeepLinkRoute {
  type: 'organization' | 'group' | 'user' | 'post' | 'event' | 'prayer';
  action: 'join' | 'view' | 'share';
  id: string;
  params?: Record<string, string>;
}

class DeepLinkingService {
  private listeners: ((route: DeepLinkRoute) => void)[] = [];

  /**
   * Initialize deep linking
   * Call this in your App.tsx or index.tsx
   */
  public initialize(): void {
    App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      this.handleDeepLink(event.url);
    });

    // Handle initial URL if app was opened from a deep link
    App.getLaunchUrl().then(result => {
      if (result && result.url) {
        this.handleDeepLink(result.url);
      }
    });
  }

  /**
   * Register a listener for deep link events
   */
  public addListener(listener: (route: DeepLinkRoute) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Parse and handle deep link
   * Supports formats:
   * - thegathering://join/org/{orgId}
   * - thegathering://join/group/{groupId}
   * - thegathering://view/user/{userId}
   * - thegathering://view/post/{postId}
   * - thegathering://view/event/{eventId}
   * - thegathering://view/prayer/{prayerId}
   * - https://app.thegathering.com/join/org/{orgId}
   */
  private handleDeepLink(url: string): void {
    console.log('Deep link received:', url);

    try {
      const route = this.parseDeepLink(url);
      if (route) {
        // Notify all listeners
        this.listeners.forEach(listener => listener(route));
      }
    } catch (error) {
      console.error('Error parsing deep link:', error);
    }
  }

  /**
   * Parse deep link URL into route object
   */
  private parseDeepLink(url: string): DeepLinkRoute | null {
    // Remove protocol
    let path = url.replace(/^(thegathering:\/\/|https?:\/\/app\.thegathering\.com\/)/, '');

    // Remove query parameters but save them
    const queryIndex = path.indexOf('?');
    let queryParams: Record<string, string> = {};
    if (queryIndex > -1) {
      const queryString = path.substring(queryIndex + 1);
      path = path.substring(0, queryIndex);

      // Parse query parameters
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          queryParams[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    }

    // Parse path segments
    const segments = path.split('/').filter(s => s.length > 0);

    if (segments.length < 3) {
      console.warn('Invalid deep link format:', url);
      return null;
    }

    const [action, type, id] = segments;

    // Validate action
    if (action !== 'join' && action !== 'view' && action !== 'share') {
      console.warn('Invalid deep link action:', action);
      return null;
    }

    // Map type aliases
    let resourceType: DeepLinkRoute['type'];
    switch (type) {
      case 'org':
      case 'organization':
        resourceType = 'organization';
        break;
      case 'group':
        resourceType = 'group';
        break;
      case 'user':
      case 'profile':
        resourceType = 'user';
        break;
      case 'post':
        resourceType = 'post';
        break;
      case 'event':
        resourceType = 'event';
        break;
      case 'prayer':
        resourceType = 'prayer';
        break;
      default:
        console.warn('Invalid deep link type:', type);
        return null;
    }

    return {
      type: resourceType,
      action: action as 'join' | 'view' | 'share',
      id,
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined
    };
  }

  /**
   * Generate deep link URL
   */
  public generateDeepLink(route: DeepLinkRoute): string {
    const typeAlias = route.type === 'organization' ? 'org' : route.type;
    let url = `thegathering://${route.action}/${typeAlias}/${route.id}`;

    // Add query parameters if present
    if (route.params && Object.keys(route.params).length > 0) {
      const queryString = Object.entries(route.params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Generate web fallback URL
   */
  public generateWebLink(route: DeepLinkRoute): string {
    const typeAlias = route.type === 'organization' ? 'org' : route.type;
    let url = `https://app.thegathering.com/${route.action}/${typeAlias}/${route.id}`;

    // Add query parameters if present
    if (route.params && Object.keys(route.params).length > 0) {
      const queryString = Object.entries(route.params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Generate shareable link with both app and web URLs
   */
  public generateShareableLink(route: DeepLinkRoute): {
    deepLink: string;
    webLink: string;
    shareText: string;
  } {
    const deepLink = this.generateDeepLink(route);
    const webLink = this.generateWebLink(route);

    let shareText = '';
    switch (route.type) {
      case 'organization':
        shareText = route.action === 'join'
          ? `Join our church on The Gathering: ${webLink}`
          : `Check out this church on The Gathering: ${webLink}`;
        break;
      case 'group':
        shareText = route.action === 'join'
          ? `Join our group on The Gathering: ${webLink}`
          : `Check out this group on The Gathering: ${webLink}`;
        break;
      case 'event':
        shareText = `Check out this event on The Gathering: ${webLink}`;
        break;
      case 'post':
        shareText = `Check out this post on The Gathering: ${webLink}`;
        break;
      case 'prayer':
        shareText = `Pray with us on The Gathering: ${webLink}`;
        break;
      default:
        shareText = `Check this out on The Gathering: ${webLink}`;
    }

    return { deepLink, webLink, shareText };
  }
}

export const deepLinkingService = new DeepLinkingService();
export default deepLinkingService;
