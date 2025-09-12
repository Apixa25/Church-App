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
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
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
    // Close the edit form after successful update
    setEditingEvent(null);
    setShowCreateForm(false);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowCreateForm(true);
  };

  const handleEventDeleted = async (eventId: string) => {
    try {
      // Get current user info for debugging
      const currentUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
      const authToken = localStorage.getItem('authToken');
      
      console.log('🗑️ Deleting event:', eventId);
      console.log('👤 Current user details:', currentUser);
      console.log('🔑 Auth token exists:', !!authToken);
      console.log('🎫 Token preview:', authToken ? authToken.substring(0, 30) + '...' : 'No token');
      
      // Call backend API to delete the event
      await eventAPI.deleteEvent(eventId);
      
      console.log('✅ Event deleted successfully from backend');
      
      // Update frontend state to remove the event
      setEvents(prev => prev.filter(event => event.id !== eventId));
      
    } catch (error: any) {
      console.error('❌ Failed to delete event:', {
        eventId,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        errorData: error.response?.data,
        fullError: error
      });
      
      // Show specific error message if available
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
        <div className="header-top">
          <button 
            className="back-home-btn"
            onClick={() => navigate('/')}
            title="Back to Dashboard"
          >
            🏠 Back Home
          </button>
          <div className="header-title">
            <h1>📅 Calendar & Events</h1>
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
            onEventUpdate={handleEditEvent}
            onEventDelete={handleEventDeleted}
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