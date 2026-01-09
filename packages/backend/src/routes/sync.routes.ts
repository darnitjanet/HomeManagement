import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import * as syncController from '../controllers/sync.controller';

const router = Router();

// Google calendar sync routes (require auth)
router.post('/google/discover', requireAuth, syncController.discoverGoogleCalendars);
router.post('/google/calendars', requireAuth, syncController.syncAllGoogleCalendars);
router.post('/google/calendars/:calendarId', requireAuth, syncController.syncGoogleCalendar);

// External calendar CRUD routes
router.get('/external/calendars', syncController.listExternalCalendars);
router.post('/external/calendars', syncController.createExternalCalendar);
router.put('/external/calendars/:id', syncController.updateExternalCalendar);
router.delete('/external/calendars/:id', syncController.deleteExternalCalendar);

// External calendar sync routes
router.post('/external/calendars/:id/sync', syncController.syncExternalCalendar);
router.post('/external/sync-all', syncController.syncAllExternalCalendars);

// Cached events (works offline, optional auth)
router.get('/cached/:calendarId/events', optionalAuth, syncController.getCachedEvents);

// Sync logs and stats
router.get('/logs', syncController.getSyncLogs);
router.get('/stats', syncController.getSyncStats);

export default router;
