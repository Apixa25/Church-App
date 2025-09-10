/**
 * Utility functions for handling timestamps and dates
 * Provides robust handling of different timestamp formats from backend
 */

export type TimestampFormat = string | number[] | Date;

/**
 * Safely converts various timestamp formats to a JavaScript Date object
 */
export const safeParseDate = (timestamp: TimestampFormat): Date | null => {
  try {
    if (!timestamp) return null;
    
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    if (Array.isArray(timestamp)) {
      // Handle array format [year, month, day, hour, minute, second, nanosecond]
      const [year, month, day, hour = 0, minute = 0, second = 0] = timestamp as number[];
      // Month is 0-indexed in Date constructor
      return new Date(year, month - 1, day, hour, minute, second);
    }
    
    // Handle string format (ISO-8601 or other)
    const date = new Date(timestamp as string);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp format:', timestamp);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing timestamp:', timestamp, error);
    return null;
  }
};

/**
 * Formats a timestamp for display in relative time (e.g., "2h ago", "3 days ago")
 */
export const formatRelativeTime = (
  timestamp: TimestampFormat,
  options: {
    shortFormat?: boolean;
    includeSeconds?: boolean;
  } = {}
): string => {
  const { shortFormat = false, includeSeconds = false } = options;
  
  const date = safeParseDate(timestamp);
  if (!date) return 'Invalid date';
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  
  if (includeSeconds && diffInSeconds < 60) {
    if (diffInSeconds < 10) return 'Just now';
    return shortFormat ? `${diffInSeconds}s` : `${diffInSeconds} seconds ago`;
  }
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return shortFormat ? `${diffInMinutes}m` : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return shortFormat ? `${diffInHours}h` : `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    if (diffInDays === 1) {
      return shortFormat ? '1d' : '1 day ago';
    }
    return shortFormat ? `${diffInDays}d` : `${diffInDays} days ago`;
  } else if (diffInWeeks < 4) {
    if (diffInWeeks === 1) {
      return shortFormat ? '1w' : '1 week ago';
    }
    return shortFormat ? `${diffInWeeks}w` : `${diffInWeeks} weeks ago`;
  } else if (diffInMonths < 12) {
    if (diffInMonths === 1) {
      return shortFormat ? '1mo' : '1 month ago';
    }
    return shortFormat ? `${diffInMonths}mo` : `${diffInMonths} months ago`;
  } else {
    // For very old dates, just show the date
    return date.toLocaleDateString();
  }
};

/**
 * Formats a timestamp for display as clock time (e.g., "2:34 PM")
 */
export const formatClockTime = (timestamp: TimestampFormat): string => {
  const date = safeParseDate(timestamp);
  if (!date) return 'Invalid date';
  
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

/**
 * Formats a timestamp for display as a full date (e.g., "Dec 25, 2023")
 */
export const formatFullDate = (timestamp: TimestampFormat): string => {
  const date = safeParseDate(timestamp);
  if (!date) return 'Invalid date';
  
  return date.toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Formats a timestamp for display based on how recent it is
 * Recent dates show time, older dates show full date
 */
export const formatSmartTimestamp = (timestamp: TimestampFormat): string => {
  const date = safeParseDate(timestamp);
  if (!date) return 'Invalid date';
  
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 24) {
    return formatClockTime(timestamp);
  } else {
    return formatFullDate(timestamp);
  }
};

/**
 * Checks if a timestamp represents a date within the last few minutes
 */
export const isRecent = (timestamp: TimestampFormat, thresholdMinutes: number = 5): boolean => {
  const date = safeParseDate(timestamp);
  if (!date) return false;
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = diffInMs / (1000 * 60);
  
  return diffInMinutes <= thresholdMinutes && diffInMinutes >= 0;
};
