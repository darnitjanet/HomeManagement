import { Request, Response } from 'express';
import { seasonalTaskRepository } from '../repositories/seasonal-task.repository';

export async function getAllSeasonalTasks(req: Request, res: Response) {
  try {
    const tasks = await seasonalTaskRepository.getAll();
    res.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error('Error getting seasonal tasks:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getActiveSeasonalTasks(req: Request, res: Response) {
  try {
    const tasks = await seasonalTaskRepository.getActive();
    res.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error('Error getting active seasonal tasks:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSeasonalTaskById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const task = await seasonalTaskRepository.getById(id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Seasonal task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error: any) {
    console.error('Error getting seasonal task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createSeasonalTask(req: Request, res: Response) {
  try {
    const { title, description, category, seasons, months, reminder_day, reminder_days_before, priority, estimated_minutes } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    if ((!seasons || seasons.length === 0) && (!months || months.length === 0)) {
      return res.status(400).json({ success: false, message: 'Either seasons or months must be specified' });
    }

    const task = await seasonalTaskRepository.create({
      title,
      description,
      category,
      seasons,
      months,
      reminder_day,
      reminder_days_before,
      priority,
      estimated_minutes,
    });

    res.status(201).json({ success: true, data: task });
  } catch (error: any) {
    console.error('Error creating seasonal task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateSeasonalTask(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { title, description, category, seasons, months, reminder_day, reminder_days_before, priority, estimated_minutes, is_active } = req.body;

    const task = await seasonalTaskRepository.update(id, {
      title,
      description,
      category,
      seasons,
      months,
      reminder_day,
      reminder_days_before,
      priority,
      estimated_minutes,
      is_active,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Seasonal task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error: any) {
    console.error('Error updating seasonal task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteSeasonalTask(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const deleted = await seasonalTaskRepository.delete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Seasonal task not found' });
    }

    res.json({ success: true, message: 'Seasonal task deleted' });
  } catch (error: any) {
    console.error('Error deleting seasonal task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function markSeasonalTaskCompleted(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const task = await seasonalTaskRepository.markCompleted(id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Seasonal task not found' });
    }

    res.json({ success: true, data: task });
  } catch (error: any) {
    console.error('Error marking seasonal task completed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getUpcomingSeasonalTasks(req: Request, res: Response) {
  try {
    const tasks = await seasonalTaskRepository.getTasksNeedingReminders();
    res.json({ success: true, data: tasks });
  } catch (error: any) {
    console.error('Error getting upcoming seasonal tasks:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
