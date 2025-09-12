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
      // CRITICAL: Backend sends month as 1-indexed (1=Jan, 9=Sep) but Date constructor expects 0-indexed (0=Jan, 8=Sep)
      const [year, month, day, hour = 0, minute = 0, second = 0] = dateInput;
      
      // Debug logging for array date parsing issues
      if (day === 13) { // Only log when day is 13 to reduce noise
        console.log('🐛 Array date parsing (Day 13):', {
          input: dateInput,
          year, 
          month: `${month} (backend 1-indexed)`, 
          day, 
          hour, 
          minute, 
          second,
          monthForDateConstructor: `${month - 1} (0-indexed for Date constructor)`,
          willCreateDate: `new Date(${year}, ${month - 1}, ${day}, ${hour}, ${minute}, ${second})`
        });
      }
      
      // Use local timezone constructor with proper month conversion
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