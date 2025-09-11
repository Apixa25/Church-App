import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventAPI } from '../services/eventApi';
import { Event, EventCategory, EventStatus } from '../types/Event';
import CalendarView from './CalendarView';
import EventList from './EventList';
import EventCreateForm from './EventCreateForm';
import webSocketService, { EventUpdate, EventRsvpUpdate } from '../services/websocketService';
import './CalendarPage.css';

interface CalendarPageProps {}

const CalendarPage: React.FC<CalendarPageProps> = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: ''
  });

  // Load events
  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await eventAPI.getEvents({
        page: 0,
        size: 100, // Load more events for calendar view
        category: filters.category || undefined,
        status: filters.status || undefined
      });
      
      setEvents(response.data.events);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Search events
  const searchEvents = async (query: string) => {
    if (!query.trim()) {
      loadEvents();
      return;
    }

    try {
      setLoading(true);
      const response = await eventAPI.searchEvents({
        query: query.trim(),
        page: 0,
        size: 100
      });
      setEvents(response.data.events);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search events');
    } finally {
      setLoading(false);
    }
  };

  // Load events on mount and when filters change
  useEffect(() => {
    if (filters.search) {
      const debounceTimer = setTimeout(() => {
        searchEvents(filters.search);
      }, 500);
      return () => clearTimeout(debounceTimer);
    } else {
      loadEvents();
    }
  }, [filters]);

  // WebSocket subscriptions for real-time updates
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        if (!webSocketService.isWebSocketConnected()) {
          await webSocketService.connect();
        }

        // Subscribe to event updates
        const eventUnsubscribe = webSocketService.subscribeToEventUpdates((update: EventUpdate) => {
          console.log('Received event update:', update);
          
          // Refresh events when there's an update
          loadEvents();
          
          // Show notification (optional)
          if (update.type === 'event_created') {
            // Could show toast notification here
          }
        });

        // Subscribe to RSVP updates
        const rsvpUnsubscribe = webSocketService.subscribeToRsvpUpdates((update: EventRsvpUpdate) => {
          console.log('Received RSVP update:', update);
          
          // Refresh events to get updated RSVP counts
          loadEvents();
        });

        // Cleanup function
        return () => {
          eventUnsubscribe();
          rsvpUnsubscribe();
        };
      } catch (error) {
        console.error('Failed to connect WebSocket for events:', error);
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      // WebSocket subscriptions will be cleaned up automatically
    };
  }, []);

  const handleEventCreated = (newEvent: Event) => {
    setEvents(prev => [newEvent, ...prev]);
    setShowCreateForm(false);
  };

  const handleEventUpdated = (updatedEvent: Event) => {
    setEvents(prev => 
      prev.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      )
    );
  };

  const handleEventDeleted = (eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
  };

  const handleFilterChange = (filterType: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  if (loading && events.length === 0) {
    return (
      <div className="calendar-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar-header">
        <div className="header-title">
          <h1>Calendar & Events</h1>
          <p>Manage and view church events</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + Create Event
          </button>
        </div>
      </div>

      {/* Filters and View Toggle */}
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

          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            {Object.values(EventStatus).map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
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
          <button onClick={loadEvents} className="btn btn-secondary">
            Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="calendar-content">
        {view === 'calendar' ? (
          <CalendarView
            events={events}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onEventSelect={(event) => navigate(`/events/${event.id}`)}
            onEventUpdate={handleEventUpdated}
            onEventDelete={handleEventDeleted}
          />
        ) : (
          <EventList
            events={events}
            onEventSelect={(event) => navigate(`/events/${event.id}`)}
            onEventUpdate={handleEventUpdated}
            onEventDelete={handleEventDeleted}
            loading={loading}
          />
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <EventCreateForm
              onSuccess={handleEventCreated}
              onCancel={() => setShowCreateForm(false)}
              initialDate={selectedDate}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;