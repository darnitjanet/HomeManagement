import { Router } from 'express';
import * as seasonalTaskController from '../controllers/seasonal-task.controller';

const router = Router();

// Get all seasonal tasks
router.get('/', seasonalTaskController.getAllSeasonalTasks);

// Get only active seasonal tasks
router.get('/active', seasonalTaskController.getActiveSeasonalTasks);

// Get upcoming/due seasonal tasks (for reminders)
router.get('/upcoming', seasonalTaskController.getUpcomingSeasonalTasks);

// Get single seasonal task
router.get('/:id', seasonalTaskController.getSeasonalTaskById);

// Create seasonal task
router.post('/', seasonalTaskController.createSeasonalTask);

// Update seasonal task
router.put('/:id', seasonalTaskController.updateSeasonalTask);

// Delete seasonal task
router.delete('/:id', seasonalTaskController.deleteSeasonalTask);

// Mark seasonal task as completed for current period
router.post('/:id/complete', seasonalTaskController.markSeasonalTaskCompleted);

export default router;
