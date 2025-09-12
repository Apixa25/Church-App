/**
 * Utility functions for handling date parsing and formatting
 * Handles various date formats that might come from the backend
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
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateInput;
      // Use local timezone constructor to avoid UTC conversion issues
      date = new Date(year, month - 1, day, hour, minute, second); // Month is 0-indexed in Date constructor
    } else {
      // Handle string format with careful timezone handling
      let cleanDateString = dateInput;
      
      // Remove trailing Z and handle various timezone formats
      cleanDateString = cleanDateString.replace(/Z$/, '');
      cleanDateString = cleanDateString.replace(/\+00:00$/, '');
      
      // Try parsing as local time first to avoid timezone shifts
      if (cleanDateString.includes('T')) {
        // For ISO format, parse as local time to avoid UTC conversion
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
    // Debug logging for date offset issues
    console.log('getDateKey:', {
      input: dateInput,
      parsedDate: date,
      dateString: date.toDateString(),
      localDate: date.toLocaleDateString(),
      isoString: date.toISOString()
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