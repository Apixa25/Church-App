export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  
  // Creator details
  creatorId: string;
  creatorName: string;
  creatorProfilePicUrl?: string;
  
  // Group details (if associated)
  groupId?: string;
  groupName?: string;
  
  category: EventCategory;
  status: EventStatus;
  maxAttendees?: number;
  isRecurring: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceEndDate?: string;
  requiresApproval: boolean;
  
  // RSVP summary
  rsvpSummary?: EventRsvpSummary;
  
  createdAt: string;
  updatedAt: string;
}

export interface EventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  groupId?: string;
  category?: EventCategory;
  status?: EventStatus;
  maxAttendees?: number;
  isRecurring?: boolean;
  recurrenceType?: RecurrenceType;
  recurrenceEndDate?: string;
  requiresApproval?: boolean;
}

export interface EventRsvp {
  eventId: string;
  eventTitle: string;
  eventStartTime: string;
  eventLocation?: string;
  userId: string;
  userName: string;
  userProfilePicUrl?: string;
  response: RsvpResponse;
  guestCount: number;
  notes?: string;
  timestamp: string;
  updatedAt: string;
}

export interface EventRsvpRequest {
  eventId: string;
  response: RsvpResponse;
  guestCount?: number;
  notes?: string;
}

export interface EventRsvpSummary {
  yesCount: number;
  noCount: number;
  maybeCount: number;
  totalResponses: number;
  totalAttendees: number;
  
  // User's own RSVP status
  userRsvpResponse?: string;
  userGuestCount?: number;
  userNotes?: string;
}

export interface EventsResponse {
  events: Event[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
  pageSize: number;
}

export enum EventCategory {
  GENERAL = 'GENERAL',
  WORSHIP = 'WORSHIP',
  BIBLE_STUDY = 'BIBLE_STUDY',
  PRAYER = 'PRAYER',
  FELLOWSHIP = 'FELLOWSHIP',
  OUTREACH = 'OUTREACH',
  YOUTH = 'YOUTH',
  CHILDREN = 'CHILDREN',
  MENS = 'MENS',
  WOMENS = 'WOMENS',
  SENIORS = 'SENIORS',
  MISSIONS = 'MISSIONS',
  MINISTRY = 'MINISTRY',
  SOCIAL = 'SOCIAL',
  EDUCATION = 'EDUCATION',
  MUSIC = 'MUSIC',
  OTHER = 'OTHER'
}

export enum EventStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  POSTPONED = 'POSTPONED'
}

export enum RecurrenceType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export enum RsvpResponse {
  YES = 'YES',
  NO = 'NO',
  MAYBE = 'MAYBE'
}

// Helper functions for display
export const getEventCategoryDisplay = (category: EventCategory): string => {
  const displays: Record<EventCategory, string> = {
    [EventCategory.GENERAL]: 'General',
    [EventCategory.WORSHIP]: 'Worship Service',
    [EventCategory.BIBLE_STUDY]: 'Bible Study',
    [EventCategory.PRAYER]: 'Prayer Meeting',
    [EventCategory.FELLOWSHIP]: 'Fellowship',
    [EventCategory.OUTREACH]: 'Outreach',
    [EventCategory.YOUTH]: 'Youth Ministry',
    [EventCategory.CHILDREN]: 'Children Ministry',
    [EventCategory.MENS]: "Men's Ministry",
    [EventCategory.WOMENS]: "Women's Ministry",
    [EventCategory.SENIORS]: 'Senior Ministry',
    [EventCategory.MISSIONS]: 'Missions',
    [EventCategory.MINISTRY]: 'Ministry',
    [EventCategory.SOCIAL]: 'Social Event',
    [EventCategory.EDUCATION]: 'Education',
    [EventCategory.MUSIC]: 'Music Ministry',
    [EventCategory.OTHER]: 'Other'
  };
  return displays[category] || category;
};

export const getEventStatusDisplay = (status: EventStatus): string => {
  const displays: Record<EventStatus, string> = {
    [EventStatus.SCHEDULED]: 'Scheduled',
    [EventStatus.CANCELLED]: 'Cancelled',
    [EventStatus.COMPLETED]: 'Completed',
    [EventStatus.POSTPONED]: 'Postponed'
  };
  return displays[status] || status;
};

export const getRsvpResponseDisplay = (response: RsvpResponse): string => {
  const displays: Record<RsvpResponse, string> = {
    [RsvpResponse.YES]: 'Attending',
    [RsvpResponse.NO]: 'Not Attending',
    [RsvpResponse.MAYBE]: 'Maybe'
  };
  return displays[response] || response;
};