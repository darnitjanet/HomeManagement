import { useState, useEffect } from 'react';
import {
  Plus,
  Smile,
  Frown,
  Meh,
  Heart,
  Zap,
  Moon,
  Activity,
  TrendingUp,
  User,
  Trash2,
  Edit,
} from 'lucide-react';
import { moodApi } from '../../services/api';
import { MoodEntryForm } from './MoodEntryForm';
import { FamilyMemberForm } from './FamilyMemberForm';
import { MoodTrends } from './MoodTrends';
import './MoodTracker.css';

interface FamilyMember {
  id: number;
  name: string;
  avatarColor: string;
  dateOfBirth?: string;
  isActive: boolean;
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
  loggedAt: string;
  familyMember?: FamilyMember;
}

const moodEmojis: Record<string, { icon: typeof Smile; color: string }> = {
  anxious: { icon: Frown, color: '#e74c3c' },
  sad: { icon: Frown, color: '#3498db' },
  stressed: { icon: Frown, color: '#e67e22' },
  tired: { icon: Meh, color: '#95a5a6' },
  calm: { icon: Meh, color: '#1abc9c' },
  content: { icon: Smile, color: '#2ecc71' },
  happy: { icon: Smile, color: '#f1c40f' },
  excited: { icon: Heart, color: '#e91e63' },
  grateful: { icon: Heart, color: '#9b59b6' },
  energized: { icon: Zap, color: '#ff9800' },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return 'Today ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString();
}

