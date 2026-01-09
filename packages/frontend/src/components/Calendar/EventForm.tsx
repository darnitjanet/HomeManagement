import { useState } from 'react';
import { calendarApi } from '../../services/api';
import { useCalendarStore } from '../../stores/useCalendarStore';
import './EventForm.css';

interface EventFormProps {
  event?: any; // If editing existing event
  initialDate?: Date; // If creating new event
  onClose: () => void;
  onSave: () => void;
}

export function EventForm({ event, initialDate, onClose, onSave }: EventFormProps) {
  const { calendars } = useCalendarStore();
  const isEditing = !!event;

  // Form state
  const [title, setTitle] = useState(event?.summary || '');
  const [startDate, setStartDate] = useState(
    event?.start?.dateTime
      ? new Date(event.start.dateTime).toISOString().slice(0, 16)
      : initialDate
        ? new Date(initialDate).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(
    event?.end?.dateTime
      ? new Date(event.end.dateTime).toISOString().slice(0, 16)
      : initialDate
        ? new Date(new Date(initialDate).getTime() + 60 * 60 * 1000).toISOString().slice(0, 16)
        : new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [allDay, setAllDay] = useState(!!event?.start?.date);
  const [location, setLocation] = useState(event?.location || '');
  const [description, setDescription] = useState(event?.description || '');
  const [calendarId, setCalendarId] = useState(event?.calendarId || 'primary');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const eventData: any = {
        summary: title,
        location,
        description,
        calendarId,
      };

      if (allDay) {
        // All-day events use 'date' instead of 'dateTime'
        eventData.start = { date: startDate.split('T')[0] };
        eventData.end = { date: endDate.split('T')[0] };
      } else {
        eventData.start = { dateTime: new Date(startDate).toISOString() };
        eventData.end = { dateTime: new Date(endDate).toISOString() };
      }

      if (isEditing) {
        await calendarApi.updateEvent(event.id, eventData);
      } else {
        await calendarApi.createEvent(eventData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    setDeleting(true);
    try {
      await calendarApi.deleteEvent(event.id, calendarId);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content event-form-modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <h2>{isEditing ? 'Edit Event' : 'Create Event'}</h2>
            <button type="button" className="close-button" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="title">Event Title *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Add title"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="calendar">Calendar</label>
              <select
                id="calendar"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
              >
                {calendars.map((cal: any) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.summary}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                />
                <span>All day</span>
              </label>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start">{allDay ? 'Start Date' : 'Start'}</label>
                <input
                  id="start"
                  type={allDay ? 'date' : 'datetime-local'}
                  value={allDay ? startDate.split('T')[0] : startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="end">{allDay ? 'End Date' : 'End'}</label>
                <input
                  id="end"
                  type={allDay ? 'date' : 'datetime-local'}
                  value={allDay ? endDate.split('T')[0] : endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description"
                rows={4}
              />
            </div>
          </div>

          <div className="modal-footer">
            {isEditing && (
              <button
                type="button"
                className="delete-button"
                onClick={handleDelete}
                disabled={deleting || saving}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <div className="form-actions">
              <button type="button" className="outline" onClick={onClose} disabled={saving || deleting}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={saving || deleting}>
                {saving ? 'Saving...' : isEditing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
