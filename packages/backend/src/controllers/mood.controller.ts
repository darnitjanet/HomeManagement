import { Request, Response } from 'express';
import * as MoodRepository from '../repositories/mood.repository';

// Family Member endpoints
export async function getFamilyMembers(req: Request, res: Response): Promise<void> {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const members = await MoodRepository.getAllFamilyMembers(includeInactive);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Error fetching family members:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch family members' });
  }
}

export async function getFamilyMember(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const member = await MoodRepository.getFamilyMemberById(id);
    if (!member) {
      res.status(404).json({ success: false, error: 'Family member not found' });
      return;
    }
    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Error fetching family member:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch family member' });
  }
}

export async function createFamilyMember(req: Request, res: Response): Promise<void> {
  try {
    const { name, avatarColor, dateOfBirth } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }
    const member = await MoodRepository.createFamilyMember({ name, avatarColor, dateOfBirth });
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    console.error('Error creating family member:', error);
    res.status(500).json({ success: false, error: 'Failed to create family member' });
  }
}

export async function updateFamilyMember(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, avatarColor, dateOfBirth, isActive } = req.body;
    const member = await MoodRepository.updateFamilyMember(id, { name, avatarColor, dateOfBirth, isActive });
    if (!member) {
      res.status(404).json({ success: false, error: 'Family member not found' });
      return;
    }
    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Error updating family member:', error);
    res.status(500).json({ success: false, error: 'Failed to update family member' });
  }
}

export async function deleteFamilyMember(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await MoodRepository.deleteFamilyMember(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Family member not found' });
      return;
    }
    res.json({ success: true, message: 'Family member deleted' });
  } catch (error) {
    console.error('Error deleting family member:', error);
    res.status(500).json({ success: false, error: 'Failed to delete family member' });
  }
}

// Mood Entry endpoints
export async function getMoodEntries(req: Request, res: Response): Promise<void> {
  try {
    const familyMemberId = req.query.familyMemberId ? parseInt(req.query.familyMemberId as string, 10) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const entries = await MoodRepository.getMoodEntries({
      familyMemberId,
      startDate,
      endDate,
      limit,
      offset,
    });
    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Error fetching mood entries:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mood entries' });
  }
}

export async function getMoodEntry(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const entry = await MoodRepository.getMoodEntryById(id);
    if (!entry) {
      res.status(404).json({ success: false, error: 'Mood entry not found' });
      return;
    }
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error fetching mood entry:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mood entry' });
  }
}

export async function createMoodEntry(req: Request, res: Response): Promise<void> {
  try {
    const { familyMemberId, mood, energyLevel, sleepQuality, sleepHours, notes, activities, loggedAt } = req.body;

    if (!familyMemberId || !mood || !energyLevel) {
      res.status(400).json({ success: false, error: 'familyMemberId, mood, and energyLevel are required' });
      return;
    }

    // Validate energy level
    if (energyLevel < 1 || energyLevel > 5) {
      res.status(400).json({ success: false, error: 'energyLevel must be between 1 and 5' });
      return;
    }

    // Validate sleep quality if provided
    if (sleepQuality !== undefined && (sleepQuality < 1 || sleepQuality > 5)) {
      res.status(400).json({ success: false, error: 'sleepQuality must be between 1 and 5' });
      return;
    }

    const entry = await MoodRepository.createMoodEntry({
      familyMemberId,
      mood,
      energyLevel,
      sleepQuality,
      sleepHours,
      notes,
      activities,
      loggedAt,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Error creating mood entry:', error);
    res.status(500).json({ success: false, error: 'Failed to create mood entry' });
  }
}

export async function updateMoodEntry(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const { mood, energyLevel, sleepQuality, sleepHours, notes, activities } = req.body;

    // Validate energy level if provided
    if (energyLevel !== undefined && (energyLevel < 1 || energyLevel > 5)) {
      res.status(400).json({ success: false, error: 'energyLevel must be between 1 and 5' });
      return;
    }

    // Validate sleep quality if provided
    if (sleepQuality !== undefined && (sleepQuality < 1 || sleepQuality > 5)) {
      res.status(400).json({ success: false, error: 'sleepQuality must be between 1 and 5' });
      return;
    }

    const entry = await MoodRepository.updateMoodEntry(id, {
      mood,
      energyLevel,
      sleepQuality,
      sleepHours,
      notes,
      activities,
    });
    if (!entry) {
      res.status(404).json({ success: false, error: 'Mood entry not found' });
      return;
    }
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error updating mood entry:', error);
    res.status(500).json({ success: false, error: 'Failed to update mood entry' });
  }
}

export async function deleteMoodEntry(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await MoodRepository.deleteMoodEntry(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Mood entry not found' });
      return;
    }
    res.json({ success: true, message: 'Mood entry deleted' });
  } catch (error) {
    console.error('Error deleting mood entry:', error);
    res.status(500).json({ success: false, error: 'Failed to delete mood entry' });
  }
}

// Trends/Analytics endpoints
export async function getMoodTrends(req: Request, res: Response): Promise<void> {
  try {
    const familyMemberId = req.params.memberId ? parseInt(req.params.memberId, 10) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const trends = await MoodRepository.getMoodTrends({
      familyMemberId,
      startDate,
      endDate,
    });
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Error fetching mood trends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mood trends' });
  }
}

export async function getAllMoodTrends(req: Request, res: Response): Promise<void> {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const trends = await MoodRepository.getMoodTrends({
      startDate,
      endDate,
    });
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error('Error fetching mood trends:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mood trends' });
  }
}

export async function getMoodTimeSeries(req: Request, res: Response): Promise<void> {
  try {
    const familyMemberId = req.query.memberId ? parseInt(req.query.memberId as string, 10) : undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const data = await MoodRepository.getMoodTimeSeries({
      familyMemberId,
      startDate,
      endDate,
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching mood time series:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch mood time series' });
  }
}
