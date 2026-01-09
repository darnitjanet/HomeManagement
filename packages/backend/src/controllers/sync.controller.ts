import { Request, Response } from 'express';
import { CalendarSyncService } from '../services/calendar-sync.service';
import { ExternalCalendarRepository } from '../repositories/external-calendar.repository';
import { CalendarRepository } from '../repositories/calendar.repository';
import { SyncLogRepository } from '../repositories/sync-log.repository';
import { AuthenticatedRequest } from '../types';

/**
 * Manually trigger sync for a specific Google calendar
 */
export async function syncGoogleCalendar(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const { calendarId } = req.params;
    const syncService = new CalendarSyncService(req.googleAuth);

    const result = await syncService.syncGoogleCalendar(calendarId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Sync Google calendar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync calendar',
      message: error.message,
    });
  }
}

/**
 * Manually trigger sync for all Google calendars
 */
export async function syncAllGoogleCalendars(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const syncService = new CalendarSyncService(req.googleAuth);
    const results = await syncService.syncAllGoogleCalendars();

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful,
          failed,
        },
      },
    });
  } catch (error: any) {
    console.error('Sync all calendars error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync calendars',
      message: error.message,
    });
  }
}

/**
 * Discover and register Google calendars
 */
export async function discoverGoogleCalendars(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const syncService = new CalendarSyncService(req.googleAuth);
    await syncService.discoverGoogleCalendars();

    res.json({
      success: true,
      message: 'Calendars discovered and registered',
    });
  } catch (error: any) {
    console.error('Discover calendars error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to discover calendars',
      message: error.message,
    });
  }
}

/**
 * Manually trigger sync for a specific external calendar
 */
export async function syncExternalCalendar(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const syncService = new CalendarSyncService();

    const result = await syncService.syncExternalCalendar(parseInt(id));

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Sync external calendar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync external calendar',
      message: error.message,
    });
  }
}

/**
 * Sync all external calendars
 */
export async function syncAllExternalCalendars(req: Request, res: Response) {
  try {
    const syncService = new CalendarSyncService();
    const results = await syncService.syncAllExternalCalendars();

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful,
          failed,
        },
      },
    });
  } catch (error: any) {
    console.error('Sync all external calendars error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync external calendars',
      message: error.message,
    });
  }
}

/**
 * Get cached events (offline access)
 */
export async function getCachedEvents(req: Request, res: Response) {
  try {
    const { calendarId } = req.params;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format',
        message: 'startDate and endDate must be valid ISO date strings',
      });
    }

    const calendarRepo = new CalendarRepository();
    const events = await calendarRepo.getCachedEvents(calendarId, startDate, endDate);

    res.json({
      success: true,
      data: events,
      cached: true,
    });
  } catch (error: any) {
    console.error('Get cached events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cached events',
      message: error.message,
    });
  }
}

/**
 * Get sync logs
 */
export async function getSyncLogs(req: Request, res: Response) {
  try {
    const { calendarId } = req.query;
    const limit = parseInt(req.query.limit as string) || 10;

    const syncLogRepo = new SyncLogRepository();
    const logs = await syncLogRepo.getRecentLogs(calendarId as string | undefined, limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Get sync logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync logs',
      message: error.message,
    });
  }
}

/**
 * Get sync statistics
 */
export async function getSyncStats(req: Request, res: Response) {
  try {
    const { calendarId } = req.query;
    const syncLogRepo = new SyncLogRepository();

    const stats = await syncLogRepo.getSyncStats(calendarId as string | undefined);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get sync stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync statistics',
      message: error.message,
    });
  }
}

/**
 * Create external calendar
 */
export async function createExternalCalendar(req: Request, res: Response) {
  try {
    const { name, icalUrl, color, syncInterval } = req.body;

    if (!name || !icalUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'name and icalUrl are required',
      });
    }

    const repo = new ExternalCalendarRepository();
    const id = await repo.create({
      name,
      icalUrl,
      color,
      syncInterval: syncInterval || 3600,
      isEnabled: true,
    });

    res.json({
      success: true,
      data: { id },
      message: 'External calendar created',
    });
  } catch (error: any) {
    console.error('Create external calendar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create external calendar',
      message: error.message,
    });
  }
}

/**
 * Update external calendar
 */
export async function updateExternalCalendar(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const repo = new ExternalCalendarRepository();
    await repo.update(parseInt(id), updates);

    res.json({
      success: true,
      message: 'External calendar updated',
    });
  } catch (error: any) {
    console.error('Update external calendar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update external calendar',
      message: error.message,
    });
  }
}

/**
 * Delete external calendar
 */
export async function deleteExternalCalendar(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const repo = new ExternalCalendarRepository();
    await repo.delete(parseInt(id));

    res.json({
      success: true,
      message: 'External calendar deleted',
    });
  } catch (error: any) {
    console.error('Delete external calendar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete external calendar',
      message: error.message,
    });
  }
}

/**
 * List external calendars
 */
export async function listExternalCalendars(req: Request, res: Response) {
  try {
    const repo = new ExternalCalendarRepository();
    const calendars = await repo.getAll();

    res.json({
      success: true,
      data: calendars,
    });
  } catch (error: any) {
    console.error('List external calendars error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list external calendars',
      message: error.message,
    });
  }
}
