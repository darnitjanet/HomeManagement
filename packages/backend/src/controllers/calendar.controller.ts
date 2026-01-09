import { Request, Response } from 'express';
import { GoogleCalendarService } from '../services/google-calendar.service';

// List all calendars
export async function listCalendars(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const calendarService = new GoogleCalendarService(req.googleAuth);
    const calendars = await calendarService.listCalendars();

    res.json({
      success: true,
      data: calendars,
    });
  } catch (error: any) {
    console.error('List calendars error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch calendars',
      message: error.message,
    });
  }
}

// List events from a calendar
export async function listEvents(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const calendarId = (req.query.calendarId as string) || 'primary';
    const timeMin = req.query.timeMin as string;
    const timeMax = req.query.timeMax as string;
    const maxResults = req.query.maxResults ? parseInt(req.query.maxResults as string) : 100;

    const calendarService = new GoogleCalendarService(req.googleAuth);
    const events = await calendarService.listEvents(calendarId, {
      timeMin,
      timeMax,
      maxResults,
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    console.error('List events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
      message: error.message,
    });
  }
}

// Get a specific event
export async function getEvent(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { eventId } = req.params;
    const calendarId = (req.query.calendarId as string) || 'primary';

    const calendarService = new GoogleCalendarService(req.googleAuth);
    const event = await calendarService.getEvent(calendarId, eventId);

    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
      message: error.message,
    });
  }
}

// Create a new event
export async function createEvent(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const calendarId = req.body.calendarId || 'primary';
    const { summary, description, location, start, end, attendees, reminders, recurrence } = req.body;

    if (!summary || !start || !end) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'summary, start, and end are required',
      });
    }

    const calendarService = new GoogleCalendarService(req.googleAuth);
    const event = await calendarService.createEvent(calendarId, {
      summary,
      description,
      location,
      start,
      end,
      attendees,
      reminders,
      recurrence,
    });

    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message,
    });
  }
}

// Update an existing event
export async function updateEvent(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { eventId } = req.params;
    const calendarId = req.body.calendarId || 'primary';
    const { summary, description, location, start, end, attendees, reminders, recurrence } = req.body;

    const calendarService = new GoogleCalendarService(req.googleAuth);
    const event = await calendarService.updateEvent(calendarId, eventId, {
      summary,
      description,
      location,
      start,
      end,
      attendees,
      reminders,
      recurrence,
    });

    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event',
      message: error.message,
    });
  }
}

// Delete an event
export async function deleteEvent(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { eventId } = req.params;
    const calendarId = (req.query.calendarId as string) || 'primary';

    const calendarService = new GoogleCalendarService(req.googleAuth);
    await calendarService.deleteEvent(calendarId, eventId);

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event',
      message: error.message,
    });
  }
}

// Quick add event using natural language
export async function quickAddEvent(req: Request, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { text, calendarId = 'primary' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'text is required',
      });
    }

    const calendarService = new GoogleCalendarService(req.googleAuth);
    const event = await calendarService.quickAddEvent(calendarId, text);

    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    console.error('Quick add event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event',
      message: error.message,
    });
  }
}
