import { Router } from 'express';
import * as moodController from '../controllers/mood.controller';

const router = Router();

// Family Members
router.get('/family-members', moodController.getFamilyMembers);
router.get('/family-members/:id', moodController.getFamilyMember);
router.post('/family-members', moodController.createFamilyMember);
router.put('/family-members/:id', moodController.updateFamilyMember);
router.delete('/family-members/:id', moodController.deleteFamilyMember);

// Mood Entries
router.get('/entries', moodController.getMoodEntries);
router.get('/entries/:id', moodController.getMoodEntry);
router.post('/entries', moodController.createMoodEntry);
router.put('/entries/:id', moodController.updateMoodEntry);
router.delete('/entries/:id', moodController.deleteMoodEntry);

// Trends/Analytics
router.get('/trends', moodController.getAllMoodTrends);
router.get('/trends/:memberId', moodController.getMoodTrends);
router.get('/time-series', moodController.getMoodTimeSeries);

export default router;
