import { Router, Request, Response } from 'express';
import * as todoRepository from '../repositories/todo.repository';
import {
  breakdownTask,
  generateNudge,
  suggestNextTask,
  isAIEnabled,
} from '../services/ai.service';

const router = Router();

// =====================
// BASIC CRUD
// =====================

// GET /api/todos - Get all todos
router.get('/', async (req: Request, res: Response) => {
  try {
    const includeCompleted = req.query.includeCompleted === 'true';
    const todos = await todoRepository.getAllTodos(includeCompleted);
    res.json({ success: true, data: todos });
  } catch (error) {
    console.error('Error fetching todos:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch todos' });
  }
});

// GET /api/todos/today - Get todos for today (for regular view)
router.get('/today', async (req: Request, res: Response) => {
  try {
    const todos = await todoRepository.getTodaysTodos();
    res.json({ success: true, data: todos });
  } catch (error) {
    console.error('Error fetching today todos:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch today todos' });
  }
});

// GET /api/todos/kiosk - Get limited todos for kiosk display
router.get('/kiosk', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const todos = await todoRepository.getKioskTodos(limit);
    res.json({ success: true, data: todos });
  } catch (error) {
    console.error('Error fetching kiosk todos:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch kiosk todos' });
  }
});

// GET /api/todos/:id - Get a specific todo
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const todo = await todoRepository.getTodoById(id);

    if (!todo) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }

    res.json({ success: true, data: todo });
  } catch (error) {
    console.error('Error fetching todo:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch todo' });
  }
});

// GET /api/todos/:id/subtasks - Get subtasks for a todo
router.get('/:id/subtasks', async (req: Request, res: Response) => {
  try {
    const parentId = parseInt(req.params.id);
    const subtasks = await todoRepository.getSubtasks(parentId);
    res.json({ success: true, data: subtasks });
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subtasks' });
  }
});

// POST /api/todos - Create a new todo
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      priority,
      energy_level,
      estimated_minutes,
      due_date,
      due_time,
      context,
      parent_id,
      is_recurring,
      recurrence_pattern,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const todo = await todoRepository.createTodo({
      title: title.trim(),
      description,
      priority,
      energy_level,
      estimated_minutes,
      due_date,
      due_time,
      context,
      parent_id,
      is_recurring,
      recurrence_pattern,
    });

    res.status(201).json({ success: true, data: todo });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ success: false, error: 'Failed to create todo' });
  }
});

// PUT /api/todos/:id - Update a todo
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updateData = req.body;

    const todo = await todoRepository.updateTodo(id, updateData);

    if (!todo) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }

    res.json({ success: true, data: todo });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ success: false, error: 'Failed to update todo' });
  }
});

// PUT /api/todos/:id/complete - Mark todo as complete
router.put('/:id/complete', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const todo = await todoRepository.completeTodo(id);

    if (!todo) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }

    res.json({ success: true, data: todo });
  } catch (error) {
    console.error('Error completing todo:', error);
    res.status(500).json({ success: false, error: 'Failed to complete todo' });
  }
});

// PUT /api/todos/:id/uncomplete - Undo completion
router.put('/:id/uncomplete', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const todo = await todoRepository.uncompleteTodo(id);

    if (!todo) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }

    res.json({ success: true, data: todo });
  } catch (error) {
    console.error('Error uncompleting todo:', error);
    res.status(500).json({ success: false, error: 'Failed to uncomplete todo' });
  }
});

// PUT /api/todos/:id/snooze - Snooze a todo
router.put('/:id/snooze', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { until } = req.body;

    if (!until) {
      return res.status(400).json({ success: false, error: 'Snooze until time is required' });
    }

    const todo = await todoRepository.snoozeTodo(id, until);

    if (!todo) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }

    res.json({ success: true, data: todo });
  } catch (error) {
    console.error('Error snoozing todo:', error);
    res.status(500).json({ success: false, error: 'Failed to snooze todo' });
  }
});

// DELETE /api/todos/:id - Delete a todo
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await todoRepository.deleteTodo(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }

    res.json({ success: true, message: 'Todo deleted' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ success: false, error: 'Failed to delete todo' });
  }
});

// =====================
// AI FEATURES
// =====================

