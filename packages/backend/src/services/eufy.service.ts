/**
 * Eufy Security Service
 *
 * Uses the eufy-security-client library (unofficial).
 * To use this, you need to:
 * 1. npm install eufy-security-client
 * 2. Set EUFY_EMAIL and EUFY_PASSWORD environment variables
 *
 * Note: Eufy doesn't have an official API, so this uses reverse-engineered endpoints.
 * The library may break if Eufy changes their API.
 */

export interface EufyCamera {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  online: boolean;
  batteryLevel: number;
  lastChargingDays: number;
  motionDetected: boolean;
}

export interface EufyCameraSnapshot {
  id: string;
  timestamp: Date;
  imageUrl: string;
  imageBase64?: string;
}

// Dynamic import to avoid errors if library is not installed
let EufySecurity: any = null;

async function loadEufyClient() {
  if (EufySecurity) return EufySecurity;

  try {
    // Use dynamic require to avoid TypeScript module resolution
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const module = require('eufy-security-client');
    EufySecurity = module.EufySecurity;
    return EufySecurity;
  } catch (error) {
    console.log('[Eufy] eufy-security-client not installed - service disabled');
    return null;
  }
}

class EufyService {
  private email: string | null = null;
  private password: string | null = null;
  private client: any = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.email = process.env.EUFY_EMAIL || null;
    this.password = process.env.EUFY_PASSWORD || null;

    if (this.email && this.password) {
      console.log('[Eufy] Service configured with credentials');
    } else {
      console.log('[Eufy] Missing email or password - service disabled');
    }
  }

  isConfigured(): boolean {
    return !!(this.email && this.password);
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    if (!this.isConfigured()) {
      throw new Error('Eufy credentials not configured');
    }

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    try {
      const EufySecurityClass = await loadEufyClient();
      if (!EufySecurityClass) {
        throw new Error('eufy-security-client library not installed');
      }

      this.client = await EufySecurityClass.initialize({
        username: this.email!,
        password: this.password!,
        country: 'US',
        language: 'en',
        persistentDir: './eufy-data',
        trustedDeviceName: 'home-management-kiosk',
      });

      // Connect to the API
      await this.client.connect();
      this.initialized = true;
      console.log('[Eufy] Connected successfully');
    } catch (error: any) {
      console.error('[Eufy] Failed to initialize:', error.message);
      this.initPromise = null;
      throw error;
    }
  }

  async getCameras(): Promise<EufyCamera[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      await this.initialize();

      const cameras: EufyCamera[] = [];
      const stations = this.client.getStations();

      for (const station of Object.values(stations) as any[]) {
        const devices = station.getDevices();

        for (const device of Object.values(devices) as any[]) {
          // Check if it's a camera
          if (device.isCamera()) {
            cameras.push({
              id: device.getSerial(),
              name: device.getName(),
              model: device.getModel(),
              serialNumber: device.getSerial(),
              online: device.isOnline(),
              batteryLevel: device.getBatteryValue() ?? 100,
              lastChargingDays: device.getLastChargingDays() ?? 0,
              motionDetected: device.isMotionDetected(),
            });
          }
        }
      }

      return cameras;
    } catch (error: any) {
      console.error('[Eufy] Failed to get cameras:', error.message);
      // Return empty array on error rather than throwing
      return [];
    }
  }

  async getCameraSnapshot(cameraId: string): Promise<EufyCameraSnapshot | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      await this.initialize();

      // Find the camera device
      const stations = this.client.getStations();
      let targetDevice: any = null;

      for (const station of Object.values(stations) as any[]) {
        const devices = station.getDevices();
        for (const device of Object.values(devices) as any[]) {
          if (device.getSerial() === cameraId) {
            targetDevice = device;
            break;
          }
        }
        if (targetDevice) break;
      }

      if (!targetDevice) {
        return null;
      }

      // Get the last picture URL
      const pictureUrl = targetDevice.getPictureUrl();

      if (pictureUrl) {
        return {
          id: cameraId,
          timestamp: new Date(),
          imageUrl: pictureUrl,
        };
      }

      return null;
    } catch (error: any) {
      console.error('[Eufy] Failed to get camera snapshot:', error.message);
      return null;
    }
  }

  async getCameraStatus(cameraId: string): Promise<Partial<EufyCamera> | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const cameras = await this.getCameras();
      return cameras.find(c => c.id === cameraId) || null;
    } catch (error: any) {
      console.error('[Eufy] Failed to get camera status:', error.message);
      return null;
    }
  }

  // Cleanup when shutting down
  async disconnect(): Promise<void> {
    if (this.client && this.initialized) {
      try {
        await this.client.close();
        this.initialized = false;
        this.client = null;
        console.log('[Eufy] Disconnected');
      } catch (error: any) {
        console.error('[Eufy] Error during disconnect:', error.message);
      }
    }
  }
}

export const eufyService = new EufyService();
