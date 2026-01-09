import { Router } from 'express';
import * as notificationsController from '../controllers/notifications.controller';

const router = Router();

// Notifications
router.get('/', notificationsController.getNotifications);
router.get('/count', notificationsController.getUnreadCount);
router.put('/:id/read', notificationsController.markAsRead);
router.put('/read-all', notificationsController.markAllAsRead);
router.delete('/:id', notificationsController.dismissNotification);
router.delete('/dismiss-all', notificationsController.dismissAllNotifications);

// Preferences
router.get('/preferences', notificationsController.getPreferences);
router.put('/preferences', notificationsController.updatePreferences);

// Email
router.post('/test-email', notificationsController.testEmail);
router.post('/send-digest', notificationsController.sendDigestNow);

// Manual trigger (for testing/debugging)
router.post('/trigger-check', notificationsController.triggerNotificationCheck);

export default router;
