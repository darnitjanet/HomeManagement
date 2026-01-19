import { Router } from 'express';
import * as gmailController from '../controllers/gmail.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All Gmail routes require Google authentication
router.use(requireAuth);

// Get recent shipping emails (parsed)
router.get('/shipping', gmailController.getShippingEmails);

// Import a single shipping email as a package
router.post('/import', gmailController.importShippingEmail);

// Sync all recent shipping emails to packages
router.post('/sync', gmailController.syncShippingEmails);

export default router;
