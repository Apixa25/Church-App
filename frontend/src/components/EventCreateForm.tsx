import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import { eventAPI, EVENT_CATEGORY_OPTIONS } from '../services/eventApi';
import { Event, EventRequest, EventCategory, EventBringItemInput, RecurrenceType } from '../types/Event';
import { parseEventDate } from '../utils/dateUtils';
import { useActiveContext } from '../contexts/ActiveContextContext';
import 'react-datepicker/dist/react-datepicker.css';
import './EventCreateForm.css';
import BringListEditor from './BringListEditor';

interface EventCreateFormProps {
  onSuccess: (event: Event) => void;
  onCancel: () => void;
  initialDate?: Date;
  editEvent?: Event;
}

const EventCreateForm: React.FC<EventCreateFormProps> = ({
  onSuccess,
  onCancel,
  initialDate,
  editEvent
}) => {
  const { activeOrganizationId } = useActiveContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date>(() => {
    if (editEvent) {
      const parsedDate = parseEventDate(editEvent.startTime);
      if (parsedDate) {
        console.log('🛠️ Parsed edit event start time:', {
          original: editEvent.startTime,
          parsed: parsedDate,
          formatted: parsedDate.toLocaleDateString() + ' ' + parsedDate.toLocaleTimeString()
        });
        return parsedDate;
      }
      console.warn('⚠️ Failed to parse edit event start time, using current date');
    }
    return initialDate || new Date();
  });
  
  const [endTime, setEndTime] = useState<Date | null>(() => {
    if (editEvent?.endTime) {
      const parsedDate = parseEventDate(editEvent.endTime);
      if (parsedDate) {
        console.log('🛠️ Parsed edit event end time:', {
          original: editEvent.endTime,
          parsed: parsedDate,
          formatted: parsedDate.toLocaleDateString() + ' ' + parsedDate.toLocaleTimeString()
        });
        return parsedDate;
      }
      console.warn('⚠️ Failed to parse edit event end time, using null');
    }
    return null;
  });

  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(() => {
    if (editEvent?.recurrenceEndDate) {
      const parsedDate = parseEventDate(editEvent.recurrenceEndDate);
      if (parsedDate) {
        return parsedDate;
      }
    }
    return null;
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<EventRequest>({
    defaultValues: {
      title: editEvent?.title || '',
      description: editEvent?.description || '',
      location: editEvent?.location || '',
      category: editEvent?.category || EventCategory.GENERAL,
      maxAttendees: editEvent?.maxAttendees || undefined,
      isRecurring: editEvent?.isRecurring || false,
      recurrenceType: editEvent?.recurrenceType || undefined,
      requiresApproval: editEvent?.requiresApproval || false,
      bringListEnabled: editEvent?.bringListEnabled || false,
      bringItems: []
    }
  });

  const bringListEnabled = watch('bringListEnabled') || false;
  const bringItems = (watch('bringItems') as EventBringItemInput[] | undefined) || [];
  const isRecurring = watch('isRecurring') || false;
  const recurrenceType = watch('recurrenceType');

  const handleBringItemsChange = (items: EventBringItemInput[]) => {
    setValue('bringItems', items, { shouldDirty: true, shouldValidate: false });
  };

  const onSubmit = async (data: EventRequest) => {
    try {
      setLoading(true);
      setError(null);

      // Format dates properly for backend LocalDateTime parsing
      const formatDateForBackend = (date: Date): string => {
        // Format as: 2025-09-13T14:30:00.000
        // CRITICAL FIX: Use local time components instead of toISOString() to avoid timezone conversion
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
      };

      const eventData: EventRequest = {
        ...data,
        startTime: formatDateForBackend(startTime),
        endTime: endTime ? formatDateForBackend(endTime) : undefined,
        // Fix maxAttendees: convert empty string to undefined
        maxAttendees: data.maxAttendees && data.maxAttendees.toString().trim() !== '' 
          ? parseInt(data.maxAttendees.toString(), 10) 
          : undefined,
        bringListEnabled: data.bringListEnabled || false,
        organizationId: activeOrganizationId || undefined, // Pass active organization from context
        // Handle recurring event fields
        isRecurring: data.isRecurring || false,
        recurrenceType: data.isRecurring && data.recurrenceType ? data.recurrenceType : undefined,
        recurrenceEndDate: data.isRecurring && recurrenceEndDate ? formatDateForBackend(recurrenceEndDate) : undefined,
        bringItems: (data.bringItems || [])
          .map(item => ({
            name: item.name?.trim() || '',
            description: item.description?.trim() || undefined,
            quantityNeeded: item.quantityNeeded !== undefined && item.quantityNeeded !== null
              ? Number(item.quantityNeeded)
              : undefined,
            allowMultipleClaims: item.allowMultipleClaims !== undefined ? item.allowMultipleClaims : true
          }))
          .filter(item => item.name.length > 0)
      };

      // Debug logging to see what we're sending
      console.log('🚀 Creating/Updating event - SENDING TO BACKEND:', {
        operation: editEvent ? 'UPDATE' : 'CREATE',
        eventId: editEvent?.id,
        eventCreatorId: editEvent?.creatorId,
        currentUser: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
        title: eventData.title,
        startTimeFormatted: eventData.startTime,
        endTimeFormatted: eventData.endTime,
        originalStartTime: startTime.toISOString(),
        originalEndTime: endTime?.toISOString(),
        userSelectedDate: startTime.toLocaleDateString(),
        userSelectedTime: startTime.toLocaleTimeString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // ENHANCED DEBUG: Show the difference between old and new formatting
        oldFormatting: startTime.toISOString().slice(0, 23),
        newFormatting: eventData.startTime,
        dateComponents: {
          year: startTime.getFullYear(),
          month: startTime.getMonth() + 1,
          day: startTime.getDate(),
          hours: startTime.getHours(),
          minutes: startTime.getMinutes(),
          seconds: startTime.getSeconds()
        },
        allEventData: eventData
      });
      
      // Log the exact payload being sent
      console.log('📦 EXACT PAYLOAD TO BACKEND:', JSON.stringify(eventData, null, 2));

      let result;
      if (editEvent) {
        result = await eventAPI.updateEvent(editEvent.id, eventData);
      } else {
        result = await eventAPI.createEvent(eventData);
      }

      onSuccess(result.data);
    } catch (err: any) {
      console.error('Event creation/update error:', {
        operation: editEvent ? 'UPDATE' : 'CREATE',
        eventId: editEvent?.id,
        error: err,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url,
        method: err.config?.method
      });
      setError(
        err.response?.data?.message || 
        err.response?.data?.error || 
        `Failed to create event: ${err.response?.status} ${err.response?.statusText}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="event-create-form">
      <div className="form-header">
        <h2>{editEvent ? 'Edit Event' : 'Create New Event'}</h2>
        <button className="close-btn" onClick={onCancel}>✕</button>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="event-form">
        {/* Title */}
        <div className="form-group">
          <label htmlFor="title">Event Title *</label>
          <input
            id="title"
            type="text"
            {...register('title', {
              required: 'Event title is required',
              minLength: { value: 3, message: 'Title must be at least 3 characters' },
              maxLength: { value: 200, message: 'Title cannot exceed 200 characters' }
            })}
            className={errors.title ? 'error' : ''}
            placeholder="Enter event title"
          />
          {errors.title && <span className="error-text">{errors.title.message}</span>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            {...register('description', {
              maxLength: { value: 2000, message: 'Description cannot exceed 2000 characters' }
            })}
            className={errors.description ? 'error' : ''}
            placeholder="Event description (optional)"
            rows={4}
          />
          {errors.description && <span className="error-text">{errors.description.message}</span>}
        </div>

        {/* Date and Time */}
        <div className="form-row">
          <div className="form-group">
            <label>Start Date & Time *</label>
            <DatePicker
              selected={startTime}
              onChange={(date: Date | null) => date && setStartTime(date)}
              showTimeSelect
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="MMM d, yyyy h:mm aa"
              className="date-input"
              minDate={new Date()}
            />
          </div>

          <div className="form-group">
            <label>End Date & Time</label>
            <DatePicker
              selected={endTime}
              onChange={(date: Date | null) => setEndTime(date)}
              showTimeSelect
              timeIntervals={15}
              timeCaption="Time"
              dateFormat="MMM d, yyyy h:mm aa"
              className="date-input"
              minDate={startTime}
              placeholderText="Optional end time"
              isClearable
            />
          </div>
        </div>

        {/* Location */}
        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            id="location"
            type="text"
            {...register('location', {
              maxLength: { value: 500, message: 'Location cannot exceed 500 characters' }
            })}
            className={errors.location ? 'error' : ''}
            placeholder="Event location (optional)"
          />
          {errors.location && <span className="error-text">{errors.location.message}</span>}
        </div>

        {/* Category and Max Attendees */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              {...register('category')}
              className="select-input"
            >
              {EVENT_CATEGORY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="maxAttendees">Max Attendees</label>
            <input
              id="maxAttendees"
              type="number"
              {...register('maxAttendees', {
                min: { value: 1, message: 'Must allow at least 1 attendee' },
                max: { value: 1000, message: 'Cannot exceed 1000 attendees' }
              })}
              className={errors.maxAttendees ? 'error' : ''}
              placeholder="No limit"
            />
            {errors.maxAttendees && <span className="error-text">{errors.maxAttendees.message}</span>}
          </div>
        </div>

        {/* Checkboxes */}
        <div className="form-group checkboxes">
          <label className="checkbox-label">
            <input
              type="checkbox"
              {...register('requiresApproval')}
            />
            <span className="checkmark"></span>
            Require approval for attendance
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              {...register('isRecurring')}
            />
            <span className="checkmark"></span>
            Recurring event
          </label>
        </div>

        {/* Recurring Event Fields */}
        {isRecurring && (
          <div className="form-group recurring-fields">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="recurrenceType">Recurrence Pattern *</label>
                <select
                  id="recurrenceType"
                  {...register('recurrenceType', {
                    required: isRecurring ? 'Recurrence pattern is required for recurring events' : false
                  })}
                  className={errors.recurrenceType ? 'error' : 'select-input'}
                >
                  <option value="">Select pattern...</option>
                  <option value={RecurrenceType.DAILY}>Daily</option>
                  <option value={RecurrenceType.WEEKLY}>Weekly</option>
                  <option value={RecurrenceType.MONTHLY}>Monthly</option>
                  <option value={RecurrenceType.YEARLY}>Yearly</option>
                </select>
                {errors.recurrenceType && <span className="error-text">{errors.recurrenceType.message}</span>}
              </div>

              <div className="form-group">
                <label>Recurrence End Date (Optional)</label>
                <DatePicker
                  selected={recurrenceEndDate}
                  onChange={(date: Date | null) => setRecurrenceEndDate(date)}
                  dateFormat="MMM d, yyyy"
                  className="date-input"
                  minDate={startTime}
                  placeholderText="No end date (repeats indefinitely)"
                  isClearable
                />
                <p className="helper-text">
                  Leave empty to repeat indefinitely, or set an end date
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Bring List Toggle */}
        <div className="form-group bring-list-toggle">
          <label className="checkbox-label">
            <input
              type="checkbox"
              {...register('bringListEnabled')}
            />
            <span className="checkmark"></span>
            Enable communal bring-list
          </label>
          <p className="helper-text">
            Invite attendees to claim items (e.g., potluck dishes, supplies). You can seed suggested items below.
          </p>
        </div>

        {/* Bring List Editor */}
        {bringListEnabled && (
          <BringListEditor
            items={bringItems}
            onChange={handleBringItemsChange}
            existingItems={editEvent?.bringItems}
            isEditingExisting={Boolean(editEvent)}
          />
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : editEvent ? 'Update Event' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventCreateForm;