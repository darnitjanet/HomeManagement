import { Router } from 'express';
import * as choresController from '../controllers/chores.controller';

const router = Router();

// Chore Definitions (Admin)
router.get('/definitions', choresController.getAllDefinitions);
router.post('/definitions', choresController.createDefinition);
router.get('/definitions/:id', choresController.getDefinition);
router.put('/definitions/:id', choresController.updateDefinition);
router.delete('/definitions/:id', choresController.deleteDefinition);

// Chore Instances (User-facing)
router.get('/today', choresController.getTodaysChores);
router.get('/upcoming', choresController.getUpcomingChores);
router.get('/kid/:kidId', choresController.getChoresByKid);
router.get('/instances/:id', choresController.getChoreInstance);

// Completion
router.put('/instances/:id/complete', choresController.completeChore);
router.put('/instances/:id/uncomplete', choresController.uncompleteChore);

export default router;
