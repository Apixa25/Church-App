import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { eventAPI } from '../services/eventApi';
import { Event, EventCategory, EventStatus } from '../types/Event';
import { useActiveContext } from '../contexts/ActiveContextContext';
import CalendarView from './CalendarView';
import EventList from './EventList';
import EventCreateForm from './EventCreateForm';
import webSocketService, { EventUpdate, EventRsvpUpdate } from '../services/websocketService';
import LoadingSpinner from './LoadingSpinner';
import './CalendarPage.css';

interface CalendarPageProps {}

const CalendarPage: React.FC<CalendarPageProps> = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeOrganizationId } = useActiveContext();
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

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const eventsQueryKey = useMemo(() =>
    ['events', activeOrganizationId || 'all', filters.category, filters.status, debouncedSearch],
    [activeOrganizationId, filters.category, filters.status, debouncedSearch]
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
          size: 100,
        });
        return response.data.events as Event[];
      }
      const response = await eventAPI.getEvents({
        page: 0,
        size: 100,
        category: filters.category || undefined,
        status: filters.status || undefined,
        organizationId: activeOrganizationId || undefined,
      });
      return response.data.events as Event[];
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const error = queryError ? 'Failed to load events' : null;

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        if (!webSocketService.isWebSocketConnected()) {
          await webSocketService.connect();
        }

        const eventUnsubscribe = await webSocketService.subscribeToEventUpdates((update: EventUpdate) => {
          queryClient.invalidateQueries({ queryKey: ['events'] });
        });

        const rsvpUnsubscribe = webSocketService.subscribeToRsvpUpdates((update: EventRsvpUpdate) => {
          queryClient.invalidateQueries({ queryKey: ['events'] });
        });

        return () => {
          eventUnsubscribe();
          rsvpUnsubscribe();
        };
      } catch (error) {
        console.error('Failed to connect WebSocket for events:', error);
      }
    };

    connectWebSocket();

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      await eventAPI.deleteEvent(eventId);
      queryClient.setQueryData<Event[]>(eventsQueryKey, (old) =>
        old ? old.filter(e => e.id !== eventId) : old
      );
    } catch (error: any) {
      console.error('Failed to delete event:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete event';
      alert(`Failed to delete event: ${errorMessage}`);
    }
  };

  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

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
          <p>Manage and view events</p>
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
                {category.replace(/_/g, ' ')}
              </option>
            ))}
          </select>

          {/* All Status selector - Hidden on mobile, visible on desktop */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select filter-select-status"
          >
            <option value="">All Status</option>
            {Object.values(EventStatus).map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

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

export default CalendarPage;