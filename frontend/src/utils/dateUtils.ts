/**
 * Utility functions for handling date parsing and formatting
 * Handles various date formats that might come from the backend
 * FIXED: Comprehensive timezone-aware date handling
 */

/**
 * Robust date parsing that handles both string and array formats
 * This function ensures consistent date parsing without timezone offset issues
 */
export const parseEventDate = (dateInput: string | number[]): Date | null => {
  try {
    let date: Date;
    
    if (Array.isArray(dateInput)) {
      // Handle array format [year, month, day, hour, minute, second, nanosecond]
      // CRITICAL: Backend sends month as 1-indexed (1=Jan, 9=Sep) but Date constructor expects 0-indexed (0=Jan, 8=Sep)
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateInput;
      
      // Use local timezone constructor with proper month conversion
      date = new Date(year, month - 1, day, hour, minute, second); // Month is 0-indexed in Date constructor
    } else {
      // Handle string format with proper timezone handling
      let cleanDateString = dateInput;
      
      // Handle various timezone formats
      if (cleanDateString.endsWith('Z')) {
        // UTC timezone - parse as UTC then convert to local
        date = new Date(cleanDateString);
      } else if (cleanDateString.includes('+') || cleanDateString.includes('-')) {
        // Has timezone offset - parse directly
        date = new Date(cleanDateString);
      } else {
        // No timezone info - assume local time
        if (cleanDateString.includes('T')) {
          // ISO format without timezone - parse as local time
          const parts = cleanDateString.split('T');
          const datePart = parts[0];
          const timePart = parts[1] || '00:00:00';
          
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute, second] = timePart.split(':').map(Number);
          
          date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
        } else {
          // Fallback to regular Date parsing
          date = new Date(cleanDateString);
        }
      }
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.warn('Invalid date format in parseEventDate:', dateInput);
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', error, dateInput);
    return null;
  }
};

/**
 * Format event date for display
 */
export const formatEventDate = (dateInput: string | number[]): string => {
  const date = parseEventDate(dateInput);
  
  if (!date) {
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format event time for display
 */
export const formatEventTime = (dateInput: string | number[]): string => {
  const date = parseEventDate(dateInput);
  
  if (!date) {
    return 'Invalid Time';
  }
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Calculate and format event duration
 */
export const formatEventDuration = (startTime: string | number[], endTime?: string | number[]): string => {
  if (!endTime) return '';
  
  const start = parseEventDate(startTime);
  const end = parseEventDate(endTime);
  
  if (!start || !end) {
    return '';
  }
  
  const duration = (end.getTime() - start.getTime()) / (1000 * 60); // in minutes
  
  if (duration <= 0) return '';
  
  if (duration < 60) {
    return `${Math.round(duration)}min`;
  }
  
  const hours = Math.floor(duration / 60);
  const minutes = Math.round(duration % 60);
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}min`;
};

/**
 * Get date key for grouping events by date
 */
export const getDateKey = (dateInput: string | number[]): string | null => {
  const date = parseEventDate(dateInput);
  if (date) {
    // Enhanced debug logging for date offset issues
    console.log('getDateKey DEBUG:', {
      originalInput: dateInput,
      inputType: Array.isArray(dateInput) ? 'array' : 'string',
      arrayLength: Array.isArray(dateInput) ? dateInput.length : 'N/A',
      parsedDate: date,
      dateString: date.toDateString(),
      localDate: date.toLocaleDateString(),
      isoString: date.toISOString(),
      utcDate: date.toUTCString(),
      year: date.getFullYear(),
      month: date.getMonth() + 1, // Show 1-indexed month for clarity
      day: date.getDate(),
      hours: date.getHours(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }
  return date ? date.toDateString() : null;
};

/**
 * Check if an event is in the past
 */
export const isEventPast = (startTime: string | number[]): boolean => {
  const eventDate = parseEventDate(startTime);
  return eventDate ? eventDate < new Date() : false;
};

/**
 * Safe date parsing for general use (used by announcements and other components)
 * Alias for parseEventDate to maintain compatibility
 */
export const safeParseDate = (dateInput: string | number[]): Date | null => {
  return parseEventDate(dateInput);
};

/**
 * Format full date with time for profile and general display
 */
export const formatFullDate = (dateInput: string | number[]): string => {
  const date = parseEventDate(dateInput);
  
  if (!date) {
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format date for announcements and general use
 */
export const formatAnnouncementDate = (dateInput: string | number[]): string => {
  const date = parseEventDate(dateInput);
  
  if (!date) {
    return 'Invalid Date';
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
};

/**
 * Universal date formatter for social media posts, comments, and general use
 * This is the main function that should be used across all components
 */
export const formatRelativeDate = (dateInput: string | number[]): string => {
  try {
    const date = parseEventDate(dateInput);
    
    if (!date) {
      return 'Invalid Date';
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    } else if (diffInWeeks < 4) {
      return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
    } else if (diffInMonths < 12) {
      return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
    } else {
      return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
    }
  } catch (error) {
    console.error('Error formatting relative date:', error, dateInput);
    return 'Invalid Date';
  }
};

/**
 * Format date for calendar events with timezone awareness
 */
export const formatCalendarDate = (dateInput: string | number[]): string => {
  const date = parseEventDate(dateInput);
  
  if (!date) {
    return 'Invalid Date';
  }
  
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format time for calendar events
 */
export const formatCalendarTime = (dateInput: string | number[]): string => {
  const date = parseEventDate(dateInput);
  
  if (!date) {
    return 'Invalid Time';
  }
  
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Parse a date-only string (like birthdays) without timezone conversion.
 * This prevents the "off by one day" bug when displaying dates that don't have a time component.
 * 
 * For example: "1977-05-23" or "1977-05-23T00:00:00Z" should display as May 23, 1977
 * regardless of the user's timezone.
 */
export const parseDateOnly = (dateString: string | undefined): { year: number; month: number; day: number } | null => {
  if (!dateString) return null;
  
  try {
    // Extract just the date part (YYYY-MM-DD) from various formats
    let datePart = dateString;
    
    // Handle ISO format with time (e.g., "1977-05-23T00:00:00Z" or "1977-05-23T00:00:00.000Z")
    if (dateString.includes('T')) {
      datePart = dateString.split('T')[0];
    }
    
    // Parse YYYY-MM-DD format
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      
      // Validate
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && 
          month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { year, month, day };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date-only string:', error, dateString);
    return null;
  }
};

/**
 * Format a birthday date without timezone issues.
 * Takes a date string and returns it formatted without any timezone conversion.
 */
export const formatBirthdayDate = (dateString: string | undefined): string => {
  const parsed = parseDateOnly(dateString);
  
  if (!parsed) {
    return 'Unknown';
  }
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return `${monthNames[parsed.month - 1]} ${parsed.day}, ${parsed.year}`;
};