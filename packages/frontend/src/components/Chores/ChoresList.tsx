import { useState, useEffect } from 'react';
import { Plus, Settings, CheckCircle2, Clock, RotateCcw, Sparkles } from 'lucide-react';
import { choresApi, kidsApi } from '../../services/api';
import { ChoreDefinitionForm } from './ChoreDefinitionForm';
import './ChoresList.css';

interface Kid {
  id: number;
  name: string;
  avatarColor: string;
  stickerCount?: number;
}

interface ChoreDefinition {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  estimatedMinutes?: number;
  isRecurring: boolean;
  isRotating: boolean;
  rotationKidIds?: number[];
  defaultKidId?: number;
}

interface ChoreInstance {
  id: number;
  choreDefinitionId: number;
  assignedKidId: number;
  dueDate: string;
  dueTime?: string;
  completedAt?: string;
  choreDefinition?: ChoreDefinition;
  assignedKid?: Kid;
}

export function ChoresList() {
  const [chores, setChores] = useState<ChoreInstance[]>([]);
  const [kids, setKids] = useState<Kid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddChore, setShowAddChore] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [completing, setCompleting] = useState<number | null>(null);
  const [celebratingKid, setCelebratingKid] = useState<Kid | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'upcoming'>('today');

  useEffect(() => {
    loadData();
  }, [viewMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [choresRes, kidsRes] = await Promise.all([
        viewMode === 'today' ? choresApi.getTodaysChores() : choresApi.getUpcomingChores(7),
        kidsApi.getAllKids(),
      ]);
      setChores(choresRes.data.data || []);
      setKids(kidsRes.data.data || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load chores:', err);
      setError('Failed to load chores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (instanceId: number) => {
    try {
      setCompleting(instanceId);
      const response = await choresApi.completeChore(instanceId);
      const completedChore = response.data.data;

      // Show celebration
      if (completedChore.assignedKid) {
        setCelebratingKid(completedChore.assignedKid);
        setTimeout(() => setCelebratingKid(null), 2000);
      }

      // Reload chores
      await loadData();
    } catch (err: any) {
      console.error('Failed to complete chore:', err);
      setError('Failed to complete chore. Please try again.');
    } finally {
      setCompleting(null);
    }
  };

  const handleUncomplete = async (instanceId: number) => {
    try {
      await choresApi.uncompleteChore(instanceId);
      await loadData();
    } catch (err: any) {
      console.error('Failed to undo chore:', err);
      setError('Failed to undo chore completion.');
    }
  };

  const handleChoreCreated = () => {
    setShowAddChore(false);
    loadData();
  };

  const formatDueDate = (dueDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (dueDate === today) return 'Today';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dueDate === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dueDate < today;
  };

  // Group chores by kid
  const choresByKid = chores.reduce((acc, chore) => {
    const kidId = chore.assignedKidId;
    if (!acc[kidId]) {
      acc[kidId] = {
        kid: chore.assignedKid,
        chores: [],
      };
    }
    acc[kidId].chores.push(chore);
    return acc;
  }, {} as Record<number, { kid?: Kid; chores: ChoreInstance[] }>);

  if (loading) {
    return (
      <div className="chores-page">
        <div className="chores-loading">
          <div className="loading-spinner"></div>
          <p>Loading chores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chores-page">
      {/* Celebration overlay */}
      {celebratingKid && (
        <div className="celebration-overlay">
          <div className="celebration-content">
            <Sparkles size={48} className="sparkle-icon" />
            <h2>{celebratingKid.name} earned a sticker!</h2>
            <div className="sticker-animation">
              <span className="animated-sticker">⭐</span>
            </div>
          </div>
        </div>
      )}

      <div className="chores-banner">
        <img src="/Chores.png" alt="Chores" />
      </div>

      <div className="chores-header">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'today' ? 'active' : ''}`}
            onClick={() => setViewMode('today')}
          >
            Today
          </button>
          <button
            className={`toggle-btn ${viewMode === 'upcoming' ? 'active' : ''}`}
            onClick={() => setViewMode('upcoming')}
          >
            Upcoming
          </button>
        </div>
        <div className="header-actions">
          <button
            className={`settings-btn ${editMode ? 'active' : ''}`}
            onClick={() => setEditMode(!editMode)}
          >
            <Settings size={20} />
          </button>
          <button className="primary add-chore-btn" onClick={() => setShowAddChore(true)}>
            <Plus size={20} />
            Add Chore
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {chores.length === 0 ? (
        <div className="no-chores">
          <div className="no-chores-icon">🧹</div>
          <h2>No chores {viewMode === 'today' ? 'for today' : 'upcoming'}!</h2>
          <p>Create a chore to get started with your household duties.</p>
          <button className="primary" onClick={() => setShowAddChore(true)}>
            <Plus size={20} />
            Add First Chore
          </button>
        </div>
      ) : (
        <div className="chores-by-kid">
          {Object.entries(choresByKid).map(([kidId, { kid, chores: kidChores }]) => (
            <div key={kidId} className="kid-chores-section">
              <div className="kid-header" style={{ borderColor: kid?.avatarColor || '#888' }}>
                <div
                  className="kid-avatar"
                  style={{ backgroundColor: kid?.avatarColor || '#888' }}
                >
                  {kid?.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="kid-info">
                  <h3>{kid?.name || 'Unknown'}</h3>
                  <span className="chore-count">
                    {kidChores.length} chore{kidChores.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="chores-list">
                {kidChores.map((chore) => (
                  <div
                    key={chore.id}
                    className={`chore-card ${isOverdue(chore.dueDate) ? 'overdue' : ''} ${completing === chore.id ? 'completing' : ''}`}
                  >
                    <button
                      className="complete-btn"
                      onClick={() => handleComplete(chore.id)}
                      disabled={completing === chore.id}
                    >
                      <CheckCircle2 size={32} />
                    </button>

                    <div className="chore-content">
                      <h4>{chore.choreDefinition?.name || 'Unknown Chore'}</h4>
                      <div className="chore-meta">
                        <span className={`due-date ${isOverdue(chore.dueDate) ? 'overdue' : ''}`}>
                          <Clock size={14} />
                          {formatDueDate(chore.dueDate)}
                        </span>
                        {chore.choreDefinition?.estimatedMinutes && (
                          <span className="duration">
                            ~{chore.choreDefinition.estimatedMinutes} min
                          </span>
                        )}
                        {chore.choreDefinition?.isRotating && (
                          <span className="rotating-badge">
                            <RotateCcw size={12} />
                            Rotating
                          </span>
                        )}
                      </div>
                    </div>

                    {editMode && (
                      <button
                        className="undo-btn"
                        onClick={() => handleUncomplete(chore.id)}
                        title="Undo if needed"
                      >
                        Undo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddChore && (
        <ChoreDefinitionForm
          kids={kids}
          onClose={() => setShowAddChore(false)}
          onSave={handleChoreCreated}
        />
      )}
    </div>
  );
}
