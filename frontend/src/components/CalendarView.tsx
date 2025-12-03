import React, { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { Event, getEventCategoryDisplay, getEventStatusDisplay } from '../types/Event';
import EventCard from './EventCard';
import { getDateKey } from '../utils/dateUtils';
import 'react-datepicker/dist/react-datepicker.css';
import './CalendarView.css';

interface CalendarViewProps {
  events: Event[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onEventSelect: (event: Event) => void;
  onEventUpdate: (event: Event) => void;
  onEventDelete: (eventId: string) => void;
  onRsvpUpdate?: (event: Event) => void;
  onCreateEvent?: (date: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  selectedDate,
  onDateSelect,
  onEventSelect,
  onEventUpdate,
  onEventDelete,
  onRsvpUpdate,
  onCreateEvent
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Group events by date for highlighting in calendar
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    
    events.forEach(event => {
      const dateKey = getDateKey(event.startTime);
      if (dateKey) {
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      }
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

  // Helper function to get week range
  const getWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' });
    const year = startOfWeek.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startOfWeek.getDate()}-${endOfWeek.getDate()}, ${year}`;
    } else {
      return `${startMonth} ${startOfWeek.getDate()} - ${endMonth} ${endOfWeek.getDate()}, ${year}`;
    }
  };

  // Helper function to get all days in a week
  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
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
          {viewMode === 'month' && (
            <div className="datepicker-container">
              <DatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => date && onDateSelect(date)}
                inline
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
          )}

          {viewMode === 'week' && (
            <div className="week-view">
              <div className="week-header">
                <button 
                  className="nav-btn"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() - 7);
                    onDateSelect(newDate);
                  }}
                >
                  ← Previous Week
                </button>
                <h3>
                  {getWeekRange(selectedDate)}
                </h3>
                <button 
                  className="nav-btn"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() + 7);
                    onDateSelect(newDate);
                  }}
                >
                  Next Week →
                </button>
              </div>
              <div className="week-grid">
                {getWeekDays(selectedDate).map((day, index) => {
                  const dateKey = day.toDateString();
                  const dayEvents = eventsByDate[dateKey] || [];
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = day.toDateString() === selectedDate.toDateString();
                  
                  return (
                    <div 
                      key={index}
                      className={`week-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                      onClick={() => onDateSelect(day)}
                    >
                      <div className="day-header">
                        <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                        <span className="day-number">{day.getDate()}</span>
                      </div>
                      <div className="day-events">
                        {dayEvents.slice(0, 3).map(event => (
                          <div 
                            key={event.id}
                            className={`event-item ${event.category.toLowerCase()}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventSelect(event);
                            }}
                          >
                            <span className="event-time">
                              {new Date(event.startTime).toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true 
                              })}
                            </span>
                            <span className="event-title">{event.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="more-events">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'day' && (
            <div className="day-view">
              <div className="day-header">
                <button 
                  className="nav-btn"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() - 1);
                    onDateSelect(newDate);
                  }}
                >
                  ← Previous Day
                </button>
                <h3>{formatSelectedDate(selectedDate)}</h3>
                <button 
                  className="nav-btn"
                  onClick={() => {
                    const newDate = new Date(selectedDate);
                    newDate.setDate(newDate.getDate() + 1);
                    onDateSelect(newDate);
                  }}
                >
                  Next Day →
                </button>
              </div>
              <div className="day-timeline">
                {selectedDateEvents.length === 0 ? (
                  <div className="no-events">
                    <p>No events scheduled for this day</p>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => onCreateEvent && onCreateEvent(selectedDate)}
                    >
                      Create Event
                    </button>
                  </div>
                ) : (
                  <div className="events-timeline">
                    {selectedDateEvents
                      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                      .map(event => (
                        <div 
                          key={event.id}
                          className="timeline-event"
                          onClick={() => onEventSelect(event)}
                        >
                          <div className="event-time">
                            {new Date(event.startTime).toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                            {event.endTime && (
                              <span className="end-time">
                                - {new Date(event.endTime).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })}
                              </span>
                            )}
                          </div>
                          <div className="event-details">
                            <h4 className="event-title">{event.title}</h4>
                            {event.description && (
                              <p className="event-description">{event.description}</p>
                            )}
                            {event.location && (
                              <p className="event-location">
                                <span className="location-icon">📍</span>
                                <span className="location-text">{event.location}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

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
                    onClick={() => onCreateEvent && onCreateEvent(selectedDate)}
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
                      onRsvpUpdate={onRsvpUpdate}
                      compact={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CalendarView;