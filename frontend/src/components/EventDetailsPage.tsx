import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { eventAPI } from '../services/eventApi';
import { Event, EventBringItem } from '../types/Event';
import { useAuth } from '../contexts/AuthContext';
import { formatEventDate, formatEventTime, formatEventDuration } from '../utils/dateUtils';
import EventRsvpManager from './EventRsvpManager';
import EventBringListSection from './EventBringListSection';
import LoadingSpinner from './LoadingSpinner';
import './EventDetailsPage.css';

const EventDetailsPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      setRefreshing(true);
      const response = await eventAPI.getEvent(eventId);
      setEvent(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch event details', err);
      setError(err.response?.data?.error || 'Unable to load this event right now.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const canManageBringList = useMemo(() => {
    if (!event || !user) return false;
    if (event.creatorId === user.userId) {
      return true;
    }
    return user.role === 'PLATFORM_ADMIN' || user.role === 'MODERATOR';
  }, [event, user]);

  const handleBringItemsUpdated = (items: EventBringItem[]) => {
    setEvent(prev => (prev ? { ...prev, bringItems: items } : prev));
  };

  if (!eventId) {
    return (
      <div className="event-details-page">
        <div className="event-details-card">
          <p>We couldn’t find that event.</p>
          <button className="btn btn-secondary" onClick={() => navigate('/calendar')}>
            Back to calendar
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="event-details-page">
        <div className="event-details-card loading">
          <LoadingSpinner type="multi-ring" size="medium" text="Loading event details..." />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="event-details-page">
        <div className="event-details-card error">
          <h2>Unable to load event</h2>
          <p>{error}</p>
          <div className="actions">
            <button className="btn btn-secondary" onClick={() => navigate('/calendar')}>
              Back to calendar
            </button>
            <button className="btn btn-primary" onClick={fetchEvent}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="event-details-page">
      <div className="event-details-card">
        <div className="page-header">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="header-main">
            <h1>{event.title}</h1>
            <p className="event-meta">
              {formatEventDate(event.startTime)} · {formatEventTime(event.startTime)}
              {event.endTime && ` – ${formatEventTime(event.endTime)}`}
              {formatEventDuration(event.startTime, event.endTime) &&
                ` (${formatEventDuration(event.startTime, event.endTime)})`}
            </p>
            {event.location && (
              <p className="event-location">
                <span className="location-icon">📍</span>
                <span className="location-text">{event.location}</span>
              </p>
            )}
          </div>
          <div className="header-actions">
            <button className="btn btn-primary btn-sm" onClick={fetchEvent} disabled={refreshing}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/calendar')}
            >
              Calendar
            </button>
          </div>
        </div>

        {event.description && (
          <div className="event-description">
            <h3>About this event</h3>
            <p>{event.description}</p>
          </div>
        )}

        <div className="event-meta-grid">
          <div className="meta-card">
            <h4>Hosted by</h4>
            <p>{event.creatorName}</p>
          </div>
          <div className="meta-card">
            <h4>Category</h4>
            <p>{event.category.replace(/_/g, ' ')}</p>
          </div>
          <div className="meta-card">
            <h4>Event status</h4>
            <p>{event.status.replace(/_/g, ' ')}</p>
          </div>
          {event.maxAttendees && (
            <div className="meta-card">
              <h4>Capacity</h4>
              <p>{event.maxAttendees} attendees</p>
            </div>
          )}
          {event.rsvpSummary && (
            <div className="meta-card">
              <h4>RSVP progress</h4>
              <p>
                ✅ {event.rsvpSummary.yesCount} · ❓ {event.rsvpSummary.maybeCount} · ❌{' '}
                {event.rsvpSummary.noCount}
              </p>
              <p className="meta-subtext">{event.rsvpSummary.totalAttendees} planning to attend</p>
            </div>
          )}
        </div>

        <div className="event-rsvp-manager">
          <EventRsvpManager
            event={event}
            onRsvpUpdate={(updated) => setEvent(updated)}
            showGuestInput={true}
            showNotesInput={true}
          />
        </div>

        <EventBringListSection
          eventId={eventId}
          bringListEnabled={event.bringListEnabled}
          initialItems={event.bringItems}
          canManageList={canManageBringList}
          onItemsUpdated={handleBringItemsUpdated}
          eventTitle={event.title}
        />
      </div>
    </div>
  );
};

export default EventDetailsPage;

