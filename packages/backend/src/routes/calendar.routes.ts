import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as calendarController from '../controllers/calendar.controller';

const router = Router();

// All calendar routes require authentication
router.use(requireAuth);

// Calendar routes
router.get('/calendars', calendarController.listCalendars);

// Event routes
router.get('/events', calendarController.listEvents);
router.get('/events/:eventId', calendarController.getEvent);
router.post('/events', calendarController.createEvent);
router.put('/events/:eventId', calendarController.updateEvent);
router.delete('/events/:eventId', calendarController.deleteEvent);

// Quick add event
router.post('/events/quick', calendarController.quickAddEvent);

export default router;
