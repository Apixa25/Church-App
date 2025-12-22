/**
 * ImpressionTracker - High-performance batched view counting service
 *
 * Tracks post impressions (views) when posts enter the viewport, batching
 * them together to minimize server load. Designed to scale to 100k+ users.
 *
 * Usage:
 *   import { impressionTracker } from './impressionTracker';
 *   impressionTracker.trackImpression(postId);
 *
 * How it works:
 * 1. PostCard calls trackImpression() when post enters viewport
 * 2. Post IDs are batched in memory
 * 3. Every 5 seconds OR when batch hits 10 posts, send to server
 * 4. Fire-and-forget API calls - don't wait for response
 * 5. On page unload, flush remaining impressions via sendBeacon
 */

import { recordImpressions } from './postApi';

class ImpressionTracker {
  // Use array instead of Set - we want duplicates! Every view counts.
  private pendingImpressions: string[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds

  constructor() {
    // Flush on page unload to capture any remaining impressions
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
      window.addEventListener('pagehide', () => this.flush());
      // Also flush when tab becomes hidden (user switches tabs)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
  }

  /**
   * Track an impression for a post.
   * Called when a post enters the viewport.
   */
  trackImpression(postId: string): void {
    if (!postId) return;

    this.pendingImpressions.push(postId);

    // If we've hit batch size, flush immediately
    if (this.pendingImpressions.length >= this.BATCH_SIZE) {
      this.flush();
    } else {
      // Otherwise, schedule a flush if not already scheduled
      this.scheduleFlush();
    }
  }

  /**
   * Schedule a flush to happen after FLUSH_INTERVAL_MS
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return; // Already scheduled

    this.flushTimer = setTimeout(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Flush all pending impressions to the server
   */
  flush(): void {
    // Clear the timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Nothing to flush
    if (this.pendingImpressions.length === 0) return;

    // Get the post IDs and clear the pending array
    const postIds = [...this.pendingImpressions];
    this.pendingImpressions = [];

    // Try sendBeacon first (works during page unload)
    // Fall back to regular API call
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const url = `${this.getApiBaseUrl()}/posts/impressions`;
      const blob = new Blob([JSON.stringify({ postIds })], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);

      if (!sent) {
        // sendBeacon failed, fall back to regular API
        recordImpressions(postIds);
      }
    } else {
      // No sendBeacon support, use regular API
      recordImpressions(postIds);
    }
  }

  /**
   * Get the API base URL from environment or default
   */
  private getApiBaseUrl(): string {
    // Try to get from environment variables
    const envUrl = typeof process !== 'undefined' && process.env?.REACT_APP_API_URL;
    if (envUrl) return envUrl;

    // Default to relative API path (works with proxy)
    // For production, this should be the full API URL
    if (typeof window !== 'undefined') {
      // Check if we're in development (localhost)
      if (window.location.hostname === 'localhost') {
        return 'http://localhost:8080/api';
      }
      // Production - API is at api.thegathrd.com
      return 'https://api.thegathrd.com/api';
    }

    return '/api';
  }

  /**
   * Get the current count of pending impressions (for debugging)
   */
  getPendingCount(): number {
    return this.pendingImpressions.length;
  }
}

// Export singleton instance
export const impressionTracker = new ImpressionTracker();

// Also export the class for testing
export { ImpressionTracker };
