import { db } from '../config/database';
import {
  FamilyMember,
  MoodEntry,
  MoodActivity,
  MoodType,
  CreateFamilyMemberInput,
  UpdateFamilyMemberInput,
  CreateMoodEntryInput,
  UpdateMoodEntryInput,
  MoodTrend,
  MOOD_VALUES,
} from '../types';

// Database row interfaces
interface FamilyMemberRow {
  id: number;
  name: string;
  avatar_color: string;
  date_of_birth: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface MoodEntryRow {
  id: number;
  family_member_id: number;
  mood: string;
  energy_level: number;
  sleep_quality: number | null;
  sleep_hours: number | null;
  notes: string | null;
  logged_at: string;
  created_at: string;
  updated_at: string;
}

interface MoodActivityRow {
  id: number;
  mood_entry_id: number;
  activity: string;
}

// Mapping functions
function mapFamilyMemberFromDb(row: FamilyMemberRow): FamilyMember {
  return {
    id: row.id,
    name: row.name,
    avatarColor: row.avatar_color,
    dateOfBirth: row.date_of_birth || undefined,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMoodEntryFromDb(row: MoodEntryRow, activities?: MoodActivity[]): MoodEntry {
  return {
    id: row.id,
    familyMemberId: row.family_member_id,
    mood: row.mood as MoodType,
    energyLevel: row.energy_level,
    sleepQuality: row.sleep_quality || undefined,
    sleepHours: row.sleep_hours || undefined,
    notes: row.notes || undefined,
    activities: activities,
    loggedAt: row.logged_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Family Member operations
export async function getAllFamilyMembers(includeInactive = false): Promise<FamilyMember[]> {
  let query = db('family_members').orderBy('name');
  if (!includeInactive) {
    query = query.where('is_active', true);
  }
  const rows = await query;
  return rows.map(mapFamilyMemberFromDb);
}

export async function getFamilyMemberById(id: number): Promise<FamilyMember | null> {
  const row = await db('family_members').where({ id }).first();
  return row ? mapFamilyMemberFromDb(row) : null;
}

export async function createFamilyMember(input: CreateFamilyMemberInput): Promise<FamilyMember> {
  const [id] = await db('family_members').insert({
    name: input.name,
    avatar_color: input.avatarColor || '#4ECDC4',
    date_of_birth: input.dateOfBirth || null,
    is_active: true,
  });
  return getFamilyMemberById(id) as Promise<FamilyMember>;
}

export async function updateFamilyMember(id: number, input: UpdateFamilyMemberInput): Promise<FamilyMember | null> {
  const updateData: Record<string, any> = { updated_at: db.fn.now() };
  if (input.name !== undefined) updateData.name = input.name;
  if (input.avatarColor !== undefined) updateData.avatar_color = input.avatarColor;
  if (input.dateOfBirth !== undefined) updateData.date_of_birth = input.dateOfBirth;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  await db('family_members').where({ id }).update(updateData);
  return getFamilyMemberById(id);
}

export async function deleteFamilyMember(id: number): Promise<boolean> {
  const deleted = await db('family_members').where({ id }).delete();
  return deleted > 0;
}

// Mood Entry operations
export async function getMoodEntries(options: {
  familyMemberId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<MoodEntry[]> {
  let query = db('mood_entries').orderBy('logged_at', 'desc');

  if (options.familyMemberId) {
    query = query.where('family_member_id', options.familyMemberId);
  }
  if (options.startDate) {
    query = query.where('logged_at', '>=', options.startDate);
  }
  if (options.endDate) {
    query = query.where('logged_at', '<=', options.endDate);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.offset(options.offset);
  }

  const rows: MoodEntryRow[] = await query;

  // Fetch activities for all entries
  const entryIds = rows.map(r => r.id);
  const activityRows: MoodActivityRow[] = entryIds.length > 0
    ? await db('mood_activities').whereIn('mood_entry_id', entryIds)
    : [];

  // Group activities by entry
  const activitiesByEntry: Record<number, MoodActivity[]> = {};
  for (const ar of activityRows) {
    if (!activitiesByEntry[ar.mood_entry_id]) {
      activitiesByEntry[ar.mood_entry_id] = [];
    }
    activitiesByEntry[ar.mood_entry_id].push(ar.activity as MoodActivity);
  }

  return rows.map(row => mapMoodEntryFromDb(row, activitiesByEntry[row.id] || []));
}

export async function getMoodEntryById(id: number): Promise<MoodEntry | null> {
  const row: MoodEntryRow | undefined = await db('mood_entries').where({ id }).first();
  if (!row) return null;

  const activityRows: MoodActivityRow[] = await db('mood_activities').where('mood_entry_id', id);
  const activities = activityRows.map(a => a.activity as MoodActivity);

  return mapMoodEntryFromDb(row, activities);
}

export async function createMoodEntry(input: CreateMoodEntryInput): Promise<MoodEntry> {
  const [id] = await db('mood_entries').insert({
    family_member_id: input.familyMemberId,
    mood: input.mood,
    energy_level: input.energyLevel,
    sleep_quality: input.sleepQuality || null,
    sleep_hours: input.sleepHours || null,
    notes: input.notes || null,
    logged_at: input.loggedAt || db.fn.now(),
  });

  // Insert activities
  if (input.activities && input.activities.length > 0) {
    await db('mood_activities').insert(
      input.activities.map(activity => ({
        mood_entry_id: id,
        activity,
      }))
    );
  }

  return getMoodEntryById(id) as Promise<MoodEntry>;
}

export async function updateMoodEntry(id: number, input: UpdateMoodEntryInput): Promise<MoodEntry | null> {
  const updateData: Record<string, any> = { updated_at: db.fn.now() };
  if (input.mood !== undefined) updateData.mood = input.mood;
  if (input.energyLevel !== undefined) updateData.energy_level = input.energyLevel;
  if (input.sleepQuality !== undefined) updateData.sleep_quality = input.sleepQuality;
  if (input.sleepHours !== undefined) updateData.sleep_hours = input.sleepHours;
  if (input.notes !== undefined) updateData.notes = input.notes;

  await db('mood_entries').where({ id }).update(updateData);

  // Update activities if provided
  if (input.activities !== undefined) {
    await db('mood_activities').where('mood_entry_id', id).delete();
    if (input.activities.length > 0) {
      await db('mood_activities').insert(
        input.activities.map(activity => ({
          mood_entry_id: id,
          activity,
        }))
      );
    }
  }

  return getMoodEntryById(id);
}

export async function deleteMoodEntry(id: number): Promise<boolean> {
  const deleted = await db('mood_entries').where({ id }).delete();
  return deleted > 0;
}

// Trend/Analytics operations
export async function getMoodTrends(options: {
  familyMemberId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<MoodTrend[]> {
  // Get family members to report on
  let membersQuery = db('family_members').where('is_active', true);
  if (options.familyMemberId) {
    membersQuery = membersQuery.where('id', options.familyMemberId);
  }
  const members: FamilyMemberRow[] = await membersQuery;

  const trends: MoodTrend[] = [];

  for (const member of members) {
    let entriesQuery = db('mood_entries').where('family_member_id', member.id);
    if (options.startDate) {
      entriesQuery = entriesQuery.where('logged_at', '>=', options.startDate);
    }
    if (options.endDate) {
      entriesQuery = entriesQuery.where('logged_at', '<=', options.endDate);
    }

    const entries: MoodEntryRow[] = await entriesQuery;

    if (entries.length === 0) {
      continue; // Skip members with no entries
    }

    // Calculate mood distribution
    const moodDistribution: Record<MoodType, number> = {
      anxious: 0, sad: 0, stressed: 0, tired: 0,
      calm: 0, content: 0, happy: 0, excited: 0, grateful: 0, energized: 0,
    };
    let totalMoodScore = 0;
    let totalEnergy = 0;
    let totalSleepQuality = 0;
    let sleepQualityCount = 0;
    let totalSleepHours = 0;
    let sleepHoursCount = 0;

    for (const entry of entries) {
      // Handle comma-separated moods (e.g., "happy, excited")
      const entryMoods = entry.mood.split(',').map(m => m.trim() as MoodType);
      for (const mood of entryMoods) {
        if (moodDistribution[mood] !== undefined) {
          moodDistribution[mood]++;
        }
      }
      // Calculate average mood score for all moods in this entry
      const moodScores = entryMoods.map(m => MOOD_VALUES[m] || 3);
      const avgEntryMoodScore = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
      totalMoodScore += avgEntryMoodScore;
      totalEnergy += entry.energy_level;
      if (entry.sleep_quality) {
        totalSleepQuality += entry.sleep_quality;
        sleepQualityCount++;
      }
      if (entry.sleep_hours) {
        totalSleepHours += entry.sleep_hours;
        sleepHoursCount++;
      }
    }

    // Get activities and calculate correlations
    const entryIds = entries.map(e => e.id);
    const activityRows: MoodActivityRow[] = entryIds.length > 0
      ? await db('mood_activities').whereIn('mood_entry_id', entryIds)
      : [];

    // Map entry id to mood score (average if multiple moods)
    const entryMoodScores: Record<number, number> = {};
    for (const entry of entries) {
      const entryMoods = entry.mood.split(',').map(m => m.trim() as MoodType);
      const moodScores = entryMoods.map(m => MOOD_VALUES[m] || 3);
      entryMoodScores[entry.id] = moodScores.reduce((a, b) => a + b, 0) / moodScores.length;
    }

    // Calculate activity correlations
    const activityStats: Record<MoodActivity, { count: number; totalScore: number }> = {
      work: { count: 0, totalScore: 0 },
      exercise: { count: 0, totalScore: 0 },
      social: { count: 0, totalScore: 0 },
      family: { count: 0, totalScore: 0 },
      hobby: { count: 0, totalScore: 0 },
      rest: { count: 0, totalScore: 0 },
      outdoors: { count: 0, totalScore: 0 },
      screen_time: { count: 0, totalScore: 0 },
      reading: { count: 0, totalScore: 0 },
      chores: { count: 0, totalScore: 0 },
    };

    for (const ar of activityRows) {
      const activity = ar.activity as MoodActivity;
      if (activityStats[activity]) {
        activityStats[activity].count++;
        activityStats[activity].totalScore += entryMoodScores[ar.mood_entry_id] || 3;
      }
    }

    const activityCorrelations: Record<MoodActivity, { count: number; avgMoodScore: number }> = {} as any;
    for (const [activity, stats] of Object.entries(activityStats)) {
      activityCorrelations[activity as MoodActivity] = {
        count: stats.count,
        avgMoodScore: stats.count > 0 ? Math.round((stats.totalScore / stats.count) * 100) / 100 : 0,
      };
    }

    const period = options.startDate && options.endDate
      ? `${options.startDate} to ${options.endDate}`
      : 'All time';

    trends.push({
      memberId: member.id,
      memberName: member.name,
      period,
      totalEntries: entries.length,
      averageMoodScore: Math.round((totalMoodScore / entries.length) * 100) / 100,
      averageEnergyLevel: Math.round((totalEnergy / entries.length) * 100) / 100,
      averageSleepQuality: sleepQualityCount > 0
        ? Math.round((totalSleepQuality / sleepQualityCount) * 100) / 100
        : undefined,
      averageSleepHours: sleepHoursCount > 0
        ? Math.round((totalSleepHours / sleepHoursCount) * 100) / 100
        : undefined,
      moodDistribution,
      activityCorrelations,
    });
  }

  return trends;
}

// Get time-series data for line graph
export async function getMoodTimeSeries(options: {
  familyMemberId?: number;
  startDate?: string;
  endDate?: string;
}): Promise<Array<{
  date: string;
  moodScore: number;
  memberId: number;
  memberName: string;
}>> {
  let query = db('mood_entries')
    .join('family_members', 'mood_entries.family_member_id', 'family_members.id')
    .select('mood_entries.*', 'family_members.name as member_name')
    .orderBy('logged_at', 'asc');

  if (options.familyMemberId) {
    query = query.where('family_member_id', options.familyMemberId);
  }
  if (options.startDate) {
    query = query.where('logged_at', '>=', options.startDate);
  }
  if (options.endDate) {
    query = query.where('logged_at', '<=', options.endDate);
  }

  const entries = await query;

  return entries.map((entry: any) => {
    const entryMoods = entry.mood.split(',').map((m: string) => m.trim() as MoodType);
    const moodScores = entryMoods.map((m: MoodType) => MOOD_VALUES[m] || 3);
    const avgScore = moodScores.reduce((a: number, b: number) => a + b, 0) / moodScores.length;

    return {
      date: entry.logged_at,
      moodScore: Math.round(avgScore * 100) / 100,
      memberId: entry.family_member_id,
      memberName: entry.member_name,
    };
  });
}
