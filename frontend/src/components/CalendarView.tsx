import React, { useState, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { Event, getCalendarHomeLabel } from '../types/Event';
import CalendarHomeBadge from './CalendarHomeBadge';
import EventCard from './EventCard';
import { getDateKey, expandRecurringEvent, formatEventTime, parseEventDate } from '../utils/dateUtils';
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
  canManage?: boolean;
  managedOrganizationIds?: string[];
  currentUserId?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  selectedDate,
  onDateSelect,
  onEventSelect,
  onEventUpdate,
  onEventDelete,
  onRsvpUpdate,
  onCreateEvent,
  canManage = false,
  managedOrganizationIds = [],
  currentUserId
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Expand recurring events and group all events by date for highlighting in calendar
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    
    // Calculate view boundaries for recurring event expansion
    // Expand events for a wide range to cover calendar navigation
    const viewStart = new Date(selectedDate);
    viewStart.setMonth(viewStart.getMonth() - 1); // 1 month before
    const viewEnd = new Date(selectedDate);
    viewEnd.setMonth(viewEnd.getMonth() + 3); // 3 months ahead
    
    // Expand all events (recurring events will be expanded, non-recurring will remain as-is)
    const expandedEvents: Event[] = [];
    events.forEach(event => {
      if (event.isRecurring && event.recurrenceType) {
        // Expand recurring events into multiple instances
        const instances = expandRecurringEvent(event, viewStart, viewEnd);
        expandedEvents.push(...instances);
      } else {
        // Non-recurring events are added as-is
        expandedEvents.push(event);
      }
    });
    
    // Group expanded events by date
    expandedEvents.forEach(event => {
      const dateKey = getDateKey(event.startTime);
      if (dateKey) {
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      }
    });
    
    return grouped;
  }, [events, selectedDate]);

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
            <div
              className={`day-event-label ${dayEvents[0].category.toLowerCase()} ${calendarHomeClass(dayEvents[0].organizationType)}`}
              title={dayEvents.map(event => calendarHomeTitle(event)).join(', ')}
            >
              {dayEvents[0].title}
            </div>
            {dayEvents.length > 1 && (
              <div className="more-events">+{dayEvents.length - 1}</div>
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
            <div className="calendar-month-layout">
              <div className="datepicker-container">
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date | null) => date && onDateSelect(date)}
                  onMonthChange={(date) => onDateSelect(date)}
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

              {/* Selected Date Events - Side by side on desktop */}
              <div className="selected-date-events">
                <div className="selected-date-header">
                  <h3>{formatSelectedDate(selectedDate)}</h3>
                  <p>{selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''}</p>
                </div>

                <div className="events-list">
                  {selectedDateEvents.length === 0 ? (
                    <div className="no-events">
                      <div className="no-events-icon" aria-hidden="true">✨</div>
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
                          key={(event as any)._recurrenceInstance || event.id}
                          event={event}
                          onSelect={() => onEventSelect(event)}
                          onUpdate={onEventUpdate}
                          onDelete={onEventDelete}
                          onRsvpUpdate={onRsvpUpdate}
                          canManage={canManage}
                          managedOrganizationIds={managedOrganizationIds}
                          currentUserId={currentUserId}
                          compact={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                        {dayEvents.map(event => (
                          <div 
                            key={(event as any)._recurrenceInstance || event.id}
                            className={`event-item ${event.category.toLowerCase()} ${calendarHomeClass(event.organizationType)}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventSelect(event);
                            }}
                          >
                            <span className="event-time">
                              {formatEventTime(event.startTime)}
                            </span>
                            <span className="event-title">
                              <CalendarHomeBadge organizationType={event.organizationType} />
                              {event.title}
                            </span>
                          </div>
                        ))}
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
                    <div className="no-events-icon" aria-hidden="true">✨</div>
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
                      .sort((a, b) => (parseEventDate(a.startTime)?.getTime() || 0) - (parseEventDate(b.startTime)?.getTime() || 0))
                      .map(event => (
                        <div 
                          key={(event as any)._recurrenceInstance || event.id}
                          className="timeline-event"
                          onClick={() => onEventSelect(event)}
                        >
                          <div className="event-time">
                            {formatEventTime(event.startTime)}
                            {event.endTime && (
                              <span className="end-time">
                                - {formatEventTime(event.endTime)}
                              </span>
                            )}
                          </div>
                          <div className="event-details">
                            <h4 className="event-title">
                              <CalendarHomeBadge organizationType={event.organizationType} />
                              {event.title}
                            </h4>
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

          {/* Selected Date Events - For Week and Day views (below calendar) */}
          {(viewMode === 'week' || viewMode === 'day') && (
            <div className="selected-date-events">
              <div className="selected-date-header">
                <h3>{formatSelectedDate(selectedDate)}</h3>
                <p>{selectedDateEvents.length} event{selectedDateEvents.length !== 1 ? 's' : ''}</p>
              </div>

              <div className="events-list">
                {selectedDateEvents.length === 0 ? (
                  <div className="no-events">
                    <div className="no-events-icon" aria-hidden="true">✨</div>
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
                        canManage={canManage}
                        managedOrganizationIds={managedOrganizationIds}
                        currentUserId={currentUserId}
                        compact={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

function calendarHomeClass(organizationType?: string): string {
  const label = getCalendarHomeLabel(organizationType);
  if (label === 'Family') return 'home-family';
  if (label === 'Church') return 'home-church';
  return '';
}

function calendarHomeTitle(event: Event): string {
  const label = getCalendarHomeLabel(event.organizationType);
  return label ? `${label}: ${event.title}` : event.title;
}

export default CalendarView;