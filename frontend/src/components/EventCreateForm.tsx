import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import { eventAPI, EVENT_CATEGORY_OPTIONS } from '../services/eventApi';
import { Event, EventRequest, EventCategory } from '../types/Event';
import 'react-datepicker/dist/react-datepicker.css';
import './EventCreateForm.css';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date>(
    editEvent ? new Date(editEvent.startTime) : initialDate || new Date()
  );
  const [endTime, setEndTime] = useState<Date | null>(
    editEvent?.endTime ? new Date(editEvent.endTime) : null
  );

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
      requiresApproval: editEvent?.requiresApproval || false
    }
  });

  const isRecurring = watch('isRecurring');

  const onSubmit = async (data: EventRequest) => {
    try {
      setLoading(true);
      setError(null);

      const eventData: EventRequest = {
        ...data,
        startTime: startTime.toISOString(),
        endTime: endTime?.toISOString(),
      };

      let result;
      if (editEvent) {
        result = await eventAPI.updateEvent(editEvent.id, eventData);
      } else {
        result = await eventAPI.createEvent(eventData);
      }

      onSuccess(result.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event');
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
              onChange={setStartTime}
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
              onChange={setEndTime}
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