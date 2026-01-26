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
   * Transcribe audio file to text using Vosk
   * @param audioPath Path to WAV audio file
   */
  async transcribe(audioPath: string): Promise<STTResult> {
    try {
      console.log('[STT] Transcribing:', audioPath);

      // Check if script exists
      if (!fs.existsSync(this.scriptPath)) {
        return { success: false, error: 'STT script not found' };
      }

      // Run the Python script
      const { stdout, stderr } = await execAsync(
        `${this.pythonPath} "${this.scriptPath}" "${audioPath}"`,
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
