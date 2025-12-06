import React, { useState } from 'react';
import { Event, getEventCategoryDisplay, getEventStatusDisplay, getRsvpResponseDisplay } from '../types/Event';
import { eventAPI } from '../services/eventApi';
import EventRsvpManager from './EventRsvpManager';
import { formatEventDate, formatEventTime, formatEventDuration, isEventPast, formatAnnouncementDate } from '../utils/dateUtils';
import './EventCard.css';

interface EventCardProps {
  event: Event;
  onSelect: () => void;
  onUpdate: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onRsvpUpdate?: (event: Event) => void;
  compact?: boolean;
  showDate?: boolean;
  showTime?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelect,
  onUpdate,
  onDelete,
  onRsvpUpdate,
  compact = false,
  showDate = true,
  showTime = true
}) => {
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [showRsvpManager, setShowRsvpManager] = useState(false);

  // Use centralized date utilities for consistent parsing

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

  // Use centralized isEventPast utility

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
      className={`event-card ${compact ? 'compact' : ''} ${isEventPast(event.startTime) ? 'past' : ''} ${isEventToday() ? 'today' : ''}`}
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
            <button 
              type="button"
              className="action-btn" 
              title="Edit Event"
              onClick={() => onUpdate(event)}
            >
              ✏️
            </button>
            <button 
              type="button"
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
              {formatEventDuration(event.startTime, event.endTime) && ` (${formatEventDuration(event.startTime, event.endTime)})`}
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

        {event.bringListEnabled && (
          <div className="detail-item">
            <span className="detail-icon">🧺</span>
            <span className="detail-text">Community bring-list available</span>
          </div>
        )}
      </div>

      {/* Creator Info */}
      {!compact && (
        <div className="event-creator">
          <div className="creator-info">
            {event.creatorProfilePicUrl ? (
              <img 
                src={event.creatorProfilePicUrl} 
                alt={event.creatorName}
                className="creator-avatar"
                onError={(e) => {
                  console.warn('Failed to load creator profile picture:', event.creatorProfilePicUrl, 'for event:', event.id);
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="creator-avatar creator-avatar-placeholder">
                {event.creatorName ? event.creatorName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <span className="creator-name">By {event.creatorName}</span>
          </div>
          <span className="event-date-created">
            {formatAnnouncementDate(event.createdAt)}
          </span>
        </div>
      )}

      {/* RSVP Section */}
      {event.rsvpSummary && (
        <div
          className={`event-rsvp ${compact ? 'compact' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
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

          {!isEventPast(event.startTime) && (
            <div className={`rsvp-actions ${compact ? 'compact' : ''}`}>
              <button
                type="button"
                className={`btn btn-primary ${compact ? 'btn-xs' : ''}`}
                onClick={() => setShowRsvpManager(!showRsvpManager)}
              >
                {event.rsvpSummary.userRsvpResponse ? 'Manage RSVP' : 'RSVP Now'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Full RSVP Manager (when expanded) */}
      {showRsvpManager && (
        <div onClick={(e) => e.stopPropagation()}>
          <EventRsvpManager
            event={event}
            onRsvpUpdate={onRsvpUpdate || onUpdate}
            showGuestInput={true}
            showNotesInput={true}
          />
        </div>
      )}
    </div>
  );
};

export default EventCard;