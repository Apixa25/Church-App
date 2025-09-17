import api from './api';
import { 
  Event, 
  EventRequest, 
  EventsResponse, 
  EventRsvp, 
  EventRsvpRequest, 
  EventRsvpSummary, 
  EventCategory, 
  EventStatus 
} from '../types/Event';

export const eventAPI = {
  // Event CRUD operations
  createEvent: (eventData: EventRequest): Promise<{ data: Event }> =>
    api.post('/events', eventData),
  
  getEvent: (eventId: string): Promise<{ data: Event }> =>
    api.get(`/events/${eventId}`),
  
  updateEvent: (eventId: string, eventData: EventRequest): Promise<{ data: Event }> =>
    api.put(`/events/${eventId}`, eventData),
  
  deleteEvent: (eventId: string): Promise<{ data: { message: string } }> =>
    api.delete(`/events/${eventId}`),
  
  // Event queries
  getEvents: (params?: {
    page?: number;
    size?: number;
    category?: string;
    status?: string;
    creatorId?: string;
    groupId?: string;
  }): Promise<{ data: EventsResponse }> =>
    api.get('/events', { params }),
  
  getUpcomingEvents: (params?: {
    page?: number;
    size?: number;
  }): Promise<{ data: EventsResponse }> =>
    api.get('/events/upcoming', { params }),
  
  getRecentEvents: (params?: {
    page?: number;
    size?: number;
  }): Promise<{ data: EventsResponse }> =>
    api.get('/events/recent', { params }),
  
  searchEvents: (params: {
    query: string;
    page?: number;
    size?: number;
  }): Promise<{ data: EventsResponse }> =>
    api.get('/events/search', { params }),
  
  getEventsByDateRange: (params: {
    startDate: string;
    endDate: string;
    page?: number;
    size?: number;
  }): Promise<{ data: EventsResponse }> =>
    api.get('/events/date-range', { params }),
  
  getEventsToday: (): Promise<{ data: Event[] }> =>
    api.get('/events/today'),
  
  getEventsThisWeek: (): Promise<{ data: Event[] }> =>
    api.get('/events/this-week'),
  
  // RSVP operations
  createOrUpdateRsvp: (eventId: string, rsvpData: Omit<EventRsvpRequest, 'eventId'>): Promise<{ data: EventRsvp }> =>
    api.post(`/events/${eventId}/rsvp`, { ...rsvpData, eventId }),
  
  getUserRsvp: (eventId: string): Promise<{ data: EventRsvp | { message: string } }> =>
    api.get(`/events/${eventId}/rsvp`),
  
  deleteRsvp: (eventId: string): Promise<{ data: { message: string } }> =>
    api.delete(`/events/${eventId}/rsvp`),
  
  getEventRsvps: (eventId: string, response?: string): Promise<{ data: EventRsvp[] }> =>
    api.get(`/events/${eventId}/rsvps`, { params: response ? { response } : {} }),
  
  getEventRsvpSummary: (eventId: string): Promise<{ data: EventRsvpSummary }> =>
    api.get(`/events/${eventId}/rsvp-summary`),
  
  getUserRsvps: (): Promise<{ data: EventRsvp[] }> =>
    api.get('/events/my-rsvps'),
  
  getUserUpcomingRsvps: (): Promise<{ data: EventRsvp[] }> =>
    api.get('/events/my-upcoming-rsvps'),
};

// Event category and status helpers for dropdowns
export const EVENT_CATEGORY_OPTIONS = Object.values(EventCategory).map(category => ({
  value: category,
  label: getEventCategoryLabel(category)
}));

export const EVENT_STATUS_OPTIONS = Object.values(EventStatus).map(status => ({
  value: status,
  label: getEventStatusLabel(status)
}));

function getEventCategoryLabel(category: EventCategory): string {
  const labels: Record<EventCategory, string> = {
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
  return labels[category] || category;
}

function getEventStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    [EventStatus.SCHEDULED]: 'Scheduled',
    [EventStatus.CANCELLED]: 'Cancelled',
    [EventStatus.COMPLETED]: 'Completed',
    [EventStatus.POSTPONED]: 'Postponed'
  };
  return labels[status] || status;
}