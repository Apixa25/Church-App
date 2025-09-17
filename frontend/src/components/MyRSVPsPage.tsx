import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventAPI } from '../services/eventApi';
import { EventRsvp, RsvpResponse, getRsvpResponseDisplay } from '../types/Event';
import './MyRSVPsPage.css';

const MyRSVPsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rsvps, setRsvps] = useState<EventRsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [responseFilter, setResponseFilter] = useState<'all' | RsvpResponse>('all');

  // Load user's RSVPs
  const loadRSVPs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use different API based on current filter
      let response;
      if (filter === 'upcoming') {
        // Use dedicated upcoming API that only returns YES responses for future events
        response = await eventAPI.getUserUpcomingRsvps();
      } else {
        // Use general API for all RSVPs (past, all)
        response = await eventAPI.getUserRsvps();
      }
      
      setRsvps(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load your RSVPs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRSVPs();
  }, [filter]); // Reload when filter changes

  // Filter RSVPs based on current filters
  const filteredRSVPs = rsvps.filter(rsvp => {
    // For 'upcoming' filter, the API already returns only future YES responses
    // So we only need to apply response filter if it's not 'all'
    if (filter === 'upcoming') {
      // The upcoming API already filters for future events and YES responses
      // Only apply additional response filter if user wants to see specific responses
      if (responseFilter !== 'all' && rsvp.response !== responseFilter) return false;
      return true;
    }

    // For 'past' and 'all' filters, apply time-based filtering
    const now = new Date();
    const eventDate = new Date(rsvp.eventStartTime);
    const isUpcoming = eventDate > now;
    const isPast = eventDate <= now;

    // Time filter
    if (filter === 'past' && !isPast) return false;
    if (filter === 'all') {
      // 'all' shows everything, so no time filtering needed
    }

    // Response filter
    if (responseFilter !== 'all' && rsvp.response !== responseFilter) return false;

    return true;
  });

  // Sort RSVPs: upcoming by date ascending, past by date descending
  const sortedRSVPs = [...filteredRSVPs].sort((a, b) => {
    const dateA = new Date(a.eventStartTime);
    const dateB = new Date(b.eventStartTime);
    
    if (filter === 'upcoming') {
      return dateA.getTime() - dateB.getTime();
    } else if (filter === 'past') {
      return dateB.getTime() - dateA.getTime();
    } else {
      // For 'all', show upcoming first, then past
      const now = new Date();
      const aIsUpcoming = dateA > now;
      const bIsUpcoming = dateB > now;
      
      if (aIsUpcoming && !bIsUpcoming) return -1;
      if (!aIsUpcoming && bIsUpcoming) return 1;
      
      return aIsUpcoming 
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getResponseIcon = (response: RsvpResponse) => {
    switch (response) {
      case RsvpResponse.YES: return '✅';
      case RsvpResponse.NO: return '❌';
      case RsvpResponse.MAYBE: return '❓';
      default: return '📅';
    }
  };

  const getResponseColor = (response: RsvpResponse) => {
    switch (response) {
      case RsvpResponse.YES: return 'rsvp-yes';
      case RsvpResponse.NO: return 'rsvp-no';
      case RsvpResponse.MAYBE: return 'rsvp-maybe';
      default: return 'rsvp-default';
    }
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const handleUpdateRSVP = async (eventId: string, newResponse: RsvpResponse) => {
    try {
      await eventAPI.createOrUpdateRsvp(eventId, {
        response: newResponse,
        guestCount: 0
      });
      
      // Reload RSVPs to get updated data
      await loadRSVPs();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update RSVP');
    }
  };

  if (loading) {
    return (
      <div className="my-rsvps-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-rsvps-page">
      <header className="my-rsvps-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🎫 My Events</h1>
            <p>Events you've RSVP'd to</p>
          </div>
          <div className="header-actions">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="back-home-button"
            >
              🏠 Back Home
            </button>
            <button 
              onClick={() => navigate('/calendar')} 
              className="view-calendar-button"
            >
              📅 View All Events
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button 
            className="error-close"
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rsvp-filters">
        <div className="filter-group">
          <label>Event Filter:</label>
          <div className="filter-buttons">
            <button 
              className={filter === 'upcoming' ? 'active' : ''}
              onClick={() => setFilter('upcoming')}
            >
              🔮 Attending
            </button>
            <button 
              className={filter === 'past' ? 'active' : ''}
              onClick={() => setFilter('past')}
            >
              📚 Past
            </button>
            <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              📋 All
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>Response:</label>
          <div className="filter-buttons">
            <button 
              className={responseFilter === 'all' ? 'active' : ''}
              onClick={() => setResponseFilter('all')}
            >
              📋 All
            </button>
            <button 
              className={responseFilter === RsvpResponse.YES ? 'active' : ''}
              onClick={() => setResponseFilter(RsvpResponse.YES)}
            >
              ✅ Attending
            </button>
            <button 
              className={responseFilter === RsvpResponse.MAYBE ? 'active' : ''}
              onClick={() => setResponseFilter(RsvpResponse.MAYBE)}
            >
              ❓ Maybe
            </button>
            <button 
              className={responseFilter === RsvpResponse.NO ? 'active' : ''}
              onClick={() => setResponseFilter(RsvpResponse.NO)}
            >
              ❌ Not Attending
            </button>
          </div>
        </div>
      </div>

      {/* RSVPs List */}
      <main className="rsvps-content">
        {sortedRSVPs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎫</div>
            <h3>No events found</h3>
            <p>
              {filter === 'upcoming' 
                ? "You don't have any upcoming events. Check out the calendar to find events to attend!"
                : filter === 'past'
                ? "You haven't attended any past events yet."
                : "You haven't RSVP'd to any events yet."
              }
            </p>
            <button 
              onClick={() => navigate('/calendar')}
              className="btn btn-primary"
            >
              📅 Browse Events
            </button>
          </div>
        ) : (
          <div className="rsvps-list">
            {sortedRSVPs.map((rsvp) => (
              <div key={`${rsvp.eventId}-${rsvp.timestamp}`} className="rsvp-card">
                <div className="rsvp-header">
                  <div className="event-info">
                    <h3 
                      className="event-title clickable"
                      onClick={() => handleEventClick(rsvp.eventId)}
                    >
                      {rsvp.eventTitle}
                    </h3>
                    <div className="event-details">
                      <span className="event-date">📅 {formatDate(rsvp.eventStartTime)}</span>
                      {rsvp.eventLocation && (
                        <span className="event-location">📍 {rsvp.eventLocation}</span>
                      )}
                    </div>
                  </div>
                  <div className={`rsvp-status ${getResponseColor(rsvp.response)}`}>
                    <span className="rsvp-icon">{getResponseIcon(rsvp.response)}</span>
                    <span className="rsvp-text">{getRsvpResponseDisplay(rsvp.response)}</span>
                  </div>
                </div>

                {rsvp.guestCount > 0 && (
                  <div className="rsvp-details">
                    <span className="guest-count">👥 {rsvp.guestCount} guest{rsvp.guestCount !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {rsvp.notes && (
                  <div className="rsvp-notes">
                    <span className="notes-label">📝 Notes:</span>
                    <span className="notes-text">{rsvp.notes}</span>
                  </div>
                )}

                <div className="rsvp-actions">
                  <button 
                    onClick={() => handleEventClick(rsvp.eventId)}
                    className="btn btn-secondary"
                  >
                    👁️ View Event
                  </button>
                  
                  {/* Quick RSVP update for upcoming events */}
                  {new Date(rsvp.eventStartTime) > new Date() && (
                    <div className="quick-rsvp">
                      <span className="quick-rsvp-label">Quick update:</span>
                      <div className="quick-rsvp-buttons">
                        {rsvp.response !== RsvpResponse.YES && (
                          <button 
                            onClick={() => handleUpdateRSVP(rsvp.eventId, RsvpResponse.YES)}
                            className="btn btn-sm btn-success"
                          >
                            ✅ Yes
                          </button>
                        )}
                        {rsvp.response !== RsvpResponse.MAYBE && (
                          <button 
                            onClick={() => handleUpdateRSVP(rsvp.eventId, RsvpResponse.MAYBE)}
                            className="btn btn-sm btn-warning"
                          >
                            ❓ Maybe
                          </button>
                        )}
                        {rsvp.response !== RsvpResponse.NO && (
                          <button 
                            onClick={() => handleUpdateRSVP(rsvp.eventId, RsvpResponse.NO)}
                            className="btn btn-sm btn-danger"
                          >
                            ❌ No
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyRSVPsPage;
