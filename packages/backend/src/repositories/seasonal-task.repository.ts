import { db } from '../config/database';

export interface SeasonalTask {
  id: number;
  title: string;
  description: string | null;
  category: string;
  seasons: string[] | null;
  months: number[] | null;
  reminder_day: number;
  reminder_days_before: number;
  priority: string;
  estimated_minutes: number | null;
  last_completed_period: string | null;
  last_completed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SeasonalTaskInput {
  title: string;
  description?: string;
  category?: string;
  seasons?: string[];
  months?: number[];
  reminder_day?: number;
  reminder_days_before?: number;
  priority?: string;
  estimated_minutes?: number;
  is_active?: boolean;
}

// Map database row to SeasonalTask
function mapRow(row: any): SeasonalTask {
  return {
    ...row,
    seasons: row.seasons ? JSON.parse(row.seasons) : null,
    months: row.months ? JSON.parse(row.months) : null,
    is_active: Boolean(row.is_active),
  };
}

// Prepare data for database insert/update
function prepareData(data: SeasonalTaskInput): any {
  const prepared: any = { ...data };
  if (data.seasons !== undefined) {
    prepared.seasons = data.seasons ? JSON.stringify(data.seasons) : null;
  }
  if (data.months !== undefined) {
    prepared.months = data.months ? JSON.stringify(data.months) : null;
  }
  return prepared;
}

export class SeasonalTaskRepository {
  async getAll(): Promise<SeasonalTask[]> {
    const rows = await db('seasonal_tasks').orderBy('category').orderBy('title');
    return rows.map(mapRow);
  }

  async getActive(): Promise<SeasonalTask[]> {
    const rows = await db('seasonal_tasks')
      .where('is_active', true)
      .orderBy('category')
      .orderBy('title');
    return rows.map(mapRow);
  }

  async getById(id: number): Promise<SeasonalTask | null> {
    const row = await db('seasonal_tasks').where('id', id).first();
    return row ? mapRow(row) : null;
  }

  async create(data: SeasonalTaskInput): Promise<SeasonalTask> {
    const prepared = prepareData(data);
    const [id] = await db('seasonal_tasks').insert(prepared);
    return this.getById(id) as Promise<SeasonalTask>;
  }

  async update(id: number, data: Partial<SeasonalTaskInput>): Promise<SeasonalTask | null> {
    const prepared = prepareData(data as SeasonalTaskInput);
    prepared.updated_at = db.fn.now();
    await db('seasonal_tasks').where('id', id).update(prepared);
    return this.getById(id);
  }

  async delete(id: number): Promise<boolean> {
    const deleted = await db('seasonal_tasks').where('id', id).delete();
    return deleted > 0;
  }

  async markCompleted(id: number): Promise<SeasonalTask | null> {
    const task = await this.getById(id);
    if (!task) return null;

    const now = new Date();
    const period = this.getCurrentPeriod(task, now);

    await db('seasonal_tasks').where('id', id).update({
      last_completed_period: period,
      last_completed_at: now.toISOString(),
      updated_at: db.fn.now(),
    });

    return this.getById(id);
  }

  // Get tasks that need reminders for the current period
  async getTasksNeedingReminders(): Promise<(SeasonalTask & { dueIn: number })[]> {
    const tasks = await this.getActive();
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    const currentSeason = this.getSeason(currentMonth);
    const currentYear = now.getFullYear();

    const tasksNeedingReminders: (SeasonalTask & { dueIn: number })[] = [];

    for (const task of tasks) {
      // Check if task applies to current season or month
      const appliesToCurrentPeriod = this.taskAppliesNow(task, currentMonth, currentSeason);
      if (!appliesToCurrentPeriod) continue;

      // Check if already completed for this period
      const currentPeriod = this.getCurrentPeriod(task, now);
      if (task.last_completed_period === currentPeriod) continue;

      // Calculate days until reminder day
      const reminderDay = task.reminder_day;
      let daysUntil: number;

      if (currentDay <= reminderDay) {
        daysUntil = reminderDay - currentDay;
      } else {
        // Already past reminder day this month
        daysUntil = 0;
      }

      // Check if within reminder window
      if (daysUntil <= task.reminder_days_before) {
        tasksNeedingReminders.push({
          ...task,
          dueIn: daysUntil,
        });
      }
    }

    return tasksNeedingReminders.sort((a, b) => a.dueIn - b.dueIn);
  }

  private getSeason(month: number): string {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }

  private taskAppliesNow(task: SeasonalTask, currentMonth: number, currentSeason: string): boolean {
    // Check months first
    if (task.months && task.months.length > 0) {
      return task.months.includes(currentMonth);
    }

    // Check seasons
    if (task.seasons && task.seasons.length > 0) {
      return task.seasons.includes(currentSeason);
    }

    // If neither specified, task doesn't apply
    return false;
  }

  private getCurrentPeriod(task: SeasonalTask, date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // If task uses months, period is year-month
    if (task.months && task.months.length > 0) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }

    // If task uses seasons, period is year-season
    const season = this.getSeason(month);
    return `${year}-${season}`;
  }
}

export const seasonalTaskRepository = new SeasonalTaskRepository();
