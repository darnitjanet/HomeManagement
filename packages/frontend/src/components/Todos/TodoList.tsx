import { useState, useEffect } from 'react';
import {
  Plus,
  Check,
  Trash2,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  AlertCircle,
  Coffee,
  Battery,
  BatteryMedium,
  BatteryFull,
  Sparkles,
  RotateCcw,
  Home,
  Car,
  Monitor,
  Phone,
  Globe,
} from 'lucide-react';
import { todosApi } from '../../services/api';
import './TodoList.css';

type Priority = 'urgent' | 'high' | 'medium' | 'low';
type EnergyLevel = 'low' | 'medium' | 'high';
type Context = 'home' | 'errands' | 'computer' | 'phone' | 'anywhere';

interface Todo {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  energy_level: EnergyLevel;
  estimated_minutes: number | null;
  due_date: string | null;
  due_time: string | null;
  context: Context;
  parent_id: number | null;
  sort_order: number;
  completed_at: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  created_at: string;
  updated_at: string;
}

interface NewTodo {
  title: string;
  description: string;
  priority: Priority;
  energy_level: EnergyLevel;
  estimated_minutes: string;
  due_date: string;
  context: Context;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#6b7280',
};

const ENERGY_ICONS: Record<EnergyLevel, typeof Battery> = {
  low: Battery,
  medium: BatteryMedium,
  high: BatteryFull,
};