export function MoodTracker() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showTrends, setShowTrends] = useState(false);
  const [selectedMember, setSelectedMember] = useState<number | null>(null);
  const [editingEntry, setEditingEntry] = useState<MoodEntry | null>(null);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [membersRes, entriesRes] = await Promise.all([
        moodApi.getFamilyMembers(),
        moodApi.getEntries({ limit: 50 }),
      ]);
      setFamilyMembers(membersRes.data.data || []);
      setEntries(entriesRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch mood data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Delete this mood entry?')) return;
    try {
      await moodApi.deleteEntry(id);
      setEntries(entries.filter((e) => e.id !== id));
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!confirm('Delete this family member? All their mood entries will also be deleted.')) return;
    try {
      await moodApi.deleteFamilyMember(id);
      setFamilyMembers(familyMembers.filter((m) => m.id !== id));
      setEntries(entries.filter((e) => e.familyMemberId !== id));
    } catch (error) {
      console.error('Failed to delete member:', error);
    }
  };

  const filteredEntries = selectedMember
    ? entries.filter((e) => e.familyMemberId === selectedMember)
    : entries;

  const getMemberName = (memberId: number) => {
    const member = familyMembers.find((m) => m.id === memberId);
    return member?.name || 'Unknown';
  };

  const getMemberColor = (memberId: number) => {
    const member = familyMembers.find((m) => m.id === memberId);
    return member?.avatarColor || '#4ECDC4';
  };

  if (loading) {
    return (
      <div className="mood-tracker">
        <div className="loading">Loading mood tracker...</div>
      </div>
    );
  }

  return (
    <div className="mood-tracker">
      <div className="mood-banner">
        <img src="/MoodTracker.png" alt="Mood Tracker" />
      </div>

      <div className="mood-header">
        <div className="mood-actions">
          <button className="outline" onClick={() => setShowTrends(true)}>
            <TrendingUp size={18} /> View Trends
          </button>
          <button className="outline" onClick={() => setShowMemberForm(true)}>
            <User size={18} /> Add Person
          </button>
          <button className="primary" onClick={() => setShowEntryForm(true)}>
            <Plus size={18} /> Log Mood
          </button>
        </div>
      </div>

      {/* Family Members */}
      <div className="family-members-section">
        <h2>Family Members</h2>
        <div className="family-members-grid">
          <button
            className={`member-chip ${selectedMember === null ? 'active' : ''}`}
            onClick={() => setSelectedMember(null)}
          >
            All
          </button>
          {familyMembers.map((member) => (
            <div key={member.id} className="member-chip-wrapper">
              <button
                className={`member-chip ${selectedMember === member.id ? 'active' : ''}`}
                style={{ '--member-color': member.avatarColor } as React.CSSProperties}
                onClick={() => setSelectedMember(member.id)}
              >
                <span className="member-avatar" style={{ backgroundColor: member.avatarColor }}>
                  {member.name.charAt(0)}
                </span>
                {member.name}
              </button>
              <div className="member-actions">
                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingMember(member);
                    setShowMemberForm(true);
                  }}
                >
                  <Edit size={14} />
                </button>
                <button
                  className="icon-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteMember(member.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Entries */}
      <div className="entries-section">
        <h2>Recent Mood Entries</h2>
        {filteredEntries.length === 0 ? (
          <div className="empty-state">
            <Smile size={48} strokeWidth={1.5} />
            <p>No mood entries yet</p>
            <button className="primary" onClick={() => setShowEntryForm(true)}>
              Log your first mood
            </button>
          </div>
        ) : (
          <div className="entries-list">
            {filteredEntries.map((entry) => {
              // Parse multiple moods from comma-separated string
              const entryMoods = entry.mood.split(',').map(m => m.trim());

              return (
                <div key={entry.id} className="entry-card">
                  <div className="entry-header">
                    <div className="entry-member">
                      <span
                        className="member-avatar small"
                        style={{ backgroundColor: getMemberColor(entry.familyMemberId) }}
                      >
                        {getMemberName(entry.familyMemberId).charAt(0)}
                      </span>
                      <span className="member-name">{getMemberName(entry.familyMemberId)}</span>
                    </div>
                    <span className="entry-date">{formatDate(entry.loggedAt)}</span>
                    <div className="entry-actions">
                      <button
                        className="icon-btn"
                        onClick={() => {
                          setEditingEntry(entry);
                          setShowEntryForm(true);
                        }}
                      >
                        <Edit size={16} />
                      </button>
                      <button className="icon-btn danger" onClick={() => handleDeleteEntry(entry.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="entry-moods">
                    {entryMoods.map((mood) => {
                      const moodInfo = moodEmojis[mood] || { icon: Meh, color: '#95a5a6' };
                      const MoodIcon = moodInfo.icon;
                      return (
                        <div key={mood} className="entry-mood">
                          <MoodIcon size={20} color={moodInfo.color} />
                          <span className="mood-label" style={{ color: moodInfo.color }}>
                            {mood.charAt(0).toUpperCase() + mood.slice(1)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="entry-stats">
                    <div className="stat">
                      <Zap size={16} />
                      <span>Energy: {entry.energyLevel}/5</span>
                    </div>
                    {entry.sleepQuality && (
                      <div className="stat">
                        <Moon size={16} />
                        <span>Sleep: {entry.sleepQuality}/5</span>
                      </div>
                    )}
                    {entry.sleepHours && (
                      <div className="stat">
                        <Moon size={16} />
                        <span>{entry.sleepHours}h sleep</span>
                      </div>
                    )}
                  </div>

                  {entry.activities && entry.activities.length > 0 && (
                    <div className="entry-activities">
                      <Activity size={14} />
                      {entry.activities.map((activity) => (
                        <span key={activity} className="activity-tag">
                          {activity.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {entry.notes && <div className="entry-notes">{entry.notes}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Forms */}
      {showEntryForm && (
        <MoodEntryForm
          familyMembers={familyMembers}
          entry={editingEntry}
          defaultMemberId={selectedMember}
          onClose={() => {
            setShowEntryForm(false);
            setEditingEntry(null);
          }}
          onSave={async () => {
            setShowEntryForm(false);
            setEditingEntry(null);
            await fetchData();
          }}
        />
      )}

      {showMemberForm && (
        <FamilyMemberForm
          member={editingMember}
          onClose={() => {
            setShowMemberForm(false);
            setEditingMember(null);
          }}
          onSave={async () => {
            setShowMemberForm(false);
            setEditingMember(null);
            await fetchData();
          }}
        />
      )}

      {showTrends && (
        <MoodTrends
          familyMembers={familyMembers}
          onClose={() => setShowTrends(false)}
        />
      )}
    </div>
  );
}
