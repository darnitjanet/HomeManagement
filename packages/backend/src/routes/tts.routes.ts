import { Router } from 'express';
import { ttsController } from '../controllers/tts.controller';

const router = Router();

// POST /api/tts/speak - Speak text
router.post('/speak', ttsController.speak);

// POST /api/tts/stop - Stop speaking
router.post('/stop', ttsController.stop);

// GET /api/tts/status - Check TTS availability
router.get('/status', ttsController.status);

export default router;
