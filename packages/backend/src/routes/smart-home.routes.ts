import { Router } from 'express';
import { smartHomeController } from '../controllers/smart-home.controller';

const router = Router();

// Overall status
router.get('/status', smartHomeController.getStatus);

// Govee routes
router.get('/govee/devices', smartHomeController.getGoveeDevices);
router.post('/govee/devices/:id/control', smartHomeController.controlGoveeDevice);

// Ecobee routes
router.get('/ecobee/thermostats', smartHomeController.getEcobeeThermostats);
router.post('/ecobee/thermostats/:id/control', smartHomeController.controlEcobeeThermostat);

// Eufy routes
router.get('/eufy/cameras', smartHomeController.getEufyCameras);
router.get('/eufy/cameras/:id/snapshot', smartHomeController.getEufyCameraSnapshot);

export default router;
