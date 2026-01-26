import { spawn } from 'child_process';

interface TTSOptions {
  speed?: number;  // Words per minute (default 175)
  pitch?: number;  // Pitch adjustment (0-99, default 50)
  volume?: number; // Volume (0-100, default 100)
  voice?: string;  // Voice name (default 'en')
}

class TTSService {
  private isPlaying: boolean = false;
  private queue: Array<{ text: string; options: TTSOptions; resolve: () => void }> = [];

  /**
   * Speak text using espeak-ng
   * Returns a promise that resolves when speech is complete
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      // Add to queue
      this.queue.push({ text, options, resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isPlaying || this.queue.length === 0) {
      return;
    }

    this.isPlaying = true;
    const item = this.queue.shift()!;

    try {
      await this.playText(item.text, item.options);
      item.resolve();
    } catch (error) {
      console.error('[TTS] Error speaking:', error);
      item.resolve(); // Resolve anyway to not block queue
    }

    this.isPlaying = false;
    this.processQueue();
  }

  private playText(text: string, options: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const args: string[] = [];

      // Speed (words per minute)
      if (options.speed) {
        args.push('-s', String(options.speed));
      }

      // Pitch (0-99)
      if (options.pitch !== undefined) {
        args.push('-p', String(options.pitch));
      }

      // Volume (0-200, but we'll cap at 100 for sanity)
      if (options.volume !== undefined) {
        args.push('-a', String(Math.min(options.volume * 2, 200)));
      }

      // Voice
      args.push('-v', options.voice || 'en');

      // The text to speak
      args.push(text);

      console.log('[TTS] Speaking:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));

      const process = spawn('espeak-ng', args, {
        stdio: ['ignore', 'ignore', 'pipe']
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`espeak-ng exited with code ${code}`));
        }
      });

      process.on('error', (err) => {
        // espeak-ng not installed or not available
        console.error('[TTS] espeak-ng not available:', err.message);
        resolve(); // Don't fail, just skip
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        process.kill();
        resolve();
      }, 30000);
    });
  }

  /**
   * Stop any current speech and clear the queue
   */
  stop(): void {
    this.queue = [];
    // Kill any running espeak-ng process
    spawn('pkill', ['-f', 'espeak-ng'], { stdio: 'ignore' });
  }

  /**
   * Check if TTS is available on this system
   */
  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('which', ['espeak-ng'], { stdio: 'pipe' });
      process.on('close', (code) => {
        resolve(code === 0);
      });
      process.on('error', () => {
        resolve(false);
      });
    });
  }
}

export const ttsService = new TTSService();
