import { Event } from '../types/Event';

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
      } else if (cleanDateString.includes('+') || /T.*-\d{2}:\d{2}$/.test(cleanDateString)) {
        // Has timezone offset (e.g., +05:00 or -05:00 after T) - parse directly
        date = new Date(cleanDateString);
      } else {
        // No timezone info - ASSUME UTC (server sends UTC times without 'Z' suffix)
        // This fixes the "Just now" bug where posts appear to be in the future
        if (cleanDateString.includes('T')) {
          // ISO format without timezone - treat as UTC by appending 'Z'
          date = new Date(cleanDateString + 'Z');
        } else {
          // Fallback - append time and treat as UTC
          date = new Date(cleanDateString + 'T00:00:00Z');
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

/**
 * Expand a recurring event into multiple virtual instances for calendar display.
 * This function generates all occurrences of a recurring event based on its recurrence pattern.
 * 
 * @param event - The recurring event to expand
 * @param viewStartDate - The start date of the calendar view (to limit expansion)
 * @param viewEndDate - The end date of the calendar view (to limit expansion)
 * @returns Array of virtual event instances with adjusted startTime and endTime
 */
export const expandRecurringEvent = (
  event: Event,
  viewStartDate?: Date,
  viewEndDate?: Date
): Event[] => {
  // If not a recurring event, return as-is
  if (!event.isRecurring || !event.recurrenceType) {
    return [event];
  }

  const startDate = parseEventDate(event.startTime);
  if (!startDate) {
    return [event];
  }

  // Determine the end date for recurrence
  let recurrenceEnd: Date | null = null;
  if (event.recurrenceEndDate) {
    recurrenceEnd = parseEventDate(event.recurrenceEndDate);
  }

  // Set view boundaries - expand up to 1 year ahead if no view dates provided
  const viewStart = viewStartDate || new Date();
  const viewEnd = viewEndDate || new Date();
  viewEnd.setFullYear(viewEnd.getFullYear() + 1); // Default to 1 year ahead

  // Calculate duration of the original event (for endTime adjustment)
  let eventDuration = 0; // in milliseconds
  if (event.endTime) {
    const endDate = parseEventDate(event.endTime);
    if (endDate) {
      eventDuration = endDate.getTime() - startDate.getTime();
    }
  }

  const instances: Event[] = [];
  let currentDate = new Date(startDate);

  // Generate instances until we hit the recurrence end date or view end date
  while (currentDate <= viewEnd) {
    // Stop if we've hit the recurrence end date
    if (recurrenceEnd && currentDate > recurrenceEnd) {
      break;
    }

    // Only include instances that are within or after the view start date
    if (currentDate >= viewStart || currentDate >= new Date()) {
      // Format date in the same format the backend uses (LocalDateTime format)
      const formatDateForBackend = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
      };

      const instanceStartTime = formatDateForBackend(currentDate);
      let instanceEndTime: string | undefined;
      
      if (event.endTime && eventDuration > 0) {
        const instanceEnd = new Date(currentDate.getTime() + eventDuration);
        instanceEndTime = formatDateForBackend(instanceEnd);
      }

      // Create a new instance with updated times, preserving all original properties
      // We spread the event to preserve all properties, then override startTime and endTime
      // TypeScript needs explicit casting because we're adding a custom property for React keys
      const instance: Event = {
        ...event,
        startTime: instanceStartTime,
        endTime: instanceEndTime
      };
      // Add custom property for React key (not part of Event interface, but needed for rendering)
      (instance as any)._recurrenceInstance = `${event.id}-${currentDate.getTime()}`;
      instances.push(instance);
    }

    // Calculate next occurrence based on recurrence type
    const nextDate = new Date(currentDate);
    switch (event.recurrenceType) {
      case 'DAILY':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'MONTHLY':
        // For monthly, preserve the day of month (handle edge cases like Feb 31 -> Feb 28/29)
        const currentDay = nextDate.getDate();
        nextDate.setMonth(nextDate.getMonth() + 1);
        // If the day doesn't exist in the new month (e.g., Jan 31 -> Feb), use last day of month
        if (nextDate.getDate() !== currentDay) {
          nextDate.setDate(0); // Go to last day of previous month
        }
        break;
      case 'YEARLY':
        // For yearly, preserve month and day
        const currentMonth = nextDate.getMonth();
        const currentDayOfMonth = nextDate.getDate();
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        // Handle leap year edge case (Feb 29)
        if (nextDate.getMonth() !== currentMonth || nextDate.getDate() !== currentDayOfMonth) {
          nextDate.setMonth(currentMonth, 0); // Go to last day of previous month
          nextDate.setDate(Math.min(currentDayOfMonth, nextDate.getDate()));
        }
        break;
      default:
        // Unknown recurrence type, stop expanding
        return instances.length > 0 ? instances : [event];
    }

    currentDate = nextDate;

    // Safety limit: prevent infinite loops (max 1000 instances)
    if (instances.length >= 1000) {
      console.warn(`Recurring event ${event.id} exceeded expansion limit of 1000 instances`);
      break;
    }
  }

  // If no instances were generated (e.g., all in the past), return at least the original
  return instances.length > 0 ? instances : [event];
};