// GET /api/todos/ai/status - Check if AI is enabled
router.get('/ai/status', async (_req: Request, res: Response) => {
  res.json({ success: true, data: { aiEnabled: isAIEnabled() } });
});

// POST /api/todos/:id/breakdown - Break down a task into subtasks using AI
router.post('/:id/breakdown', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const todo = await todoRepository.getTodoById(id);

    if (!todo) {
      return res.status(404).json({ success: false, error: 'Todo not found' });
    }

    const breakdown = await breakdownTask(todo.title, todo.description || undefined);

    if (!breakdown.subtasks || breakdown.subtasks.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to break down task' });
    }

    // Create the subtasks
    const subtasks = await todoRepository.createTodos(
      breakdown.subtasks.map((subtask) => ({
        title: subtask.title,
        parent_id: id,
        energy_level: subtask.energy_level,
        estimated_minutes: subtask.estimated_minutes,
        sort_order: subtask.order,
        priority: todo.priority, // Inherit parent priority
        context: todo.context, // Inherit parent context
      }))
    );

    res.json({ success: true, data: subtasks });
  } catch (error: any) {
    console.error('Error breaking down task:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to break down task',
    });
  }
});

// GET /api/todos/ai/nudge - Get a rotating AI nudge for a task
router.get('/ai/nudge', async (req: Request, res: Response) => {
  try {
    const todos = await todoRepository.getNudgeableTodos();

    if (todos.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No tasks to nudge about',
      });
    }

    // Pick a random task from the top candidates
    const candidates = todos.slice(0, Math.min(5, todos.length));
    const selectedTodo = candidates[Math.floor(Math.random() * candidates.length)];

    // Determine time of day
    const hour = new Date().getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'afternoon';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour >= 18) timeOfDay = 'evening';

    // Generate the nudge
    const nudge = await generateNudge(
      {
        id: selectedTodo.id,
        title: selectedTodo.title,
        priority: selectedTodo.priority,
        estimated_minutes: selectedTodo.estimated_minutes,
      },
      {
        timeOfDay,
        currentEnergyMatch: true, // Simplified - could check energy_level vs time of day
        hasUpcomingEvent: false, // Could integrate with calendar
      }
    );

    // Mark the task as nudged
    await todoRepository.markNudged(selectedTodo.id);

    res.json({ success: true, data: nudge });
  } catch (error) {
    console.error('Error generating nudge:', error);
    res.status(500).json({ success: false, error: 'Failed to generate nudge' });
  }
});

// GET /api/todos/ai/suggest - Get AI suggestion for what to do next
router.get('/ai/suggest', async (req: Request, res: Response) => {
  try {
    const availableMinutes = req.query.minutes
      ? parseInt(req.query.minutes as string)
      : undefined;
    const location = (req.query.location as string) || 'home';

    const todos = await todoRepository.getKioskTodos(10);

    if (todos.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No tasks available',
      });
    }

    // Determine time of day
    const hour = new Date().getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'afternoon';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour >= 18) timeOfDay = 'evening';

    const suggestion = await suggestNextTask(
      todos.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        energy_level: t.energy_level,
        estimated_minutes: t.estimated_minutes,
        due_date: t.due_date,
        context: t.context,
      })),
      {
        timeOfDay,
        availableMinutes,
        currentLocation: location,
      }
    );

    if (!suggestion) {
      return res.json({
        success: true,
        data: null,
        message: 'Could not determine suggestion',
      });
    }

    const suggestedTodo = todos.find((t) => t.id === suggestion.todoId);

    res.json({
      success: true,
      data: {
        todo: suggestedTodo,
        reason: suggestion.reason,
      },
    });
  } catch (error) {
    console.error('Error getting suggestion:', error);
    res.status(500).json({ success: false, error: 'Failed to get suggestion' });
  }
});

// GET /api/todos/energy/:level - Get todos by energy level
router.get('/energy/:level', async (req: Request, res: Response) => {
  try {
    const level = req.params.level as 'low' | 'medium' | 'high';

    if (!['low', 'medium', 'high'].includes(level)) {
      return res.status(400).json({ success: false, error: 'Invalid energy level' });
    }

    const todos = await todoRepository.getTodosByEnergyLevel(level);
    res.json({ success: true, data: todos });
  } catch (error) {
    console.error('Error fetching todos by energy:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch todos' });
  }
});

export default router;
