import React, { useState, useMemo } from 'react';
import { Event, getEventCategoryDisplay, getEventStatusDisplay } from '../types/Event';
import EventCard from './EventCard';
import './EventList.css';

interface EventListProps {
  events: Event[];
  onEventSelect: (event: Event) => void;
  onEventUpdate: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
  onRsvpUpdate?: (event: Event) => void;
  loading?: boolean;
}

type SortOption = 'date-asc' | 'date-desc' | 'title' | 'category' | 'status';

const EventList: React.FC<EventListProps> = ({
  events,
  onEventSelect,
  onEventUpdate,
  onEventDelete,
  onRsvpUpdate,
  loading = false
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('date-asc');
  const [groupBy, setGroupBy] = useState<'none' | 'category' | 'status' | 'date'>('none');

  // Sort events
  const sortedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case 'date-desc':
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    return sorted;
  }, [events, sortBy]);

  // Group events
  const groupedEvents = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Events': sortedEvents };
    }

    const grouped: Record<string, Event[]> = {};
    
    sortedEvents.forEach(event => {
      let groupKey: string;
      
      switch (groupBy) {
        case 'category':
          groupKey = getEventCategoryDisplay(event.category);
          break;
        case 'status':
          groupKey = getEventStatusDisplay(event.status);
          break;
        case 'date':
          const eventDate = new Date(event.startTime);
          const today = new Date();
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          const weekFromNow = new Date(today);
          weekFromNow.setDate(today.getDate() + 7);
          
          if (eventDate.toDateString() === today.toDateString()) {
            groupKey = 'Today';
          } else if (eventDate.toDateString() === tomorrow.toDateString()) {
            groupKey = 'Tomorrow';
          } else if (eventDate < weekFromNow && eventDate > today) {
            groupKey = 'This Week';
          } else if (eventDate < today) {
            groupKey = 'Past Events';
          } else {
            groupKey = 'Upcoming';
          }
          break;
        default:
          groupKey = 'All Events';
      }
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(event);
    });
    
    return grouped;
  }, [sortedEvents, groupBy]);

  const formatEventTime = (event: Event) => {
    const startTime = new Date(event.startTime);
    const endTime = event.endTime ? new Date(event.endTime) : null;
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    if (endTime) {
      return `${startTime.toLocaleTimeString('en-US', timeOptions)} - ${endTime.toLocaleTimeString('en-US', timeOptions)}`;
    }
    
    return startTime.toLocaleTimeString('en-US', timeOptions);
  };

  if (loading) {
    return (
      <div className="event-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading events...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="event-list-empty">
        <div className="empty-state">
          <h3>No Events Found</h3>
          <p>There are currently no events to display. Try adjusting your filters or create a new event.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-list">
      {/* List Controls */}
      <div className="list-controls">
        <div className="sort-controls">
          <label htmlFor="sort-select">Sort by:</label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="control-select"
          >
            <option value="date-asc">Date (Earliest First)</option>
            <option value="date-desc">Date (Latest First)</option>
            <option value="title">Title (A-Z)</option>
            <option value="category">Category</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="group-controls">
          <label htmlFor="group-select">Group by:</label>
          <select
            id="group-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            className="control-select"
          >
            <option value="none">No Grouping</option>
            <option value="date">Date</option>
            <option value="category">Category</option>
            <option value="status">Status</option>
          </select>
        </div>

        <div className="list-stats">
          <span>{events.length} event{events.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Events List */}
      <div className="events-container">
        {Object.entries(groupedEvents).map(([groupName, groupEvents]) => (
          <div key={groupName} className="event-group">
            {groupBy !== 'none' && (
              <div className="group-header">
                <h3 className="group-title">{groupName}</h3>
                <span className="group-count">
                  {groupEvents.length} event{groupEvents.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
            
            <div className="events-grid">
              {groupEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onSelect={() => onEventSelect(event)}
                  onUpdate={onEventUpdate}
                  onDelete={onEventDelete}
                  onRsvpUpdate={onRsvpUpdate}
                  showDate={true}
                  showTime={true}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventList;