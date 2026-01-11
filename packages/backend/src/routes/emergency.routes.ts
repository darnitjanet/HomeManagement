import { Router } from 'express';
import * as emergencyController from '../controllers/emergency.controller';

const router = Router();

// Emergency Contacts
router.get('/contacts', emergencyController.getAllEmergencyContacts);
router.post('/contacts', emergencyController.createEmergencyContact);
router.put('/contacts/:id', emergencyController.updateEmergencyContact);
router.delete('/contacts/:id', emergencyController.deleteEmergencyContact);

// Emergency Info
router.get('/info', emergencyController.getAllEmergencyInfo);
router.post('/info', emergencyController.createEmergencyInfo);
router.put('/info/:id', emergencyController.updateEmergencyInfo);
router.delete('/info/:id', emergencyController.deleteEmergencyInfo);

// Family Rules
router.get('/rules', emergencyController.getAllFamilyRules);
router.post('/rules', emergencyController.createFamilyRule);
router.put('/rules/:id', emergencyController.updateFamilyRule);
router.delete('/rules/:id', emergencyController.deleteFamilyRule);
router.post('/rules/reorder', emergencyController.reorderFamilyRules);

export default router;
