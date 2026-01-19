import axios from 'axios';

const GOVEE_API_URL = 'https://developer-api.govee.com/v1';

export interface GoveeDevice {
  device: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  retrievable: boolean;
  supportCmds: string[];
  properties?: {
    colorTem?: { range: { min: number; max: number } };
  };
}

export interface GoveeDeviceState {
  device: string;
  model: string;
  online: boolean;
  powerState: 'on' | 'off';
  brightness: number;
  color?: { r: number; g: number; b: number };
  colorTem?: number;
}

export interface GoveeControlCommand {
  device: string;
  model: string;
  cmd: {
    name: 'turn' | 'brightness' | 'color' | 'colorTem';
    value: string | number | { r: number; g: number; b: number };
  };
}

class GoveeService {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.GOVEE_API_KEY || null;
    if (this.apiKey) {
      console.log('[Govee] Service initialized with API key');
    } else {
      console.log('[Govee] No API key configured - service disabled');
    }
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  private getHeaders() {
    if (!this.apiKey) {
      throw new Error('Govee API key not configured');
    }
    return {
      'Govee-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  async getDevices(): Promise<GoveeDevice[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await axios.get(`${GOVEE_API_URL}/devices`, {
        headers: this.getHeaders(),
      });

      if (response.data.code === 200 && response.data.data?.devices) {
        return response.data.data.devices;
      }
      return [];
    } catch (error: any) {
      console.error('[Govee] Failed to get devices:', error.message);
      throw error;
    }
  }

  async getDeviceState(device: string, model: string): Promise<GoveeDeviceState | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await axios.get(`${GOVEE_API_URL}/devices/state`, {
        headers: this.getHeaders(),
        params: { device, model },
      });

      if (response.data.code === 200 && response.data.data?.properties) {
        const props = response.data.data.properties;
        const state: GoveeDeviceState = {
          device,
          model,
          online: props.find((p: any) => p.online !== undefined)?.online ?? true,
          powerState: props.find((p: any) => p.powerState)?.powerState ?? 'off',
          brightness: props.find((p: any) => p.brightness !== undefined)?.brightness ?? 0,
        };

        const colorProp = props.find((p: any) => p.color);
        if (colorProp) {
          state.color = colorProp.color;
        }

        const colorTemProp = props.find((p: any) => p.colorTem !== undefined);
        if (colorTemProp) {
          state.colorTem = colorTemProp.colorTem;
        }

        return state;
      }
      return null;
    } catch (error: any) {
      console.error('[Govee] Failed to get device state:', error.message);
      throw error;
    }
  }

  async controlDevice(command: GoveeControlCommand): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Govee API key not configured');
    }

    try {
      const response = await axios.put(
        `${GOVEE_API_URL}/devices/control`,
        command,
        { headers: this.getHeaders() }
      );

      return response.data.code === 200;
    } catch (error: any) {
      console.error('[Govee] Failed to control device:', error.message);
      throw error;
    }
  }

  async turnOn(device: string, model: string): Promise<boolean> {
    return this.controlDevice({
      device,
      model,
      cmd: { name: 'turn', value: 'on' },
    });
  }

  async turnOff(device: string, model: string): Promise<boolean> {
    return this.controlDevice({
      device,
      model,
      cmd: { name: 'turn', value: 'off' },
    });
  }

  async setBrightness(device: string, model: string, brightness: number): Promise<boolean> {
    // Brightness should be 0-100
    const value = Math.max(0, Math.min(100, brightness));
    return this.controlDevice({
      device,
      model,
      cmd: { name: 'brightness', value },
    });
  }

  async setColor(device: string, model: string, r: number, g: number, b: number): Promise<boolean> {
    return this.controlDevice({
      device,
      model,
      cmd: { name: 'color', value: { r, g, b } },
    });
  }

  async setColorTemperature(device: string, model: string, colorTem: number): Promise<boolean> {
    return this.controlDevice({
      device,
      model,
      cmd: { name: 'colorTem', value: colorTem },
    });
  }
}

export const goveeService = new GoveeService();
