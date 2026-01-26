import { Request, Response } from 'express';
import { ttsService } from '../services/tts.service';

export const ttsController = {
  /**
   * POST /api/tts/speak
   * Speak text using the system TTS engine
   */
  async speak(req: Request, res: Response): Promise<void> {
    try {
      const { text, speed, pitch, volume, voice } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Text is required'
        });
        return;
      }

      // Don't wait for speech to complete - just queue it
      ttsService.speak(text, { speed, pitch, volume, voice });

      res.json({
        success: true,
        message: 'Speech queued'
      });
    } catch (error) {
      console.error('[TTS] Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to speak text'
      });
    }
  },

  /**
   * POST /api/tts/stop
   * Stop current speech and clear queue
   */
  async stop(_req: Request, res: Response): Promise<void> {
    try {
      ttsService.stop();
      res.json({
        success: true,
        message: 'Speech stopped'
      });
    } catch (error) {
      console.error('[TTS] Error stopping:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop speech'
      });
    }
  },

  /**
   * GET /api/tts/status
   * Check if TTS is available
   */
  async status(_req: Request, res: Response): Promise<void> {
    try {
      const available = await ttsService.isAvailable();
      res.json({
        success: true,
        data: {
          available,
          engine: 'espeak-ng'
        }
      });
    } catch (error) {
      console.error('[TTS] Error checking status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check TTS status'
      });
    }
  }
};
