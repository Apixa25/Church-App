import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventAPI } from '../services/eventApi';
import { Event, EventCategory, EventStatus, getEventCategoryDisplay } from '../types/Event';
import { useOrganization } from '../contexts/OrganizationContext';
import { useAuth } from '../contexts/AuthContext';
import CalendarView from './CalendarView';
import EventList from './EventList';
import EventCreateForm from './EventCreateForm';
import webSocketService, { EventUpdate, EventRsvpUpdate } from '../services/websocketService';
import LoadingSpinner from './LoadingSpinner';
import ChurchRequiredNotice from './ChurchRequiredNotice';
import './CalendarPage.css';

interface CalendarPageProps {}

const CalendarPage: React.FC<CalendarPageProps> = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { churchPrimary, loading: organizationsLoading } = useOrganization();
  const churchOrganizationId = churchPrimary?.organizationId;
  const canManageCalendar =
    user?.role === 'PLATFORM_ADMIN' ||
    user?.role === 'MODERATOR' ||
    churchPrimary?.role === 'ORG_ADMIN' ||
    churchPrimary?.role === 'MODERATOR';
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: ''
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const visibleRange = useMemo(() => formatVisibleRange(selectedDate), [selectedDate]);

  const eventsQueryKey = useMemo(() =>
    ['events', churchOrganizationId || 'none', filters.category, filters.status, debouncedSearch, visibleRange.start, visibleRange.end, canManageCalendar],
    [churchOrganizationId, filters.category, filters.status, debouncedSearch, visibleRange, canManageCalendar]
  );

  const {
    data: events = [],
    isLoading: loading,
    error: queryError,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: eventsQueryKey,
    queryFn: async () => {
      if (debouncedSearch.trim()) {
        const response = await eventAPI.searchEvents({
          query: debouncedSearch.trim(),
          page: 0,
          size: 500,
          organizationId: churchOrganizationId,
        });
        return response.data.events as Event[];
      }
      const response = await eventAPI.getEvents({
        page: 0,
        size: 500,
        category: filters.category || undefined,
        status: canManageCalendar ? (filters.status || undefined) : undefined,
        organizationId: churchOrganizationId,
        startDate: filters.category || filters.status ? undefined : visibleRange.start,
        endDate: filters.category || filters.status ? undefined : visibleRange.end,
      });
      return response.data.events as Event[];
    },
    enabled: !!churchOrganizationId,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const error = calendarErrorMessage(queryError);

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    let cancelled = false;
    let eventUnsubscribe = () => {};
    let rsvpUnsubscribe = () => {};

    const connectWebSocket = async () => {
      try {
        if (!webSocketService.isWebSocketConnected()) {
          await webSocketService.connect();
        }
        if (cancelled) return;

        eventUnsubscribe = await webSocketService.subscribeToEventUpdates((_update: EventUpdate) => {
          queryClient.invalidateQueries({ queryKey: ['events'] });
        });

        rsvpUnsubscribe = webSocketService.subscribeToRsvpUpdates((_update: EventRsvpUpdate) => {
          queryClient.invalidateQueries({ queryKey: ['events'] });
        });
      } catch (error) {
        console.error('Failed to connect WebSocket for events:', error);
      }
    };

    connectWebSocket();

    return () => {
      cancelled = true;
      eventUnsubscribe();
      rsvpUnsubscribe();
    };
  }, [queryClient]);

  const handleEventCreated = (newEvent: Event) => {
    queryClient.setQueryData<Event[]>(eventsQueryKey, (old) =>
      old ? [newEvent, ...old] : [newEvent]
    );
    setShowCreateForm(false);
  };

  const handleEventUpdated = (updatedEvent: Event) => {
    queryClient.setQueryData<Event[]>(eventsQueryKey, (old) =>
      old ? old.map(e => e.id === updatedEvent.id ? updatedEvent : e) : old
    );
    setEditingEvent(null);
    setShowCreateForm(false);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowCreateForm(true);
  };

  const handleRsvpUpdate = (updatedEvent: Event) => {
    queryClient.setQueryData<Event[]>(eventsQueryKey, (old) =>
      old ? old.map(e => e.id === updatedEvent.id ? updatedEvent : e) : old
    );
  };

  const handleEventDeleted = async (eventId: string) => {
    if (!window.confirm('Delete this event?')) {
      return;
    }
    try {
      setActionError(null);
      await eventAPI.deleteEvent(eventId);
      queryClient.setQueryData<Event[]>(eventsQueryKey, (old) =>
        old ? old.filter(e => e.id !== eventId) : old
      );
    } catch (deleteError: any) {
      console.error('Failed to delete event:', deleteError);
      const errorMessage = deleteError.response?.data?.error || deleteError.response?.data?.message || deleteError.message || 'Failed to delete event';
      setActionError(errorMessage);
    }
  };

  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  if (organizationsLoading && !churchPrimary) {
    return (
      <div className="calendar-page">
        <div className="loading-container">
          <LoadingSpinner type="multi-ring" size="medium" text="Loading your church..." />
        </div>
      </div>
    );
  }

  if (!churchPrimary) {
    return (
      <div className="calendar-page">
        <div className="page-top-nav">
          <button
            className="back-home-btn"
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
          >
            🏠 Back Home
          </button>
        </div>
        <ChurchRequiredNotice feature="The calendar" />
      </div>
    );
  }

  if (loading && events.length === 0) {
    return (
      <div className="calendar-page">
        <div className="loading-container">
          <LoadingSpinner type="multi-ring" size="medium" text="Loading events..." />
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      {/* Back Home Button - Desktop Only */}
      <div className="page-top-nav">
        <button
          className="back-home-btn"
          onClick={() => navigate('/dashboard')}
          title="Back to Dashboard"
        >
          🏠 Back Home
        </button>
      </div>

      {/* Calendar & Events Header with View Toggle */}
      <div className="calendar-header">
        <div className="header-title">
          <h1>🗓 Calendar & Events</h1>
          <p>Events for {churchPrimary.organizationName}</p>
          <div className="calendar-hero-pills" aria-label="Calendar highlights">
            <span>Shared church calendar</span>
            <span>Real-time updates</span>
            <span>RSVP friendly</span>
          </div>
        </div>
        <div className="view-toggle">
          <button
            className={`view-btn ${view === 'calendar' ? 'active' : ''}`}
            onClick={() => setView('calendar')}
          >
            📅 Calendar
          </button>
          <button
            className={`view-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            📋 List
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => refetchEvents()} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <div className="error-message">
          <p>{actionError}</p>
          <button onClick={() => setActionError(null)} className="btn btn-secondary">
            Dismiss
          </button>
        </div>
      )}

      {/* Filters Section - Above Month/Week/Day toggles */}
      <div className="calendar-controls">
        <div className="filters">
          <input
            type="text"
            placeholder="Search events..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="search-input"
          />
          
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {Object.values(EventCategory).map(category => (
              <option key={category} value={category}>
                {getEventCategoryDisplay(category)}
              </option>
            ))}
          </select>

          {canManageCalendar && (
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select filter-select-status"
          >
            <option value="">All Status</option>
            {Object.values(EventStatus).map(status => (
              <option key={status} value={status}>
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          )}

          {/* Create Event button - Mobile only */}
          <button
            className="create-event-btn-mobile"
            onClick={() => {
              setSelectedDate(new Date());
              setShowCreateForm(true);
            }}
          >
            Create Event
          </button>

          {/* Create Event button - Web/Desktop only */}
          <button
            className="create-event-btn-web"
            onClick={() => {
              setSelectedDate(new Date());
              setShowCreateForm(true);
            }}
          >
            Create Event
          </button>
        </div>
      </div>

      {/* 3. The Actual Calendar */}
      <div className="calendar-content">
        {view === 'calendar' ? (
          <CalendarView
            events={events}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEventSelect={(event) => navigate(`/events/${event.id}`)}
            onEventUpdate={handleEditEvent}
            onEventDelete={handleEventDeleted}
            onRsvpUpdate={handleRsvpUpdate}
            canManage={canManageCalendar}
            currentUserId={user?.userId}
            onCreateEvent={(date) => {
              setSelectedDate(date);
              setShowCreateForm(true);
            }}
          />
        ) : (
          <EventList
            events={events}
            onEventSelect={(event) => navigate(`/events/${event.id}`)}
            onEventUpdate={handleEditEvent}
            onEventDelete={handleEventDeleted}
            onRsvpUpdate={handleRsvpUpdate}
            canManage={canManageCalendar}
            currentUserId={user?.userId}
            loading={loading}
          />
        )}
      </div>

      {/* Create/Edit Event Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateForm(false);
          setEditingEvent(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <EventCreateForm
              onSuccess={editingEvent ? handleEventUpdated : handleEventCreated}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingEvent(null);
              }}
              initialDate={selectedDate}
              editEvent={editingEvent || undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function formatVisibleRange(selectedDate: Date) {
  const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1, 0, 0, 0, 0);
  const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 4, 0, 23, 59, 59, 0);
  const format = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };
  return { start: format(start), end: format(end) };
}

function calendarErrorMessage(queryError: unknown): string | null {
  if (!queryError) return null;
  const message = (queryError as { response?: { data?: { error?: string } } }).response?.data?.error || '';
  if (message.toLowerCase().includes('without an organization')) {
    return 'Join a church to see its calendar.';
  }
  return message || 'Failed to load events';
}

export default CalendarPage;