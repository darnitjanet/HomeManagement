import { useState } from 'react';
import { X } from 'lucide-react';
import { moodApi } from '../../services/api';
import './MoodEntryForm.css';

interface FamilyMember {
  id: number;
  name: string;
  avatarColor: string;
}

interface MoodEntry {
  id: number;
  familyMemberId: number;
  mood: string;
  energyLevel: number;
  sleepQuality?: number;
  sleepHours?: number;
  notes?: string;
  activities?: string[];
}

interface MoodEntryFormProps {
  familyMembers: FamilyMember[];
  entry?: MoodEntry | null;
  defaultMemberId?: number | null;
  onClose: () => void;
  onSave: () => void;
}

// Hierarchical mood structure: main categories with sub-moods
const MOOD_CATEGORIES = [
  {
    id: 'positive',
    label: 'Positive',
    emoji: '😊',
    color: '#27ae60',
    subMoods: [
      { value: 'happy', label: 'Happy', emoji: '😊' },
      { value: 'excited', label: 'Excited', emoji: '🤩' },
      { value: 'grateful', label: 'Grateful', emoji: '🥰' },
      { value: 'energized', label: 'Energized', emoji: '⚡' },
    ],
  },
  {
    id: 'calm',
    label: 'Calm',
    emoji: '😌',
    color: '#1abc9c',
    subMoods: [
      { value: 'calm', label: 'Calm', emoji: '😌' },
      { value: 'content', label: 'Content', emoji: '🙂' },
    ],
  },
  {
    id: 'tired',
    label: 'Tired',
    emoji: '😴',
    color: '#95a5a6',
    subMoods: [
      { value: 'tired', label: 'Tired', emoji: '😴' },
    ],
  },
  {
    id: 'stressed',
    label: 'Stressed',
    emoji: '😫',
    color: '#e67e22',
    subMoods: [
      { value: 'stressed', label: 'Stressed', emoji: '😫' },
      { value: 'anxious', label: 'Anxious', emoji: '😰' },
    ],
  },
  {
    id: 'sad',
    label: 'Down',
    emoji: '😢',
    color: '#3498db',
    subMoods: [
      { value: 'sad', label: 'Sad', emoji: '😢' },
    ],
  },
];

// Flat list for backwards compatibility
const MOODS = MOOD_CATEGORIES.flatMap(cat => cat.subMoods);

const ACTIVITIES = [
  { value: 'work', label: 'Work' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'social', label: 'Social' },
  { value: 'family', label: 'Family' },
  { value: 'hobby', label: 'Hobby' },
  { value: 'rest', label: 'Rest' },
  { value: 'outdoors', label: 'Outdoors' },
  { value: 'screen_time', label: 'Screen Time' },
  { value: 'reading', label: 'Reading' },
  { value: 'chores', label: 'Chores' },
];

