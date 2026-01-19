import { Request, Response } from 'express';
import { goveeService } from '../services/govee.service';
import { ecobeeService } from '../services/ecobee.service';
import { eufyService } from '../services/eufy.service';

export const smartHomeController = {
  // Get overall status of all smart home integrations
  async getStatus(req: Request, res: Response) {
    try {
      const status = {
        govee: {
          configured: goveeService.isConfigured(),
          name: 'Govee Lights',
        },
        ecobee: {
          configured: ecobeeService.isConfigured(),
          name: 'Ecobee Thermostat',
        },
        eufy: {
          configured: eufyService.isConfigured(),
          name: 'Eufy Cameras',
        },
      };

      res.json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      console.error('Failed to get smart home status:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Govee endpoints
  async getGoveeDevices(req: Request, res: Response) {
    try {
      if (!goveeService.isConfigured()) {
        return res.json({
          success: true,
          data: [],
          message: 'Govee not configured',
        });
      }

      const devices = await goveeService.getDevices();

      // Get state for each device
      const devicesWithState = await Promise.all(
        devices.map(async (device) => {
          try {
            const state = await goveeService.getDeviceState(device.device, device.model);
            return {
              ...device,
              state,
            };
          } catch (error) {
            return {
              ...device,
              state: null,
            };
          }
        })
      );

      res.json({
        success: true,
        data: devicesWithState,
      });
    } catch (error: any) {
      console.error('Failed to get Govee devices:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async controlGoveeDevice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { model, action, value } = req.body;

      if (!goveeService.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: 'Govee not configured',
        });
      }

      let result = false;

      switch (action) {
        case 'turn_on':
          result = await goveeService.turnOn(id, model);
          break;
        case 'turn_off':
          result = await goveeService.turnOff(id, model);
          break;
        case 'set_brightness':
          result = await goveeService.setBrightness(id, model, value);
          break;
        case 'set_color':
          result = await goveeService.setColor(id, model, value.r, value.g, value.b);
          break;
        case 'set_color_temp':
          result = await goveeService.setColorTemperature(id, model, value);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: `Unknown action: ${action}`,
          });
      }

      res.json({
        success: result,
        message: result ? 'Command sent' : 'Command failed',
      });
    } catch (error: any) {
      console.error('Failed to control Govee device:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Ecobee endpoints
  async getEcobeeThermostats(req: Request, res: Response) {
    try {
      if (!ecobeeService.isConfigured()) {
        return res.json({
          success: true,
          data: [],
          message: 'Ecobee not configured',
        });
      }

      const thermostats = await ecobeeService.getThermostats();

      // Convert to simplified state format
      const thermostatStates = await Promise.all(
        thermostats.map(async (t) => {
          try {
            return await ecobeeService.getThermostatState(t.identifier);
          } catch (error) {
            return null;
          }
        })
      );

      res.json({
        success: true,
        data: thermostatStates.filter(Boolean),
      });
    } catch (error: any) {
      console.error('Failed to get Ecobee thermostats:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async controlEcobeeThermostat(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { action, value, holdType, holdHours } = req.body;

      if (!ecobeeService.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: 'Ecobee not configured',
        });
      }

      let result = false;

      switch (action) {
        case 'set_temperature':
          result = await ecobeeService.setTemperature(id, value, holdType, holdHours);
          break;
        case 'set_mode':
          result = await ecobeeService.setMode(id, value);
          break;
        case 'resume_program':
          result = await ecobeeService.resumeProgram(id);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: `Unknown action: ${action}`,
          });
      }

      res.json({
        success: result,
        message: result ? 'Command sent' : 'Command failed',
      });
    } catch (error: any) {
      console.error('Failed to control Ecobee thermostat:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  // Eufy endpoints
  async getEufyCameras(req: Request, res: Response) {
    try {
      if (!eufyService.isConfigured()) {
        return res.json({
          success: true,
          data: [],
          message: 'Eufy not configured',
        });
      }

      const cameras = await eufyService.getCameras();

      res.json({
        success: true,
        data: cameras,
      });
    } catch (error: any) {
      console.error('Failed to get Eufy cameras:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async getEufyCameraSnapshot(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!eufyService.isConfigured()) {
        return res.status(400).json({
          success: false,
          message: 'Eufy not configured',
        });
      }

      const snapshot = await eufyService.getCameraSnapshot(id);

      if (!snapshot) {
        return res.status(404).json({
          success: false,
          message: 'Snapshot not available',
        });
      }

      res.json({
        success: true,
        data: snapshot,
      });
    } catch (error: any) {
      console.error('Failed to get Eufy camera snapshot:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },
};
