import React, { useState, useEffect } from 'react';
import { eventAPI } from '../services/eventApi';
import { Event, EventRsvp, RsvpResponse, getRsvpResponseDisplay } from '../types/Event';
import './EventRsvpManager.css';

interface EventRsvpManagerProps {
  event: Event;
  onRsvpUpdate?: (event: Event) => void;
  showGuestInput?: boolean;
  showNotesInput?: boolean;
}

const EventRsvpManager: React.FC<EventRsvpManagerProps> = ({
  event,
  onRsvpUpdate,
  showGuestInput = true,
  showNotesInput = true
}) => {
  const [currentRsvp, setCurrentRsvp] = useState<EventRsvp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRsvpForm, setShowRsvpForm] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [notes, setNotes] = useState('');

  // Load user's current RSVP
  useEffect(() => {
    loadUserRsvp();
  }, [event.id]);

  const loadUserRsvp = async () => {
    try {
      const response = await eventAPI.getUserRsvp(event.id);
      if (response.data && !('message' in response.data)) {
        const rsvp = response.data as EventRsvp;
        setCurrentRsvp(rsvp);
        setGuestCount(rsvp.guestCount || 0);
        setNotes(rsvp.notes || '');
      }
    } catch (error) {
      // User hasn't RSVP'd yet, which is fine
      setCurrentRsvp(null);
    }
  };

  const handleRsvpSubmit = async (response: RsvpResponse) => {
    try {
      setLoading(true);
      setError(null);

      await eventAPI.createOrUpdateRsvp(event.id, {
        response,
        guestCount: showGuestInput ? guestCount : 0,
        notes: showNotesInput ? notes.trim() || undefined : undefined
      });

      // Refresh event data to get updated summary
      const updatedEvent = await eventAPI.getEvent(event.id);
      
      // Update local state
      await loadUserRsvp();
      
      // Notify parent component
      if (onRsvpUpdate) {
        onRsvpUpdate(updatedEvent.data);
      }

      setShowRsvpForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update RSVP');
    } finally {
      setLoading(false);
    }
  };

  const handleRsvpDelete = async () => {
    try {
      setLoading(true);
      setError(null);

      await eventAPI.deleteRsvp(event.id);

      // Refresh event data
      const updatedEvent = await eventAPI.getEvent(event.id);
      
      // Clear local state
      setCurrentRsvp(null);
      setGuestCount(0);
      setNotes('');
      
      // Notify parent component
      if (onRsvpUpdate) {
        onRsvpUpdate(updatedEvent.data);
      }

      setShowRsvpForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove RSVP');
    } finally {
      setLoading(false);
    }
  };

  const isEventPast = () => {
    return new Date(event.startTime) < new Date();
  };

  const canUserRsvp = () => {
    if (isEventPast()) return false;
    if (event.status !== 'SCHEDULED') return false;
    
    // Check if event is at capacity (only if max attendees is set)
    if (event.maxAttendees && event.rsvpSummary) {
      const isAtCapacity = event.rsvpSummary.totalAttendees >= event.maxAttendees;
      // Allow current user to change their RSVP even if at capacity
      return !isAtCapacity || currentRsvp !== null;
    }
    
    return true;
  };

  const getRsvpButtonStyle = (response: RsvpResponse) => {
    const baseStyle = 'rsvp-btn';
    const isSelected = currentRsvp?.response === response;
    
    switch (response) {
      case RsvpResponse.YES:
        return `${baseStyle} yes ${isSelected ? 'selected' : ''}`;
      case RsvpResponse.MAYBE:
        return `${baseStyle} maybe ${isSelected ? 'selected' : ''}`;
      case RsvpResponse.NO:
        return `${baseStyle} no ${isSelected ? 'selected' : ''}`;
      default:
        return baseStyle;
    }
  };

  if (isEventPast()) {
    return (
      <div className="rsvp-manager past">
        <div className="rsvp-summary">
          <h4>📊 Final Attendance</h4>
          {event.rsvpSummary && (
            <div className="rsvp-stats">
              <span className="stat">✅ {event.rsvpSummary.yesCount} attended</span>
              <span className="stat">❓ {event.rsvpSummary.maybeCount} maybe</span>
              <span className="stat">❌ {event.rsvpSummary.noCount} declined</span>
            </div>
          )}
        </div>
        {currentRsvp && (
          <div className="user-rsvp-status">
            <span>Your RSVP: {getRsvpResponseDisplay(currentRsvp.response)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rsvp-manager">
      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* RSVP Summary */}
      {event.rsvpSummary && (
        <div className="rsvp-summary">
          <h4>📊 RSVP Status</h4>
          <div className="rsvp-stats">
            <div className="stat-item">
              <span className="stat-count yes">{event.rsvpSummary.yesCount}</span>
              <span className="stat-label">Going</span>
            </div>
            <div className="stat-item">
              <span className="stat-count maybe">{event.rsvpSummary.maybeCount}</span>
              <span className="stat-label">Maybe</span>
            </div>
            <div className="stat-item">
              <span className="stat-count no">{event.rsvpSummary.noCount}</span>
              <span className="stat-label">Can't Go</span>
            </div>
          </div>
          <div className="total-attending">
            <strong>{event.rsvpSummary.totalAttendees} people attending</strong>
            {event.maxAttendees && (
              <span className="capacity">
                ({event.maxAttendees - event.rsvpSummary.totalAttendees} spots left)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Current User's RSVP Status */}
      {currentRsvp ? (
        <div className="current-rsvp">
          <div className="rsvp-status">
            <h4>Your RSVP</h4>
            <div className="rsvp-details">
              <span className={`status ${currentRsvp.response.toLowerCase()}`}>
                {getRsvpResponseDisplay(currentRsvp.response)}
              </span>
              {currentRsvp.guestCount > 0 && (
                <span className="guest-count">+{currentRsvp.guestCount} guests</span>
              )}
            </div>
            {currentRsvp.notes && (
              <div className="rsvp-notes">
                <strong>Your note:</strong> {currentRsvp.notes}
              </div>
            )}
          </div>
          
          {canUserRsvp() && (
            <div className="rsvp-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowRsvpForm(!showRsvpForm)}
                disabled={loading}
              >
                Change RSVP
              </button>
              <button 
                className="btn btn-outline"
                onClick={handleRsvpDelete}
                disabled={loading}
              >
                Remove RSVP
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="no-rsvp">
          {canUserRsvp() ? (
            <div>
              <p>You haven't responded to this event yet.</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowRsvpForm(true)}
                disabled={loading}
              >
                RSVP Now
              </button>
            </div>
          ) : (
            <div className="rsvp-unavailable">
              <p>RSVP is no longer available for this event.</p>
            </div>
          )}
        </div>
      )}

      {/* RSVP Form */}
      {showRsvpForm && canUserRsvp() && (
        <div className="rsvp-form">
          <h4>Update Your RSVP</h4>
          
          {/* Response Options */}
          <div className="rsvp-options">
            <button
              className={getRsvpButtonStyle(RsvpResponse.YES)}
              onClick={() => handleRsvpSubmit(RsvpResponse.YES)}
              disabled={loading}
            >
              ✅ I'm Going
            </button>
            <button
              className={getRsvpButtonStyle(RsvpResponse.MAYBE)}
              onClick={() => handleRsvpSubmit(RsvpResponse.MAYBE)}
              disabled={loading}
            >
              ❓ Maybe
            </button>
            <button
              className={getRsvpButtonStyle(RsvpResponse.NO)}
              onClick={() => handleRsvpSubmit(RsvpResponse.NO)}
              disabled={loading}
            >
              ❌ Can't Go
            </button>
          </div>

          {/* Guest Count */}
          {showGuestInput && (
            <div className="form-group">
              <label htmlFor="guest-count">Number of Guests:</label>
              <select
                id="guest-count"
                value={guestCount}
                onChange={(e) => setGuestCount(Number(e.target.value))}
                className="guest-select"
              >
                {[0, 1, 2, 3, 4, 5].map(count => (
                  <option key={count} value={count}>
                    {count} {count === 1 ? 'guest' : 'guests'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          {showNotesInput && (
            <div className="form-group">
              <label htmlFor="rsvp-notes">Additional Notes (optional):</label>
              <textarea
                id="rsvp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requirements or comments..."
                maxLength={500}
                rows={3}
                className="notes-input"
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowRsvpForm(false)}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventRsvpManager;