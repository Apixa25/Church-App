import React, { useState } from 'react';
import { Event, getEventCategoryDisplay, getEventStatusDisplay, getRsvpResponseDisplay } from '../types/Event';
import { eventAPI } from '../services/eventApi';
import './EventCard.css';

interface EventCardProps {
  event: Event;
  onSelect: () => void;
  onUpdate: (event: Event) => void;
  onDelete: (eventId: string) => void;
  compact?: boolean;
  showDate?: boolean;
  showTime?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelect,
  onUpdate,
  onDelete,
  compact = false,
  showDate = true,
  showTime = true
}) => {
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatEventTime = (dateString: string) => {
    const time = new Date(dateString);
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatEventDuration = () => {
    if (!event.endTime) return '';
    
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // in minutes
    
    if (duration < 60) {
      return `${duration}min`;
    }
    
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    
    if (minutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${minutes}min`;
  };

  const getEventStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled': return '#48bb78';
      case 'cancelled': return '#f56565';
      case 'completed': return '#4299e1';
      case 'postponed': return '#ed8936';
      default: return '#718096';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'worship': return '#9f7aea';
      case 'bible_study': return '#48bb78';
      case 'prayer': return '#ed8936';
      case 'fellowship': return '#4299e1';
      case 'youth': return '#ed64a6';
      case 'children': return '#f6e05e';
      case 'outreach': return '#38b2ac';
      default: return '#718096';
    }
  };

  const isEventPast = () => {
    return new Date(event.startTime) < new Date();
  };

  const isEventToday = () => {
    const eventDate = new Date(event.startTime).toDateString();
    const today = new Date().toDateString();
    return eventDate === today;
  };

  const handleRsvpClick = async (response: 'YES' | 'NO' | 'MAYBE') => {
    try {
      setIsRsvpLoading(true);
      await eventAPI.createOrUpdateRsvp(event.id, {
        response: response as any,
        guestCount: 0,
        notes: ''
      });
      
      // Refresh event data to get updated RSVP summary
      const updatedEvent = await eventAPI.getEvent(event.id);
      onUpdate(updatedEvent.data);
    } catch (error: any) {
      console.error('Failed to RSVP:', error);
      // Could add toast notification here
    } finally {
      setIsRsvpLoading(false);
    }
  };

  return (
    <div 
      className={`event-card ${compact ? 'compact' : ''} ${isEventPast() ? 'past' : ''} ${isEventToday() ? 'today' : ''}`}
      onClick={onSelect}
    >
      {/* Event Header */}
      <div className="event-header">
        <div className="event-category">
          <span 
            className="category-badge"
            style={{ backgroundColor: getCategoryColor(event.category) }}
          >
            {getEventCategoryDisplay(event.category)}
          </span>
          <span 
            className="status-badge"
            style={{ color: getEventStatusColor(event.status) }}
          >
            {getEventStatusDisplay(event.status)}
          </span>
        </div>
        
        {!compact && (
          <div className="event-actions" onClick={(e) => e.stopPropagation()}>
            <button className="action-btn" title="Edit Event">
              ✏️
            </button>
            <button 
              className="action-btn delete"
              title="Delete Event"
              onClick={() => onDelete(event.id)}
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Event Title */}
      <div className="event-title">
        <h3>{event.title}</h3>
        {event.description && !compact && (
          <p className="event-description">{event.description}</p>
        )}
      </div>

      {/* Event Details */}
      <div className="event-details">
        {showDate && (
          <div className="detail-item">
            <span className="detail-icon">📅</span>
            <span className="detail-text">{formatEventDate(event.startTime)}</span>
          </div>
        )}
        
        {showTime && (
          <div className="detail-item">
            <span className="detail-icon">🕐</span>
            <span className="detail-text">
              {formatEventTime(event.startTime)}
              {event.endTime && ` - ${formatEventTime(event.endTime)}`}
              {formatEventDuration() && ` (${formatEventDuration()})`}
            </span>
          </div>
        )}
        
        {event.location && (
          <div className="detail-item">
            <span className="detail-icon">📍</span>
            <span className="detail-text">{event.location}</span>
          </div>
        )}

        {event.maxAttendees && (
          <div className="detail-item">
            <span className="detail-icon">👥</span>
            <span className="detail-text">
              Max {event.maxAttendees} attendees
            </span>
          </div>
        )}
      </div>

      {/* Creator Info */}
      {!compact && (
        <div className="event-creator">
          <div className="creator-info">
            {event.creatorProfilePicUrl && (
              <img 
                src={event.creatorProfilePicUrl} 
                alt={event.creatorName}
                className="creator-avatar"
              />
            )}
            <span className="creator-name">By {event.creatorName}</span>
          </div>
          <span className="event-date-created">
            {new Date(event.createdAt).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* RSVP Section */}
      {event.rsvpSummary && !compact && (
        <div className="event-rsvp" onClick={(e) => e.stopPropagation()}>
          <div className="rsvp-summary">
            <div className="rsvp-counts">
              <span className="rsvp-count yes">
                ✅ {event.rsvpSummary.yesCount}
              </span>
              <span className="rsvp-count maybe">
                ❓ {event.rsvpSummary.maybeCount}
              </span>
              <span className="rsvp-count no">
                ❌ {event.rsvpSummary.noCount}
              </span>
            </div>
            <div className="total-attendees">
              {event.rsvpSummary.totalAttendees} attending
            </div>
          </div>

          {!isEventPast() && (
            <div className="rsvp-actions">
              {event.rsvpSummary.userRsvpResponse ? (
                <div className="current-rsvp">
                  <span>Your RSVP: {getRsvpResponseDisplay(event.rsvpSummary.userRsvpResponse as any)}</span>
                </div>
              ) : (
                <div className="rsvp-buttons">
                  <button
                    className="rsvp-btn yes"
                    onClick={() => handleRsvpClick('YES')}
                    disabled={isRsvpLoading}
                  >
                    Going
                  </button>
                  <button
                    className="rsvp-btn maybe"
                    onClick={() => handleRsvpClick('MAYBE')}
                    disabled={isRsvpLoading}
                  >
                    Maybe
                  </button>
                  <button
                    className="rsvp-btn no"
                    onClick={() => handleRsvpClick('NO')}
                    disabled={isRsvpLoading}
                  >
                    Can't Go
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventCard;