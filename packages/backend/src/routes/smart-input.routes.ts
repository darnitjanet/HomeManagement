import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.middleware';
import * as smartInputController from '../controllers/smart-input.controller';

const router = Router();

// Process natural language input
// Uses optionalAuth since shopping doesn't need auth, but calendar does
router.post('/process', optionalAuth, smartInputController.processSmartInput);

export default router;
