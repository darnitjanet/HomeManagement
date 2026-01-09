import { useState } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { choresApi } from '../../services/api';
import './ChoreDefinitionForm.css';

interface Kid {
  id: number;
  name: string;
  avatarColor: string;
}

interface ChoreDefinitionFormProps {
  kids: Kid[];
  onClose: () => void;
  onSave: () => void;
}

const CHORE_ICONS = [
  { value: 'dishes', label: '🍽️ Dishes' },
  { value: 'trash', label: '🗑️ Trash' },
  { value: 'laundry', label: '🧺 Laundry' },
  { value: 'vacuum', label: '🧹 Vacuum' },
  { value: 'pets', label: '🐕 Pet Care' },
  { value: 'bed', label: '🛏️ Make Bed' },
  { value: 'toys', label: '🧸 Pick Up Toys' },
  { value: 'homework', label: '📚 Homework' },
  { value: 'plants', label: '🌱 Water Plants' },
  { value: 'mail', label: '📬 Get Mail' },
];

const CATEGORIES = [
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'general', label: 'General' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export function ChoreDefinitionForm({ kids, onClose, onSave }: ChoreDefinitionFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [category, setCategory] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>();
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isRotating, setIsRotating] = useState(false);
  const [selectedKids, setSelectedKids] = useState<number[]>([]);
  const [defaultKidId, setDefaultKidId] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDayToggle = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleKidToggle = (kidId: number) => {
    setSelectedKids((prev) =>
      prev.includes(kidId) ? prev.filter((k) => k !== kidId) : [...prev, kidId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a chore name');
      return;
    }

    if (isRotating && selectedKids.length === 0) {
      setError('Please select at least one kid for rotation');
      return;
    }

    if (!isRotating && !defaultKidId) {
      setError('Please select a kid to assign this chore to');
      return;
    }

    try {
      setSaving(true);

      const recurrencePattern: { frequency: string; days?: number[]; interval?: number } = {
        frequency,
      };

      if (frequency === 'weekly' && selectedDays.length > 0) {
        recurrencePattern.days = selectedDays;
      }

      await choresApi.createDefinition({
        name: name.trim(),
        description: description.trim() || undefined,
        icon: icon || undefined,
        category: category || undefined,
        estimatedMinutes,
        isRecurring: true,
        recurrencePattern,
        isRotating,
        rotationKidIds: isRotating ? selectedKids : undefined,
        defaultKidId: isRotating ? undefined : defaultKidId,
      });

      onSave();
    } catch (err: any) {
      console.error('Failed to create chore:', err);
      setError(err.response?.data?.error || 'Failed to create chore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="chore-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Chore</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Chore Name *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Wash dishes"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details about the chore..."
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="icon">Icon</label>
              <select id="icon" value={icon} onChange={(e) => setIcon(e.target.value)}>
                <option value="">Select icon...</option>
                {CHORE_ICONS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration (min)</label>
              <input
                id="duration"
                type="number"
                min="1"
                max="240"
                value={estimatedMinutes || ''}
                onChange={(e) =>
                  setEstimatedMinutes(e.target.value ? parseInt(e.target.value) : undefined)
                }
                placeholder="15"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Schedule</h3>

            <div className="form-group">
              <label>Frequency</label>
              <div className="frequency-options">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={`frequency-btn ${frequency === f.value ? 'active' : ''}`}
                    onClick={() => setFrequency(f.value as any)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {frequency === 'weekly' && (
              <div className="form-group">
                <label>On which days?</label>
                <div className="days-selector">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      className={`day-btn ${selectedDays.includes(day.value) ? 'active' : ''}`}
                      onClick={() => handleDayToggle(day.value)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3>Assignment</h3>

            <div className="form-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isRotating}
                  onChange={(e) => setIsRotating(e.target.checked)}
                />
                <RotateCcw size={16} />
                <span>Rotate between kids</span>
              </label>
              <p className="help-text">
                {isRotating
                  ? 'Each time this chore is completed, it will be assigned to the next kid in the list.'
                  : 'Assign this chore to one kid.'}
              </p>
            </div>

            {kids.length === 0 ? (
              <div className="no-kids-warning">
                No kids found. Please add kids in the Kids Rewards section first.
              </div>
            ) : isRotating ? (
              <div className="form-group">
                <label>Select kids for rotation *</label>
                <div className="kids-selector">
                  {kids.map((kid) => (
                    <button
                      key={kid.id}
                      type="button"
                      className={`kid-btn ${selectedKids.includes(kid.id) ? 'active' : ''}`}
                      style={{
                        borderColor: selectedKids.includes(kid.id) ? kid.avatarColor : undefined,
                        backgroundColor: selectedKids.includes(kid.id)
                          ? `${kid.avatarColor}20`
                          : undefined,
                      }}
                      onClick={() => handleKidToggle(kid.id)}
                    >
                      <div
                        className="kid-avatar-small"
                        style={{ backgroundColor: kid.avatarColor }}
                      >
                        {kid.name.charAt(0)}
                      </div>
                      {kid.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Assign to *</label>
                <div className="kids-selector">
                  {kids.map((kid) => (
                    <button
                      key={kid.id}
                      type="button"
                      className={`kid-btn ${defaultKidId === kid.id ? 'active' : ''}`}
                      style={{
                        borderColor: defaultKidId === kid.id ? kid.avatarColor : undefined,
                        backgroundColor:
                          defaultKidId === kid.id ? `${kid.avatarColor}20` : undefined,
                      }}
                      onClick={() => setDefaultKidId(kid.id)}
                    >
                      <div
                        className="kid-avatar-small"
                        style={{ backgroundColor: kid.avatarColor }}
                      >
                        {kid.name.charAt(0)}
                      </div>
                      {kid.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Chore'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
