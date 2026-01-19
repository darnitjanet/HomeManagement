import axios from 'axios';

const ECOBEE_API_URL = 'https://api.ecobee.com';

export interface EcobeeThermostat {
  identifier: string;
  name: string;
  thermostatRev: string;
  isRegistered: boolean;
  modelNumber: string;
  brand: string;
  features: string;
  lastModified: string;
  thermostatTime: string;
  utcTime: string;
  runtime?: {
    runtimeRev: string;
    connected: boolean;
    firstConnected: string;
    connectDateTime: string;
    disconnectDateTime: string;
    lastModified: string;
    actualTemperature: number; // In 10ths of degrees F
    actualHumidity: number;
    rawTemperature: number;
    desiredHeat: number;
    desiredCool: number;
    desiredHumidity: number;
    desiredFanMode: string;
  };
  settings?: {
    hvacMode: 'heat' | 'cool' | 'auto' | 'auxHeatOnly' | 'off';
    lastServiceDate: string;
    serviceRemindMe: boolean;
    heatStages: number;
    coolStages: number;
    humidifierMode: string;
    ventilatorType: string;
    fanMinOnTime: number;
  };
  equipmentStatus?: string;
}

export interface EcobeeThermostatState {
  id: string;
  name: string;
  online: boolean;
  currentTemperature: number; // In degrees F
  targetTemperature: number;
  humidity: number;
  mode: 'heat' | 'cool' | 'auto' | 'auxHeatOnly' | 'off';
  equipmentRunning: string[];
}

class EcobeeService {
  private apiKey: string | null = null;
  private refreshToken: string | null = null;
  private accessToken: string | null = null;
  private accessTokenExpiry: number = 0;

  constructor() {
    this.apiKey = process.env.ECOBEE_API_KEY || null;
    this.refreshToken = process.env.ECOBEE_REFRESH_TOKEN || null;

    if (this.apiKey && this.refreshToken) {
      console.log('[Ecobee] Service initialized with API key and refresh token');
    } else {
      console.log('[Ecobee] Missing API key or refresh token - service disabled');
    }
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.refreshToken);
  }

  private async getAccessToken(): Promise<string> {
    if (!this.apiKey || !this.refreshToken) {
      throw new Error('Ecobee API key or refresh token not configured');
    }

    // Check if we have a valid access token
    if (this.accessToken && Date.now() < this.accessTokenExpiry) {
      return this.accessToken;
    }

    // Refresh the token
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.apiKey,
      });

      const response = await axios.post(
        `${ECOBEE_API_URL}/token`,
        params.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      // Token expires in ~60 minutes, refresh 5 minutes early
      this.accessTokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

      // Note: In production, you'd want to persist the new refresh token
      console.log('[Ecobee] Access token refreshed');
      return this.accessToken!;
    } catch (error: any) {
      console.error('[Ecobee] Failed to refresh token:', error.message);
      throw error;
    }
  }

  private async makeRequest(path: string, method: 'get' | 'post' = 'get', body?: any): Promise<any> {
    const token = await this.getAccessToken();

    const config: any = {
      method,
      url: `${ECOBEE_API_URL}${path}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      config.data = body;
    }

    const response = await axios(config);
    return response.data;
  }

  async getThermostats(): Promise<EcobeeThermostat[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const selection = {
        selectionType: 'registered',
        selectionMatch: '',
        includeRuntime: true,
        includeSettings: true,
        includeEquipmentStatus: true,
      };

      const response = await this.makeRequest(
        `/1/thermostat?json=${encodeURIComponent(JSON.stringify({ selection }))}`
      );

      if (response.status?.code === 0 && response.thermostatList) {
        return response.thermostatList;
      }
      return [];
    } catch (error: any) {
      console.error('[Ecobee] Failed to get thermostats:', error.message);
      throw error;
    }
  }

  async getThermostatState(identifier: string): Promise<EcobeeThermostatState | null> {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const thermostats = await this.getThermostats();
      const thermostat = thermostats.find(t => t.identifier === identifier);

      if (!thermostat) {
        return null;
      }

      // Convert from 10ths of degrees to actual degrees
      const actualTemp = thermostat.runtime?.actualTemperature
        ? thermostat.runtime.actualTemperature / 10
        : 0;

      // Average of desired heat/cool for target temp
      const desiredHeat = thermostat.runtime?.desiredHeat
        ? thermostat.runtime.desiredHeat / 10
        : 0;
      const desiredCool = thermostat.runtime?.desiredCool
        ? thermostat.runtime.desiredCool / 10
        : 0;

      let targetTemp = actualTemp;
      const mode = thermostat.settings?.hvacMode || 'off';
      if (mode === 'heat') {
        targetTemp = desiredHeat;
      } else if (mode === 'cool') {
        targetTemp = desiredCool;
      } else if (mode === 'auto') {
        targetTemp = (desiredHeat + desiredCool) / 2;
      }

      return {
        id: thermostat.identifier,
        name: thermostat.name,
        online: thermostat.runtime?.connected ?? false,
        currentTemperature: Math.round(actualTemp * 10) / 10,
        targetTemperature: Math.round(targetTemp * 10) / 10,
        humidity: thermostat.runtime?.actualHumidity ?? 0,
        mode: mode as EcobeeThermostatState['mode'],
        equipmentRunning: thermostat.equipmentStatus?.split(',').filter(Boolean) ?? [],
      };
    } catch (error: any) {
      console.error('[Ecobee] Failed to get thermostat state:', error.message);
      throw error;
    }
  }

  async setTemperature(identifier: string, temperature: number, holdType: 'nextTransition' | 'indefinite' | 'holdHours' = 'nextTransition', holdHours?: number): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Ecobee not configured');
    }

    try {
      // Temperature in 10ths of degrees F
      const temp = Math.round(temperature * 10);

      const thermostatFunction = {
        type: 'setHold',
        params: {
          holdType,
          heatHoldTemp: temp,
          coolHoldTemp: temp,
          ...(holdType === 'holdHours' && holdHours ? { holdHours } : {}),
        },
      };

      const body = {
        selection: {
          selectionType: 'thermostats',
          selectionMatch: identifier,
        },
        functions: [thermostatFunction],
      };

      const response = await this.makeRequest('/1/thermostat', 'post', body);
      return response.status?.code === 0;
    } catch (error: any) {
      console.error('[Ecobee] Failed to set temperature:', error.message);
      throw error;
    }
  }

  async setMode(identifier: string, mode: 'heat' | 'cool' | 'auto' | 'off'): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Ecobee not configured');
    }

    try {
      const body = {
        selection: {
          selectionType: 'thermostats',
          selectionMatch: identifier,
        },
        thermostat: {
          settings: {
            hvacMode: mode,
          },
        },
      };

      const response = await this.makeRequest('/1/thermostat', 'post', body);
      return response.status?.code === 0;
    } catch (error: any) {
      console.error('[Ecobee] Failed to set mode:', error.message);
      throw error;
    }
  }

  async resumeProgram(identifier: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Ecobee not configured');
    }

    try {
      const body = {
        selection: {
          selectionType: 'thermostats',
          selectionMatch: identifier,
        },
        functions: [
          {
            type: 'resumeProgram',
            params: {
              resumeAll: false,
            },
          },
        ],
      };

      const response = await this.makeRequest('/1/thermostat', 'post', body);
      return response.status?.code === 0;
    } catch (error: any) {
      console.error('[Ecobee] Failed to resume program:', error.message);
      throw error;
    }
  }
}

export const ecobeeService = new EcobeeService();