const CONTEXT_ICONS: Record<Context, typeof Home> = {
  home: Home,
  errands: Car,
  computer: Monitor,
  phone: Phone,
  anywhere: Globe,
};

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [subtasks, setSubtasks] = useState<Record<number, Todo[]>>({});
  const [expandedTodos, setExpandedTodos] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [breakingDown, setBreakingDown] = useState<number | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [newTodo, setNewTodo] = useState<NewTodo>({
    title: '',
    description: '',
    priority: 'medium',
    energy_level: 'medium',
    estimated_minutes: '',
    due_date: '',
    context: 'anywhere',
  });

  useEffect(() => {
    loadTodos();
    checkAIStatus();
  }, [showCompleted]);

  const checkAIStatus = async () => {
    try {
      const response = await todosApi.getAIStatus();
      if (response.data.success) {
        setAiEnabled(response.data.data.aiEnabled);
      }
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  };

  const loadTodos = async () => {
    try {
      const response = await todosApi.getAllTodos(showCompleted);
      if (response.data.success) {
        // Separate parent todos and subtasks
        const allTodos = response.data.data;
        const parentTodos = allTodos.filter((t: Todo) => !t.parent_id);
        const childTodos = allTodos.filter((t: Todo) => t.parent_id);

        setTodos(parentTodos);

        // Group subtasks by parent
        const subtaskMap: Record<number, Todo[]> = {};
        childTodos.forEach((child: Todo) => {
          if (child.parent_id) {
            if (!subtaskMap[child.parent_id]) {
              subtaskMap[child.parent_id] = [];
            }
            subtaskMap[child.parent_id].push(child);
          }
        });
        setSubtasks(subtaskMap);
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.title.trim()) return;

    try {
      const response = await todosApi.createTodo({
        title: newTodo.title.trim(),
        description: newTodo.description || undefined,
        priority: newTodo.priority,
        energy_level: newTodo.energy_level,
        estimated_minutes: newTodo.estimated_minutes
          ? parseInt(newTodo.estimated_minutes)
          : undefined,
        due_date: newTodo.due_date || undefined,
        context: newTodo.context,
      });

      if (response.data.success) {
        setTodos([response.data.data, ...todos]);
        setNewTodo({
          title: '',
          description: '',
          priority: 'medium',
          energy_level: 'medium',
          estimated_minutes: '',
          due_date: '',
          context: 'anywhere',
        });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      if (todo.completed_at) {
        await todosApi.uncompleteTodo(todo.id);
      } else {
        await todosApi.completeTodo(todo.id);
      }
      loadTodos();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await todosApi.deleteTodo(id);
      setTodos(todos.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const handleBreakdown = async (todo: Todo) => {
    if (!aiEnabled) return;
    setBreakingDown(todo.id);

    try {
      const response = await todosApi.breakdownTask(todo.id);
      if (response.data.success) {
        // Add subtasks to state
        setSubtasks((prev) => ({
          ...prev,
          [todo.id]: response.data.data,
        }));
        // Expand this todo to show subtasks
        setExpandedTodos((prev) => new Set([...prev, todo.id]));
      }
    } catch (error) {
      console.error('Failed to breakdown task:', error);
    } finally {
      setBreakingDown(null);
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedTodos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getTimeOfDayEnergy = (): EnergyLevel => {
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 12) return 'high'; // Morning peak
    if (hour >= 14 && hour < 16) return 'medium'; // Afternoon
    return 'low'; // Early morning, late afternoon, evening
  };

  const currentEnergy = getTimeOfDayEnergy();

  if (loading) {
    return <div className="todo-list loading">Loading tasks...</div>;
  }

  return (
    <div className="todo-list">
      <div className="todo-banner">
        <img src="/Tasks.png" alt="Tasks" />
      </div>

      <div className="todo-header">
        <h2>Tasks</h2>
        <div className="header-actions">
          <button
            className={`toggle-completed ${showCompleted ? 'active' : ''}`}
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? 'Hide Done' : 'Show Done'}
          </button>
          <button className="add-todo-btn" onClick={() => setShowAddForm(true)}>
            <Plus size={18} />
            Add Task
          </button>
        </div>
      </div>

      {/* Current Energy Indicator */}
      <div className="energy-indicator">
        <Coffee size={16} />
        <span>
          Current energy time:{' '}
          <strong className={`energy-${currentEnergy}`}>{currentEnergy}</strong>
        </span>
        <span className="energy-hint">
          {currentEnergy === 'high' && 'Great time for focused work!'}
          {currentEnergy === 'medium' && 'Good for moderate tasks'}
          {currentEnergy === 'low' && 'Perfect for easy tasks'}
        </span>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="todo-form">
          <input
            type="text"
            placeholder="What needs to be done?"
            value={newTodo.title}
            onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
            autoFocus
          />
          <textarea
            placeholder="Add details (optional)..."
            value={newTodo.description}
            onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
            rows={2}
          />

          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select
                value={newTodo.priority}
                onChange={(e) =>
                  setNewTodo({ ...newTodo, priority: e.target.value as Priority })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label>Energy Needed</label>
              <select
                value={newTodo.energy_level}
                onChange={(e) =>
                  setNewTodo({ ...newTodo, energy_level: e.target.value as EnergyLevel })
                }
              >
                <option value="low">Low (can do tired)</option>
                <option value="medium">Medium</option>
                <option value="high">High (needs focus)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Time Estimate</label>
              <input
                type="number"
                placeholder="minutes"
                value={newTodo.estimated_minutes}
                onChange={(e) =>
                  setNewTodo({ ...newTodo, estimated_minutes: e.target.value })
                }
                min="1"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Context</label>
              <select
                value={newTodo.context}
                onChange={(e) =>
                  setNewTodo({ ...newTodo, context: e.target.value as Context })
                }
              >
                <option value="anywhere">Anywhere</option>
                <option value="home">At Home</option>
                <option value="errands">Out & About</option>
                <option value="computer">Computer</option>
                <option value="phone">Phone Call</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={newTodo.due_date}
                onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="cancel-btn" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button className="save-btn" onClick={handleAddTodo}>
              Add Task
            </button>
          </div>
        </div>
      )}

      {/* Todo List */}
      <div className="todos">
        {todos.length === 0 ? (
          <div className="no-todos">
            <p>No tasks yet! Add one to get started.</p>
            <p className="hint">Break big tasks into small steps for easier wins.</p>
          </div>
        ) : (
          todos.map((todo) => {
            const todoSubtasks = subtasks[todo.id] || [];
            const isExpanded = expandedTodos.has(todo.id);
            const hasSubtasks = todoSubtasks.length > 0;
            const completedSubtasks = todoSubtasks.filter((s) => s.completed_at).length;
            const EnergyIcon = ENERGY_ICONS[todo.energy_level];
            const ContextIcon = CONTEXT_ICONS[todo.context];
            const energyMatch = todo.energy_level === currentEnergy;

            return (
              <div
                key={todo.id}
                className={`todo-item ${todo.completed_at ? 'completed' : ''} ${
                  energyMatch && !todo.completed_at ? 'energy-match' : ''
                }`}
              >
                <div className="todo-main">
                  <button
                    className={`todo-checkbox priority-${todo.priority}`}
                    onClick={() => handleToggleComplete(todo)}
                    style={{ borderColor: PRIORITY_COLORS[todo.priority] }}
                  >
                    {todo.completed_at && <Check size={14} />}
                  </button>

                  <div className="todo-content">
                    <div className="todo-title-row">
                      {hasSubtasks && (
                        <button
                          className="expand-btn"
                          onClick={() => toggleExpanded(todo.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                        </button>
                      )}
                      <span className="todo-title">{todo.title}</span>
                      {energyMatch && !todo.completed_at && (
                        <span className="energy-match-badge" title="Good energy match!">
                          <Zap size={12} />
                        </span>
                      )}
                    </div>

                    {todo.description && (
                      <p className="todo-description">{todo.description}</p>
                    )}

                    <div className="todo-meta">
                      <span
                        className={`priority-badge priority-${todo.priority}`}
                        style={{ color: PRIORITY_COLORS[todo.priority] }}
                      >
                        {todo.priority === 'urgent' && <AlertCircle size={12} />}
                        {todo.priority}
                      </span>

                      <span className={`energy-badge energy-${todo.energy_level}`}>
                        <EnergyIcon size={12} />
                        {todo.energy_level}
                      </span>

                      {todo.estimated_minutes && (
                        <span className="time-badge">
                          <Clock size={12} />
                          {formatTime(todo.estimated_minutes)}
                        </span>
                      )}

                      <span className="context-badge">
                        <ContextIcon size={12} />
                        {todo.context}
                      </span>

                      {todo.due_date && (
                        <span className="due-badge">
                          Due: {new Date(todo.due_date).toLocaleDateString()}
                        </span>
                      )}

                      {hasSubtasks && (
                        <span className="subtask-progress">
                          {completedSubtasks}/{todoSubtasks.length} steps
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="todo-actions">
                    {aiEnabled && !todo.completed_at && !hasSubtasks && (
                      <button
                        className="breakdown-btn"
                        onClick={() => handleBreakdown(todo)}
                        disabled={breakingDown === todo.id}
                        title="Break into smaller steps"
                      >
                        {breakingDown === todo.id ? (
                          <RotateCcw size={16} className="spinning" />
                        ) : (
                          <Sparkles size={16} />
                        )}
                      </button>
                    )}
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(todo.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Subtasks */}
                {isExpanded && hasSubtasks && (
                  <div className="subtasks">
                    {todoSubtasks.map((subtask) => {
                      const SubEnergyIcon = ENERGY_ICONS[subtask.energy_level];
                      return (
                        <div
                          key={subtask.id}
                          className={`subtask-item ${subtask.completed_at ? 'completed' : ''}`}
                        >
                          <button
                            className="subtask-checkbox"
                            onClick={() => handleToggleComplete(subtask)}
                          >
                            {subtask.completed_at && <Check size={12} />}
                          </button>
                          <span className="subtask-title">{subtask.title}</span>
                          <span className={`subtask-energy energy-${subtask.energy_level}`}>
                            <SubEnergyIcon size={10} />
                          </span>
                          {subtask.estimated_minutes && (
                            <span className="subtask-time">
                              {formatTime(subtask.estimated_minutes)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
