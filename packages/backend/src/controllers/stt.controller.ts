import { Request, Response } from 'express';
import { sttService } from '../services/stt.service';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export const sttController = {
  /**
   * POST /api/stt/transcribe
   * Transcribe audio to text
   * Expects multipart/form-data with 'audio' file field
   */
  async transcribe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No audio file provided'
        });
        return;
      }

      // The file is already saved by multer middleware
      const result = await sttService.transcribe(req.file.path);

      // Clean up uploaded file
      fs.unlink(req.file.path, () => {});

      if (result.success) {
        res.json({
          success: true,
          data: { text: result.text }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('[STT] Controller error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to transcribe audio'
      });
    }
  },

  /**
   * GET /api/stt/status
   * Check if STT is available
   */
  async status(_req: Request, res: Response): Promise<void> {
    try {
      const available = await sttService.isAvailable();
      res.json({
        success: true,
        data: {
          available,
          engine: 'vosk'
        }
      });
    } catch (error) {
      console.error('[STT] Status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check STT status'
      });
    }
  }
};
