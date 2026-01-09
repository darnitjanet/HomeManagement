import { db } from '../config/database';

export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type Context = 'home' | 'errands' | 'computer' | 'phone' | 'anywhere';

export interface Todo {
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
  last_nudged_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTodoData {
  title: string;
  description?: string;
  priority?: Priority;
  energy_level?: EnergyLevel;
  estimated_minutes?: number;
  due_date?: string;
  due_time?: string;
  context?: Context;
  parent_id?: number;
  sort_order?: number;
  is_recurring?: boolean;
  recurrence_pattern?: string;
}

export interface UpdateTodoData {
  title?: string;
  description?: string;
  priority?: Priority;
  energy_level?: EnergyLevel;
  estimated_minutes?: number;
  due_date?: string | null;
  due_time?: string | null;
  context?: Context;
  parent_id?: number | null;
  sort_order?: number;
  completed_at?: string | null;
  is_recurring?: boolean;
  recurrence_pattern?: string | null;
  last_nudged_at?: string | null;
  snoozed_until?: string | null;
}

// Get all todos (excluding completed by default)
export async function getAllTodos(includeCompleted = false): Promise<Todo[]> {
  const query = db('todos').select('*');

  if (!includeCompleted) {
    query.whereNull('completed_at');
  }

  return query
    .orderByRaw('CASE priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 END')
    .orderBy('due_date', 'asc')
    .orderBy('sort_order', 'asc');
}

// Get todos for today (due today or overdue, not completed)
export async function getTodaysTodos(): Promise<Todo[]> {
  const today = new Date().toISOString().split('T')[0];

  return db('todos')
    .select('*')
    .whereNull('completed_at')
    .where(function () {
      this.where('due_date', '<=', today).orWhereNull('due_date');
    })
    .orderByRaw('CASE priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 END')
    .orderBy('due_date', 'asc')
    .orderBy('sort_order', 'asc');
}

// Get top priority todos for kiosk display (limited, not snoozed)
export async function getKioskTodos(limit = 5): Promise<Todo[]> {
  const now = new Date().toISOString();

  return db('todos')
    .select('*')
    .whereNull('completed_at')
    .whereNull('parent_id') // Only top-level tasks for kiosk
    .where(function () {
      this.whereNull('snoozed_until').orWhere('snoozed_until', '<', now);
    })
    .orderByRaw('CASE priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 END')
    .orderBy('due_date', 'asc')
    .orderBy('sort_order', 'asc')
    .limit(limit);
}

// Get subtasks for a parent todo
export async function getSubtasks(parentId: number): Promise<Todo[]> {
  return db('todos')
    .select('*')
    .where({ parent_id: parentId })
    .orderBy('sort_order', 'asc');
}

// Get a single todo by ID
export async function getTodoById(id: number): Promise<Todo | undefined> {
  return db('todos').where({ id }).first();
}

// Create a new todo
export async function createTodo(data: CreateTodoData): Promise<Todo> {
  const [id] = await db('todos').insert({
    title: data.title,
    description: data.description || null,
    priority: data.priority || 'medium',
    energy_level: data.energy_level || 'medium',
    estimated_minutes: data.estimated_minutes || null,
    due_date: data.due_date || null,
    due_time: data.due_time || null,
    context: data.context || 'anywhere',
    parent_id: data.parent_id || null,
    sort_order: data.sort_order || 0,
    is_recurring: data.is_recurring || false,
    recurrence_pattern: data.recurrence_pattern || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return getTodoById(id) as Promise<Todo>;
}

// Create multiple todos (for AI breakdown)
export async function createTodos(todos: CreateTodoData[]): Promise<Todo[]> {
  const results: Todo[] = [];
  for (const todo of todos) {
    const created = await createTodo(todo);
    results.push(created);
  }
  return results;
}

// Update a todo
export async function updateTodo(id: number, data: UpdateTodoData): Promise<Todo | undefined> {
  await db('todos')
    .where({ id })
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    });

  return getTodoById(id);
}

// Mark todo as complete
export async function completeTodo(id: number): Promise<Todo | undefined> {
  const todo = await getTodoById(id);
  if (!todo) return undefined;

  await db('todos')
    .where({ id })
    .update({
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  // If this is a recurring task, create the next occurrence
  if (todo.is_recurring && todo.recurrence_pattern) {
    await createNextRecurrence(todo);
  }

  return getTodoById(id);
}

// Uncomplete a todo (undo completion)
export async function uncompleteTodo(id: number): Promise<Todo | undefined> {
  await db('todos')
    .where({ id })
    .update({
      completed_at: null,
      updated_at: new Date().toISOString(),
    });

  return getTodoById(id);
}

// Delete a todo
export async function deleteTodo(id: number): Promise<boolean> {
  const deleted = await db('todos').where({ id }).delete();
  return deleted > 0;
}

// Snooze a todo (hide from suggestions temporarily)
export async function snoozeTodo(id: number, until: string): Promise<Todo | undefined> {
  await db('todos')
    .where({ id })
    .update({
      snoozed_until: until,
      updated_at: new Date().toISOString(),
    });

  return getTodoById(id);
}

// Mark that a todo was nudged (shown in rotation)
export async function markNudged(id: number): Promise<void> {
  await db('todos')
    .where({ id })
    .update({
      last_nudged_at: new Date().toISOString(),
    });
}

// Get todos eligible for nudging (not recently nudged, not snoozed, not completed)
export async function getNudgeableTodos(): Promise<Todo[]> {
  const now = new Date().toISOString();
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  return db('todos')
    .select('*')
    .whereNull('completed_at')
    .whereNull('parent_id')
    .where(function () {
      this.whereNull('snoozed_until').orWhere('snoozed_until', '<', now);
    })
    .where(function () {
      this.whereNull('last_nudged_at').orWhere('last_nudged_at', '<', thirtyMinutesAgo);
    })
    .orderByRaw('CASE priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 END')
    .orderBy('due_date', 'asc')
    .limit(10);
}

// Get todos by energy level (for matching to time of day)
export async function getTodosByEnergyLevel(level: EnergyLevel): Promise<Todo[]> {
  const now = new Date().toISOString();

  return db('todos')
    .select('*')
    .whereNull('completed_at')
    .where({ energy_level: level })
    .where(function () {
      this.whereNull('snoozed_until').orWhere('snoozed_until', '<', now);
    })
    .orderByRaw('CASE priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 END')
    .orderBy('due_date', 'asc');
}

// Helper: Create next occurrence for recurring task
async function createNextRecurrence(todo: Todo): Promise<void> {
  if (!todo.recurrence_pattern) return;

  try {
    const pattern = JSON.parse(todo.recurrence_pattern);
    let nextDate: Date | null = null;

    if (todo.due_date) {
      const currentDue = new Date(todo.due_date);

      switch (pattern.frequency) {
        case 'daily':
          nextDate = new Date(currentDue);
          nextDate.setDate(nextDate.getDate() + (pattern.interval || 1));
          break;
        case 'weekly':
          nextDate = new Date(currentDue);
          nextDate.setDate(nextDate.getDate() + 7 * (pattern.interval || 1));
          break;
        case 'monthly':
          nextDate = new Date(currentDue);
          nextDate.setMonth(nextDate.getMonth() + (pattern.interval || 1));
          break;
      }
    }

    await createTodo({
      title: todo.title,
      description: todo.description || undefined,
      priority: todo.priority,
      energy_level: todo.energy_level,
      estimated_minutes: todo.estimated_minutes || undefined,
      due_date: nextDate ? nextDate.toISOString().split('T')[0] : undefined,
      due_time: todo.due_time || undefined,
      context: todo.context,
      is_recurring: true,
      recurrence_pattern: todo.recurrence_pattern,
    });
  } catch (error) {
    console.error('Failed to create next recurrence:', error);
  }
}
