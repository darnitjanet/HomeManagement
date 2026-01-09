import { Request, Response } from 'express';
import * as travelRepo from '../repositories/travel.repository';

// Places

export async function getAllPlaces(req: Request, res: Response) {
  try {
    const places = await travelRepo.getAllPlaces();
    res.json({ success: true, data: places });
  } catch (error: any) {
    console.error('Failed to get places:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPlace(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const place = await travelRepo.getPlace(id);
    if (!place) {
      return res.status(404).json({ success: false, error: 'Place not found' });
    }
    res.json({ success: true, data: place });
  } catch (error: any) {
    console.error('Failed to get place:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createPlace(req: Request, res: Response) {
  try {
    const { name, latitude, longitude } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name, latitude, and longitude are required',
      });
    }

    const id = await travelRepo.createPlace(req.body);
    const place = await travelRepo.getPlace(id);
    res.status(201).json({ success: true, data: place });
  } catch (error: any) {
    console.error('Failed to create place:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updatePlace(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const existing = await travelRepo.getPlace(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Place not found' });
    }

    await travelRepo.updatePlace(id, req.body);
    const updated = await travelRepo.getPlace(id);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to update place:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deletePlace(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const existing = await travelRepo.getPlace(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Place not found' });
    }

    await travelRepo.deletePlace(id);
    res.json({ success: true, message: 'Place deleted' });
  } catch (error: any) {
    console.error('Failed to delete place:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function searchPlaces(req: Request, res: Response) {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter q is required' });
    }

    const places = await travelRepo.searchPlaces(query);
    res.json({ success: true, data: places });
  } catch (error: any) {
    console.error('Failed to search places:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPlacesByTrip(req: Request, res: Response) {
  try {
    const tripId = parseInt(req.params.tripId);
    const places = await travelRepo.getPlacesByTrip(tripId);
    res.json({ success: true, data: places });
  } catch (error: any) {
    console.error('Failed to get places by trip:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPlacesByCountry(req: Request, res: Response) {
  try {
    const countryCode = req.params.countryCode;
    const places = await travelRepo.getPlacesByCountry(countryCode);
    res.json({ success: true, data: places });
  } catch (error: any) {
    console.error('Failed to get places by country:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Trips

export async function getAllTrips(req: Request, res: Response) {
  try {
    const trips = await travelRepo.getAllTrips();
    res.json({ success: true, data: trips });
  } catch (error: any) {
    console.error('Failed to get trips:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getTrip(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const trip = await travelRepo.getTrip(id);
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }
    res.json({ success: true, data: trip });
  } catch (error: any) {
    console.error('Failed to get trip:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createTrip(req: Request, res: Response) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const id = await travelRepo.createTrip(req.body);
    const trip = await travelRepo.getTrip(id);
    res.status(201).json({ success: true, data: trip });
  } catch (error: any) {
    console.error('Failed to create trip:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updateTrip(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const existing = await travelRepo.getTrip(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    await travelRepo.updateTrip(id, req.body);
    const updated = await travelRepo.getTrip(id);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to update trip:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deleteTrip(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const existing = await travelRepo.getTrip(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    await travelRepo.deleteTrip(id);
    res.json({ success: true, message: 'Trip deleted' });
  } catch (error: any) {
    console.error('Failed to delete trip:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Stats

export async function getStats(req: Request, res: Response) {
  try {
    const stats = await travelRepo.getStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Failed to get stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Packing Items

export async function getPackingItems(req: Request, res: Response) {
  try {
    const tripId = parseInt(req.params.tripId);
    const assignee = req.query.assignee as string | undefined;
    const items = await travelRepo.getPackingItemsByTrip(tripId, assignee);
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Failed to get packing items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function getPackingProgress(req: Request, res: Response) {
  try {
    const tripId = parseInt(req.params.tripId);
    const progress = await travelRepo.getPackingProgress(tripId);
    res.json({ success: true, data: progress });
  } catch (error: any) {
    console.error('Failed to get packing progress:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createPackingItem(req: Request, res: Response) {
  try {
    const tripId = parseInt(req.params.tripId);
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const id = await travelRepo.createPackingItem({ ...req.body, tripId });
    const item = await travelRepo.getPackingItem(id);
    res.status(201).json({ success: true, data: item });
  } catch (error: any) {
    console.error('Failed to create packing item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function createPackingItems(req: Request, res: Response) {
  try {
    const tripId = parseInt(req.params.tripId);
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }

    const itemsWithTripId = items.map((item: any) => ({ ...item, tripId }));
    await travelRepo.createPackingItems(itemsWithTripId);
    const allItems = await travelRepo.getPackingItemsByTrip(tripId);
    res.status(201).json({ success: true, data: allItems });
  } catch (error: any) {
    console.error('Failed to create packing items:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function updatePackingItem(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const existing = await travelRepo.getPackingItem(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Packing item not found' });
    }

    await travelRepo.updatePackingItem(id, req.body);
    const updated = await travelRepo.getPackingItem(id);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to update packing item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function togglePackingItem(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const existing = await travelRepo.getPackingItem(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Packing item not found' });
    }

    const packed = await travelRepo.togglePackingItem(id);
    const updated = await travelRepo.getPackingItem(id);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Failed to toggle packing item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function deletePackingItem(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const existing = await travelRepo.getPackingItem(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Packing item not found' });
    }

    await travelRepo.deletePackingItem(id);
    res.json({ success: true, message: 'Packing item deleted' });
  } catch (error: any) {
    console.error('Failed to delete packing item:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function clearPackingList(req: Request, res: Response) {
  try {
    const tripId = parseInt(req.params.tripId);
    await travelRepo.deletePackingItemsByTrip(tripId);
    res.json({ success: true, message: 'Packing list cleared' });
  } catch (error: any) {
    console.error('Failed to clear packing list:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
