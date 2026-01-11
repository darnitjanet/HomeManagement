import { Request, Response } from 'express';
import * as plantRepo from '../repositories/plant.repository';

// Get all plants
export async function getAllPlants(req: Request, res: Response) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const plants = await plantRepo.getAllPlants(includeInactive);
    res.json({ success: true, data: plants });
  } catch (error: any) {
    console.error('Get all plants error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch plants', message: error.message });
  }
}

// Get single plant
export async function getPlant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const plant = await plantRepo.getPlantById(id);

    if (!plant) {
      return res.status(404).json({ success: false, error: 'Plant not found' });
    }

    res.json({ success: true, data: plant });
  } catch (error: any) {
    console.error('Get plant error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch plant', message: error.message });
  }
}

// Get plants needing water
export async function getPlantsNeedingWater(req: Request, res: Response) {
  try {
    const plants = await plantRepo.getPlantsNeedingWater();
    res.json({ success: true, data: plants });
  } catch (error: any) {
    console.error('Get plants needing water error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch plants', message: error.message });
  }
}

// Get plants needing water soon
export async function getPlantsNeedingWaterSoon(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 3;
    const plants = await plantRepo.getPlantsNeedingWaterSoon(days);
    res.json({ success: true, data: plants });
  } catch (error: any) {
    console.error('Get plants needing water soon error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch plants', message: error.message });
  }
}

// Get plant statistics
export async function getPlantStats(req: Request, res: Response) {
  try {
    const stats = await plantRepo.getPlantStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Get plant stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats', message: error.message });
  }
}

// Create plant
export async function createPlant(req: Request, res: Response) {
  try {
    const { name, species, location, watering_frequency_days, last_watered, sunlight_needs, image_url, notes, care_instructions } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Plant name is required' });
    }

    const plant = await plantRepo.createPlant({
      name,
      species,
      location,
      watering_frequency_days,
      last_watered,
      sunlight_needs,
      image_url,
      notes,
      care_instructions,
    });

    res.status(201).json({ success: true, data: plant });
  } catch (error: any) {
    console.error('Create plant error:', error);
    res.status(500).json({ success: false, error: 'Failed to create plant', message: error.message });
  }
}

// Update plant
export async function updatePlant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const plant = await plantRepo.updatePlant(id, req.body);

    if (!plant) {
      return res.status(404).json({ success: false, error: 'Plant not found' });
    }

    res.json({ success: true, data: plant });
  } catch (error: any) {
    console.error('Update plant error:', error);
    res.status(500).json({ success: false, error: 'Failed to update plant', message: error.message });
  }
}

// Delete plant
export async function deletePlant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const deleted = await plantRepo.deletePlant(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Plant not found' });
    }

    res.json({ success: true, message: 'Plant deleted' });
  } catch (error: any) {
    console.error('Delete plant error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete plant', message: error.message });
  }
}

// Water a plant
export async function waterPlant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { notes } = req.body;

    const plant = await plantRepo.waterPlant(id, notes);

    if (!plant) {
      return res.status(404).json({ success: false, error: 'Plant not found' });
    }

    res.json({ success: true, data: plant, message: `${plant.name} has been watered!` });
  } catch (error: any) {
    console.error('Water plant error:', error);
    res.status(500).json({ success: false, error: 'Failed to water plant', message: error.message });
  }
}

// Get watering history for a plant
export async function getWateringHistory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 20;

    const history = await plantRepo.getWateringHistory(id, limit);
    res.json({ success: true, data: history });
  } catch (error: any) {
    console.error('Get watering history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history', message: error.message });
  }
}

// Get plant care suggestion based on species
export async function getCareSuggestion(req: Request, res: Response) {
  try {
    const species = req.query.species as string;

    if (!species) {
      // Return all suggestions
      res.json({ success: true, data: plantRepo.PLANT_CARE_SUGGESTIONS });
      return;
    }

    const suggestion = plantRepo.getPlantCareSuggestion(species);

    if (!suggestion) {
      res.json({
        success: true,
        data: null,
        message: 'No care suggestion found for this plant type. Using default settings.',
      });
      return;
    }

    res.json({ success: true, data: suggestion });
  } catch (error: any) {
    console.error('Get care suggestion error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch care suggestion', message: error.message });
  }
}

// Get list of common plant species (for autocomplete)
export async function getCommonSpecies(req: Request, res: Response) {
  try {
    const species = Object.keys(plantRepo.PLANT_CARE_SUGGESTIONS);
    res.json({ success: true, data: species });
  } catch (error: any) {
    console.error('Get common species error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species', message: error.message });
  }
}
