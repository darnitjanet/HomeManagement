import { Router } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as os from 'os';
import { sttController } from '../controllers/stt.controller';

const router = Router();

// Configure multer for audio upload
const upload = multer({
  dest: path.join(os.tmpdir(), 'stt-uploads'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/') || file.originalname.endsWith('.wav') || file.originalname.endsWith('.webm')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// POST /api/stt/transcribe - Transcribe audio file
router.post('/transcribe', upload.single('audio'), sttController.transcribe);

// GET /api/stt/status - Check STT availability
router.get('/status', sttController.status);

export default router;
