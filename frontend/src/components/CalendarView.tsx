import React, { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { Event, getEventCategoryDisplay, getEventStatusDisplay } from '../types/Event';
import EventCard from './EventCard';
import 'react-datepicker/dist/react-datepicker.css';
import './CalendarView.css';

interface CalendarViewProps {
  events: Event[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onEventSelect: (event: Event) => void;
  onEventUpdate: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  selectedDate,
  onDateSelect,
  onEventSelect,
  onEventUpdate,
  onEventDelete
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Group events by date for highlighting in calendar
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    
    events.forEach(event => {
      const dateKey = new Date(event.startTime).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    return grouped;
  }, [events]);

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    const dateKey = selectedDate.toDateString();
    return eventsByDate[dateKey] || [];
  }, [eventsByDate, selectedDate]);

  // Custom day content for calendar to show event indicators
  const renderDayContents = (day: number, date?: Date) => {
    if (!date) return <span>{day}</span>;
    
    const dateKey = date.toDateString();
    const dayEvents = eventsByDate[dateKey] || [];
    const hasEvents = dayEvents.length > 0;
    
    return (
      <div className="calendar-day-content">
        <span className="day-number">{day}</span>
        {hasEvents && (
          <div className="event-indicators">
            {dayEvents.slice(0, 3).map((event, index) => (
              <div
                key={event.id}
                className={`event-dot ${event.category.toLowerCase()}`}
                title={event.title}
              />
            ))}
            {dayEvents.length > 3 && (
              <div className="more-events">+{dayEvents.length - 3}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="calendar-view">
      <div className="calendar-container">
        {/* Calendar Controls */}
        <div className="calendar-controls">
          <div className="view-mode-toggle">
            <button
              className={`mode-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              className={`mode-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={`mode-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
          </div>
        </div>

        {/* Main Calendar */}
        <div className="calendar-main">
          <div className="datepicker-container">
            <DatePicker
              selected={selectedDate}
              onChange={onDateSelect}
              inline
              showWeekNumbers
              renderDayContents={renderDayContents}
              calendarClassName="custom-calendar"
              dayClassName={(date) => {
                const dateKey = date.toDateString();
                const hasEvents = eventsByDate[dateKey]?.length > 0;
                const isToday = date.toDateString() === new Date().toDateString();
                
                let className = 'calendar-day';
                if (hasEvents) className += ' has-events';
                if (isToday) className += ' today';
                
                return className;
              }}
            />
          </div>

          {/* Selected Date Events */}
          <div className="selected-date-events">
            <div className="selected-date-header">
              <h3>{formatSelectedDate(selectedDate)}</h3>
              <p>{selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''}</p>
            </div>

            <div className="events-list">
              {selectedDateEvents.length === 0 ? (
                <div className="no-events">
                  <p>No events scheduled for this date</p>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => {/* Open create event form with selected date */}}
                  >
                    Create Event
                  </button>
                </div>
              ) : (
                <div className="events-grid">
                  {selectedDateEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={() => onEventSelect(event)}
                      onUpdate={onEventUpdate}
                      onDelete={onEventDelete}
                      compact={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Legend */}
        <div className="calendar-legend">
          <h4>Event Categories</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-dot worship"></div>
              <span>Worship</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot bible_study"></div>
              <span>Bible Study</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot fellowship"></div>
              <span>Fellowship</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot youth"></div>
              <span>Youth</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot prayer"></div>
              <span>Prayer</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot general"></div>
              <span>Other</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;