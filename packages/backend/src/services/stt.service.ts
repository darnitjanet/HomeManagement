import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

interface STTResult {
  success: boolean;
  text?: string;
  error?: string;
}

class STTService {
  private scriptPath: string;
  private pythonPath: string = 'python3';

  constructor() {
    // Path to the Python STT script
    this.scriptPath = path.join(__dirname, '../scripts/stt.py');
  }

  /**
   * Convert audio file to WAV format using ffmpeg (for non-WAV inputs like webm)
   */
  private async convertToWav(inputPath: string): Promise<string> {
    const wavPath = inputPath.replace(/\.[^.]+$/, '') + '_converted.wav';
    await execAsync(
      `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -f wav "${wavPath}"`,
      { timeout: 15000 }
    );
    return wavPath;
  }

  /**
   * Transcribe audio file to text using Vosk
   * @param audioPath Path to audio file (WAV or webm - webm is auto-converted)
   */
  async transcribe(audioPath: string): Promise<STTResult> {
    let wavPath = audioPath;
    let needsCleanup = false;

    try {
      console.log('[STT] Transcribing:', audioPath);

      // Check if script exists
      if (!fs.existsSync(this.scriptPath)) {
        return { success: false, error: 'STT script not found' };
      }

      // If not a WAV file, convert using ffmpeg
      if (!audioPath.endsWith('.wav')) {
        console.log('[STT] Converting non-WAV audio to WAV...');
        wavPath = await this.convertToWav(audioPath);
        needsCleanup = true;
      }

      // Run the Python script
      const { stdout, stderr } = await execAsync(
        `${this.pythonPath} "${this.scriptPath}" "${wavPath}"`,
        { timeout: 30000 }
      );

      if (stderr) {
        console.error('[STT] stderr:', stderr);
      }

      // Parse JSON result
      const result = JSON.parse(stdout.trim());
      console.log('[STT] Result:', result);

      return result;
    } catch (error: any) {
      console.error('[STT] Error:', error.message);
      return { success: false, error: error.message };
    } finally {
      // Clean up converted file
      if (needsCleanup && fs.existsSync(wavPath)) {
        fs.unlink(wavPath, () => {});
      }
    }
  }

  /**
   * Transcribe audio buffer (saves to temp file first)
   * @param buffer Audio data buffer
   */
  async transcribeBuffer(buffer: Buffer): Promise<STTResult> {
    const tempFile = path.join(os.tmpdir(), `stt_${Date.now()}.wav`);

    try {
      // Write buffer to temp file
      fs.writeFileSync(tempFile, buffer);

      // Transcribe
      const result = await this.transcribe(tempFile);

      // Clean up
      fs.unlinkSync(tempFile);

      return result;
    } catch (error: any) {
      // Clean up on error
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if STT is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if Python and vosk are available
      await execAsync('python3 -c "import vosk"');
      return true;
    } catch {
      return false;
    }
  }
}

export const sttService = new STTService();