export function MoodEntryForm({ familyMembers, entry, defaultMemberId, onClose, onSave }: MoodEntryFormProps) {
  const [familyMemberId, setFamilyMemberId] = useState(
    entry?.familyMemberId || defaultMemberId || (familyMembers[0]?.id ?? 0)
  );
  // Support multiple moods - parse from comma-separated string if editing
  const [moods, setMoods] = useState<string[]>(
    entry?.mood ? entry.mood.split(',').map(m => m.trim()) : []
  );
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState(entry?.energyLevel || 3);
  const [sleepQuality, setSleepQuality] = useState(entry?.sleepQuality || 0);
  const [sleepHours, setSleepHours] = useState(entry?.sleepHours?.toString() || '');
  const [notes, setNotes] = useState(entry?.notes || '');
  const [activities, setActivities] = useState<string[]>(entry?.activities || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Check if any sub-mood in a category is selected
  const getCategorySelectedCount = (categoryId: string) => {
    const category = MOOD_CATEGORIES.find(c => c.id === categoryId);
    if (!category) return 0;
    return category.subMoods.filter(m => moods.includes(m.value)).length;
  };

  const toggleCategory = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
    }
  };

  const toggleMood = (mood: string) => {
    if (moods.includes(mood)) {
      setMoods(moods.filter((m) => m !== mood));
    } else {
      setMoods([...moods, mood]);
    }
  };

  const toggleActivity = (activity: string) => {
    if (activities.includes(activity)) {
      setActivities(activities.filter((a) => a !== activity));
    } else {
      setActivities([...activities, activity]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!familyMemberId) {
      setError('Please select a family member');
      return;
    }
    if (moods.length === 0) {
      setError('Please select at least one mood');
      return;
    }

    try {
      setSaving(true);
      const data = {
        familyMemberId,
        mood: moods.join(', '),  // Store multiple moods as comma-separated
        energyLevel,
        sleepQuality: sleepQuality || undefined,
        sleepHours: sleepHours ? parseFloat(sleepHours) : undefined,
        notes: notes || undefined,
        activities: activities.length > 0 ? activities : undefined,
      };

      if (entry) {
        await moodApi.updateEntry(entry.id, data);
      } else {
        await moodApi.createEntry(data);
      }
      onSave();
    } catch (err) {
      console.error('Failed to save mood entry:', err);
      setError('Failed to save mood entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mood-entry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{entry ? 'Edit Mood Entry' : 'Log Your Mood'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          {/* Family Member */}
          <div className="form-group">
            <label>Who's logging?</label>
            <div className="member-select">
              {familyMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={`member-option ${familyMemberId === member.id ? 'selected' : ''}`}
                  onClick={() => setFamilyMemberId(member.id)}
                >
                  <span className="member-avatar" style={{ backgroundColor: member.avatarColor }}>
                    {member.name.charAt(0)}
                  </span>
                  {member.name}
                </button>
              ))}
            </div>
          </div>

          {/* Mood Selection - Hierarchical */}
          <div className="form-group">
            <label>How are you feeling? (tap to expand, select specific moods)</label>
            <div className="mood-categories">
              {MOOD_CATEGORIES.map((category) => {
                const selectedCount = getCategorySelectedCount(category.id);
                const isExpanded = expandedCategory === category.id;

                return (
                  <div key={category.id} className="mood-category">
                    <button
                      type="button"
                      className={`category-button ${selectedCount > 0 ? 'has-selection' : ''} ${isExpanded ? 'expanded' : ''}`}
                      style={{ '--category-color': category.color } as React.CSSProperties}
                      onClick={() => toggleCategory(category.id)}
                    >
                      <span className="category-emoji">{category.emoji}</span>
                      <span className="category-label">{category.label}</span>
                      {selectedCount > 0 && (
                        <span className="category-count">{selectedCount}</span>
                      )}
                      <span className="category-arrow">{isExpanded ? '▼' : '▶'}</span>
                    </button>

                    {isExpanded && (
                      <div className="sub-moods">
                        {category.subMoods.map((mood) => (
                          <button
                            key={mood.value}
                            type="button"
                            className={`sub-mood-option ${moods.includes(mood.value) ? 'selected' : ''}`}
                            onClick={() => toggleMood(mood.value)}
                          >
                            <span className="mood-emoji">{mood.emoji}</span>
                            <span className="mood-label">{mood.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {moods.length > 0 && (
              <div className="selected-moods">
                <span className="selected-label">Selected:</span>
                {moods.map((mood) => {
                  const moodInfo = MOODS.find(m => m.value === mood);
                  return (
                    <span key={mood} className="selected-mood-tag">
                      {moodInfo?.emoji} {moodInfo?.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Energy Level */}
          <div className="form-group">
            <label>Energy Level: {energyLevel}/5</label>
            <input
              type="range"
              min="1"
              max="5"
              value={energyLevel}
              onChange={(e) => setEnergyLevel(parseInt(e.target.value))}
              className="range-slider"
            />
            <div className="range-labels">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Sleep Quality */}
          <div className="form-group">
            <label>Sleep Quality: {sleepQuality || 'Not set'}{sleepQuality ? '/5' : ''}</label>
            <input
              type="range"
              min="0"
              max="5"
              value={sleepQuality}
              onChange={(e) => setSleepQuality(parseInt(e.target.value))}
              className="range-slider"
            />
            <div className="range-labels">
              <span>Skip</span>
              <span>Great</span>
            </div>
          </div>

          {/* Sleep Hours */}
          <div className="form-group">
            <label>Hours of Sleep (optional)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="e.g., 7.5"
            />
          </div>

          {/* Activities */}
          <div className="form-group">
            <label>Activities (select all that apply)</label>
            <div className="activities-grid">
              {ACTIVITIES.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  className={`activity-option ${activities.includes(a.value) ? 'selected' : ''}`}
                  onClick={() => toggleActivity(a.value)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How was your day? What's on your mind?"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving...' : entry ? 'Update' : 'Log Mood'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
