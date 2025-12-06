/**
 * Token Service - Handles automatic token refresh and management
 * Implements industry-standard refresh token pattern with silent refresh
 */

interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  email: string;
  userId: string;
  name: string;
  role: string;
  profilePicUrl?: string;
}

class TokenService {
  private refreshPromise: Promise<RefreshTokenResponse> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private readonly REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiration
  private readonly ACCESS_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Decode JWT token to get expiration time (without verification - for client-side expiry check)
   */
  private getTokenExpiration(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch (e) {
      console.error('Failed to decode token:', e);
      return null;
    }
  }

  /**
   * Check if token is expired or will expire soon
   */
  private isTokenExpiringSoon(token: string | null): boolean {
    if (!token) return true;
    
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;
    
    const now = Date.now();
    const timeUntilExpiry = expiration - now;
    
    // Refresh if expired or will expire within REFRESH_BEFORE_EXPIRY_MS
    return timeUntilExpiry <= this.REFRESH_BEFORE_EXPIRY_MS;
  }

  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const token = localStorage.getItem('authToken');
    if (!token) return;

    const expiration = this.getTokenExpiration(token);
    if (!expiration) return;

    const now = Date.now();
    const timeUntilExpiry = expiration - now;
    const timeUntilRefresh = timeUntilExpiry - this.REFRESH_BEFORE_EXPIRY_MS;

    // If token is already expiring soon, refresh immediately
    if (timeUntilRefresh <= 0) {
      this.refreshTokenSilently();
      return;
    }

    // Schedule refresh before expiration
    console.log(`🔄 Token refresh scheduled in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`);
    this.refreshTimer = setTimeout(() => {
      this.refreshTokenSilently();
    }, timeUntilRefresh);
  }

  /**
   * Refresh token using refresh token (silent refresh)
   */
  async refreshTokenSilently(): Promise<RefreshTokenResponse | null> {
    // If refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.warn('⚠️ No refresh token available');
      return null;
    }

    // Check if refresh token is expired
    if (this.isTokenExpiringSoon(refreshToken)) {
      console.warn('⚠️ Refresh token is expired or expiring soon');
      this.handleRefreshFailure();
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const API_BASE_URL = (await import('../config/runtimeConfig')).getApiUrl();
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data: RefreshTokenResponse = await response.json();
        
        // Update tokens in localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        
        // Update user data if provided
        if (data.email && data.userId && data.name) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({
            ...user,
            email: data.email,
            userId: data.userId,
            name: data.name,
            role: data.role,
            profilePicUrl: data.profilePicUrl || user.profilePicUrl,
          }));
        }

        // Update WebSocket service with new token
        try {
          const webSocketService = (await import('./websocketService')).default;
          webSocketService.updateToken(data.token);
        } catch (error) {
          console.warn('Failed to update WebSocket token:', error);
        }

        console.log('✅ Token refreshed successfully');
        
        // Schedule next refresh
        this.scheduleTokenRefresh();
        
        return data;
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        this.handleRefreshFailure();
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Handle refresh failure - clear tokens and redirect to login
   */
  private handleRefreshFailure(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Only redirect if we're not already on the login page
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
  }

  /**
   * Get current access token, refreshing if needed
   */
  async getValidAccessToken(): Promise<string | null> {
    let token = localStorage.getItem('authToken');
    
    if (!token) {
      return null;
    }

    // If token is expiring soon, refresh it
    if (this.isTokenExpiringSoon(token)) {
      try {
        const refreshed = await this.refreshTokenSilently();
        token = refreshed?.token || token;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return null;
      }
    }

    return token;
  }

  /**
   * Clear refresh timer (called on logout)
   */
  clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.refreshPromise = null;
  }
}

export const tokenService = new TokenService();

