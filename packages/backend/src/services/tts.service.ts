import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

interface TTSOptions {
  speed?: number;  // Speech rate multiplier (0.5 to 2.0, default 1.0)
  volume?: number; // Volume (0-100, default 100)
}

class TTSService {
  private isPlaying: boolean = false;
  private queue: Array<{ text: string; options: TTSOptions; resolve: () => void }> = [];
  private piperPath: string = '/home/pi/.local/bin/piper';
  private piperModel: string = '/home/pi/.local/share/piper/en_US-lessac-medium.onnx';
  private usePiper: boolean = true;

  constructor() {
    // Check if Piper is available, fall back to espeak-ng
    this.checkPiper();
  }

  private async checkPiper(): Promise<void> {
    try {
      await execAsync(`${this.piperPath} --help`);
      console.log('[TTS] Using Piper neural TTS');
      this.usePiper = true;
    } catch {
      console.log('[TTS] Piper not available, falling back to espeak-ng');
      this.usePiper = false;
    }
  }

  /**
   * Speak text using Piper (neural TTS) or espeak-ng (fallback)
   */
  async speak(text: string, options: TTSOptions = {}): Promise<void> {
    return new Promise((resolve) => {
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
      if (this.usePiper) {
        await this.playWithPiper(item.text, item.options);
      } else {
        await this.playWithEspeak(item.text, item.options);
      }
      item.resolve();
    } catch (error) {
      console.error('[TTS] Error speaking:', error);
      item.resolve();
    }

    this.isPlaying = false;
    this.processQueue();
  }

  private playWithPiper(text: string, options: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const tempFile = path.join(os.tmpdir(), `tts_${Date.now()}.wav`);

      console.log('[TTS/Piper] Speaking:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));

      // Build piper command
      const piperArgs = [
        '--model', this.piperModel,
        '--output_file', tempFile
      ];

      // Speed adjustment via length_scale (lower = faster)
      if (options.speed && options.speed !== 1) {
        const lengthScale = 1 / options.speed; // Invert: speed 2 = length_scale 0.5
        piperArgs.push('--length-scale', String(Math.max(0.5, Math.min(2.0, lengthScale))));
      }

      const piper = spawn(this.piperPath, piperArgs, {
        stdio: ['pipe', 'ignore', 'ignore'],
        env: { ...process.env, PATH: `${process.env.PATH}:/home/pi/.local/bin` }
      });

      piper.stdin.write(text);
      piper.stdin.end();

      piper.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`Piper exited with code ${code}`));
          return;
        }

        // Play the generated audio
        try {
          await this.playWavFile(tempFile);
          // Clean up temp file
          fs.unlink(tempFile, () => {});
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      piper.on('error', (err) => {
        console.error('[TTS/Piper] Process error:', err.message);
        reject(err);
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        piper.kill();
        fs.unlink(tempFile, () => {});
        resolve();
      }, 60000);
    });
  }

  private playWavFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const player = spawn('pw-play', [filePath], {
        stdio: ['ignore', 'ignore', 'ignore']
      });

      player.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`pw-play exited with code ${code}`));
        }
      });

      player.on('error', (err) => {
        reject(err);
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        player.kill();
        resolve();
      }, 60000);
    });
  }

  private playWithEspeak(text: string, options: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const args: string[] = [];

      // Speed (words per minute, default 175)
      if (options.speed) {
        args.push('-s', String(Math.round(175 * options.speed)));
      }

      // Volume (0-200)
      if (options.volume !== undefined) {
        args.push('-a', String(Math.min(options.volume * 2, 200)));
      }

      args.push('-v', 'en-us');
      args.push(text);

      console.log('[TTS/espeak] Speaking:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));

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
        console.error('[TTS/espeak] Not available:', err.message);
        resolve();
      });

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
    spawn('pkill', ['-f', 'piper'], { stdio: 'ignore' });
    spawn('pkill', ['-f', 'pw-play'], { stdio: 'ignore' });
    spawn('pkill', ['-f', 'espeak-ng'], { stdio: 'ignore' });
  }

  /**
   * Check if TTS is available on this system
   */
  async isAvailable(): Promise<boolean> {
    // Check for Piper first
    try {
      await execAsync(`${this.piperPath} --help`);
      return true;
    } catch {
      // Fall back to espeak-ng check
      return new Promise((resolve) => {
        const process = spawn('which', ['espeak-ng'], { stdio: 'pipe' });
        process.on('close', (code) => resolve(code === 0));
        process.on('error', () => resolve(false));
      });
    }
  }
}

export const ttsService = new TTSService();
