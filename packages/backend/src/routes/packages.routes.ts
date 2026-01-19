import { Router } from 'express';
import * as packagesController from '../controllers/packages.controller';

const router = Router();

// Static/query routes first (before :id)
router.get('/stats', packagesController.getStats);
router.get('/active', packagesController.getActivePackages);
router.get('/archived', packagesController.getArchivedPackages);
router.get('/arriving-soon', packagesController.getArrivingSoon);
router.get('/carriers', packagesController.getCarriers);
router.get('/statuses', packagesController.getStatuses);

// CRUD routes
router.get('/', packagesController.getAllPackages);
router.get('/:id', packagesController.getPackageById);
router.post('/', packagesController.createPackage);
router.put('/:id', packagesController.updatePackage);
router.delete('/:id', packagesController.deletePackage);

// Action routes
router.put('/:id/status', packagesController.updateStatus);
router.post('/:id/archive', packagesController.archivePackage);

export default router;
