import { Router } from 'express';
import * as plantsController from '../controllers/plants.controller';

const router = Router();

// Get common species list (for autocomplete)
router.get('/species', plantsController.getCommonSpecies);

// Get care suggestions
router.get('/care-suggestion', plantsController.getCareSuggestion);

// Get plant statistics
router.get('/stats', plantsController.getPlantStats);

// Get plants needing water today
router.get('/needs-water', plantsController.getPlantsNeedingWater);

// Get plants needing water soon
router.get('/needs-water-soon', plantsController.getPlantsNeedingWaterSoon);

// Get all plants
router.get('/', plantsController.getAllPlants);

// Get single plant
router.get('/:id', plantsController.getPlant);

// Get watering history for a plant
router.get('/:id/history', plantsController.getWateringHistory);

// Create plant
router.post('/', plantsController.createPlant);

// Update plant
router.put('/:id', plantsController.updatePlant);

// Delete plant
router.delete('/:id', plantsController.deletePlant);

// Water a plant
router.post('/:id/water', plantsController.waterPlant);

export default router;
