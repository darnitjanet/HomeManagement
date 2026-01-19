import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Leaf, Sun, Snowflake, Flower2, Cloud } from 'lucide-react';
import { seasonalTasksApi } from '../../services/api';
import './SeasonalTasks.css';

interface SeasonalTask {
  id: number;
  title: string;
  description: string | null;
  category: string;
  seasons: string[] | null;
  months: number[] | null;
  reminder_day: number;
  reminder_days_before: number;
  priority: string;
  estimated_minutes: number | null;
  last_completed_period: string | null;
  last_completed_at: string | null;
  is_active: boolean;
  dueIn?: number;
}

const SEASONS = [
  { value: 'spring', label: 'Spring', icon: Flower2, months: 'Mar-May' },
  { value: 'summer', label: 'Summer', icon: Sun, months: 'Jun-Aug' },
  { value: 'fall', label: 'Fall', icon: Leaf, months: 'Sep-Nov' },
  { value: 'winter', label: 'Winter', icon: Snowflake, months: 'Dec-Feb' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const CATEGORIES = [
  { value: 'home', label: 'Home Maintenance' },
  { value: 'garden', label: 'Garden & Lawn' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'car', label: 'Vehicle' },
  { value: 'safety', label: 'Safety' },
  { value: 'cleaning', label: 'Deep Cleaning' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  home: '#5b768a',
  garden: '#dc9e33',
  hvac: '#da6b34',
  plumbing: '#5b768a',
  car: '#dc9e33',
  safety: '#da6b34',
  cleaning: '#5b768a',
  other: '#dc9e33',
};

export function SeasonalTasks() {
  const [tasks, setTasks] = useState<SeasonalTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<SeasonalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<SeasonalTask | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'all'>('upcoming');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'home',
    seasons: [] as string[],
    months: [] as number[],
    reminder_day: 1,
    reminder_days_before: 7,
    priority: 'medium',
    estimated_minutes: '',
    useSeasons: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allRes, upcomingRes] = await Promise.all([
        seasonalTasksApi.getAll(),
        seasonalTasksApi.getUpcoming(),
      ]);
      if (allRes.data.success) {
        setTasks(allRes.data.data);
      }
      if (upcomingRes.data.success) {
        setUpcomingTasks(upcomingRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const data = {
      title: formData.title,
      description: formData.description || undefined,
      category: formData.category,
      seasons: formData.useSeasons ? formData.seasons : undefined,
      months: !formData.useSeasons ? formData.months : undefined,
      reminder_day: formData.reminder_day,
      reminder_days_before: formData.reminder_days_before,
      priority: formData.priority,
      estimated_minutes: formData.estimated_minutes ? parseInt(formData.estimated_minutes) : undefined,
    };

    try {
      if (editingTask) {
        await seasonalTasksApi.update(editingTask.id, data);
      } else {
        await seasonalTasksApi.create(data);
      }
      closeForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleEdit = (task: SeasonalTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      category: task.category,
      seasons: task.seasons || [],
      months: task.months || [],
      reminder_day: task.reminder_day,
      reminder_days_before: task.reminder_days_before,
      priority: task.priority,
      estimated_minutes: task.estimated_minutes?.toString() || '',
      useSeasons: !!(task.seasons && task.seasons.length > 0),
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await seasonalTasksApi.delete(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleComplete = async (id: number) => {
    try {
      await seasonalTasksApi.markCompleted(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark task complete');
    }
  };

  const toggleSeason = (season: string) => {
    setFormData(prev => ({
      ...prev,
      seasons: prev.seasons.includes(season)
        ? prev.seasons.filter(s => s !== season)
        : [...prev.seasons, season],
    }));
  };

  const toggleMonth = (month: number) => {
    setFormData(prev => ({
      ...prev,
      months: prev.months.includes(month)
        ? prev.months.filter(m => m !== month)
        : [...prev.months, month],
    }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      category: 'home',
      seasons: [],
      months: [],
      reminder_day: 1,
      reminder_days_before: 7,
      priority: 'medium',
      estimated_minutes: '',
      useSeasons: true,
    });
  };

  const getSeasonIcon = (season: string) => {
    const s = SEASONS.find(s => s.value === season);
    return s ? s.icon : Leaf;
  };

  const formatTiming = (task: SeasonalTask) => {
    if (task.seasons && task.seasons.length > 0) {
      return task.seasons.map(s => {
        const season = SEASONS.find(se => se.value === s);
        return season?.label || s;
      }).join(', ');
    }
    if (task.months && task.months.length > 0) {
      return task.months.map(m => {
        const month = MONTHS.find(mo => mo.value === m);
        return month?.label.substring(0, 3) || m;
      }).join(', ');
    }
    return 'Not scheduled';
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, SeasonalTask[]>);

  if (loading) {
    return (
      <div className="seasonal-tasks">
        <div className="loading-state">Loading seasonal tasks...</div>
      </div>
    );
  }

  return (
    <div className="seasonal-tasks">
      <div className="st-banner">
        <img src="/SeasonalTasks.png" alt="Seasonal Tasks" />
      </div>

      <div className="st-header">
        <button className="add-btn" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          Add Task
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="st-tabs">
        <button
          className={`st-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <Cloud size={20} />
          Due Now ({upcomingTasks.length})
        </button>
        <button
          className={`st-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Leaf size={20} />
          All Tasks ({tasks.length})
        </button>
      </div>

      {activeTab === 'upcoming' && (
        <div className="st-section">
          {upcomingTasks.length === 0 ? (
            <div className="no-tasks">
              <Leaf size={48} />
              <p>No seasonal tasks due right now</p>
              <span>Tasks will appear here when they're in season</span>
            </div>
          ) : (
            <div className="upcoming-tasks">
              {upcomingTasks.map(task => (
                <div key={task.id} className="task-card upcoming">
                  <div
                    className="task-category-bar"
                    style={{ backgroundColor: CATEGORY_COLORS[task.category] || '#6b7280' }}
                  />
                  <div className="task-content">
                    <div className="task-header">
                      <h3>{task.title}</h3>
                      <span className={`due-badge ${task.dueIn === 0 ? 'today' : ''}`}>
                        {task.dueIn === 0 ? 'Due Today' : `Due in ${task.dueIn} days`}
                      </span>
                    </div>
                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}
                    <div className="task-meta">
                      <span className="task-category">
                        {CATEGORIES.find(c => c.value === task.category)?.label || task.category}
                      </span>
                      {task.estimated_minutes && (
                        <span className="task-time">~{task.estimated_minutes} min</span>
                      )}
                    </div>
                    <div className="task-actions">
                      <button
                        className="complete-btn"
                        onClick={() => handleComplete(task.id)}
                      >
                        <Check size={18} />
                        Mark Complete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="st-section">
          {tasks.length === 0 ? (
            <div className="no-tasks">
              <Leaf size={48} />
              <p>No seasonal tasks yet</p>
              <span>Add tasks like "Clean gutters" or "Change HVAC filters"</span>
            </div>
          ) : (
            <div className="all-tasks">
              {Object.entries(groupedTasks).map(([category, categoryTasks]) => (
                <div key={category} className="task-category-section">
                  <div
                    className="category-header"
                    style={{ borderLeftColor: CATEGORY_COLORS[category] || '#6b7280' }}
                  >
                    <h2>{CATEGORIES.find(c => c.value === category)?.label || category}</h2>
                  </div>
                  <div className="category-tasks">
                    {categoryTasks.map(task => (
                      <div
                        key={task.id}
                        className={`task-card ${!task.is_active ? 'inactive' : ''}`}
                      >
                        <div className="task-content">
                          <div className="task-header">
                            <h3>{task.title}</h3>
                            <div className="task-actions-inline">
                              <button
                                className="action-btn edit"
                                onClick={() => handleEdit(task)}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="action-btn delete"
                                onClick={() => handleDelete(task.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                          {task.description && (
                            <p className="task-description">{task.description}</p>
                          )}
                          <div className="task-timing">
                            {task.seasons && task.seasons.map(season => {
                              const SeasonIcon = getSeasonIcon(season);
                              return (
                                <span key={season} className="season-badge">
                                  <SeasonIcon size={14} />
                                  {season}
                                </span>
                              );
                            })}
                            {task.months && task.months.length > 0 && (
                              <span className="months-badge">{formatTiming(task)}</span>
                            )}
                          </div>
                          <div className="task-meta">
                            <span className={`priority-badge ${task.priority}`}>
                              {task.priority}
                            </span>
                            {task.estimated_minutes && (
                              <span className="task-time">~{task.estimated_minutes} min</span>
                            )}
                            {task.last_completed_at && (
                              <span className="last-completed">
                                Last done: {new Date(task.last_completed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="form-overlay" onClick={closeForm}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingTask ? 'Edit Task' : 'Add Seasonal Task'}</h2>
              <button className="close-btn" onClick={closeForm}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Task Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Clean gutters, Change HVAC filter"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details..."
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Schedule By</label>
                <div className="schedule-toggle">
                  <button
                    type="button"
                    className={formData.useSeasons ? 'active' : ''}
                    onClick={() => setFormData({ ...formData, useSeasons: true, months: [] })}
                  >
                    Seasons
                  </button>
                  <button
                    type="button"
                    className={!formData.useSeasons ? 'active' : ''}
                    onClick={() => setFormData({ ...formData, useSeasons: false, seasons: [] })}
                  >
                    Specific Months
                  </button>
                </div>
              </div>

              {formData.useSeasons ? (
                <div className="form-group">
                  <label>Select Seasons *</label>
                  <div className="season-selector">
                    {SEASONS.map(season => {
                      const SeasonIcon = season.icon;
                      return (
                        <button
                          key={season.value}
                          type="button"
                          className={`season-btn ${formData.seasons.includes(season.value) ? 'selected' : ''}`}
                          onClick={() => toggleSeason(season.value)}
                        >
                          <SeasonIcon size={20} />
                          <span>{season.label}</span>
                          <small>{season.months}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label>Select Months *</label>
                  <div className="month-selector">
                    {MONTHS.map(month => (
                      <button
                        key={month.value}
                        type="button"
                        className={`month-btn ${formData.months.includes(month.value) ? 'selected' : ''}`}
                        onClick={() => toggleMonth(month.value)}
                      >
                        {month.label.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Reminder Day of Month</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.reminder_day}
                    onChange={e => setFormData({ ...formData, reminder_day: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="form-group">
                  <label>Days Before to Remind</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={formData.reminder_days_before}
                    onChange={e => setFormData({ ...formData, reminder_days_before: parseInt(e.target.value) || 7 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Estimated Time (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.estimated_minutes}
                  onChange={e => setFormData({ ...formData, estimated_minutes: e.target.value })}
                  placeholder="e.g., 30"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={!formData.title.trim() || (formData.useSeasons ? formData.seasons.length === 0 : formData.months.length === 0)}
                >
                  <Check size={18} />
                  {editingTask ? 'Update' : 'Add'} Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
