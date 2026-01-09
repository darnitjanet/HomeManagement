import { Router } from 'express';
import * as travelController from '../controllers/travel.controller';

const router = Router();

// Stats (before :id routes)
router.get('/stats', travelController.getStats);

// Trips
router.get('/trips', travelController.getAllTrips);
router.post('/trips', travelController.createTrip);
router.get('/trips/:id', travelController.getTrip);
router.put('/trips/:id', travelController.updateTrip);
router.delete('/trips/:id', travelController.deleteTrip);
router.get('/trips/:tripId/places', travelController.getPlacesByTrip);

// Packing Lists (per trip)
router.get('/trips/:tripId/packing', travelController.getPackingItems);
router.get('/trips/:tripId/packing/progress', travelController.getPackingProgress);
router.post('/trips/:tripId/packing', travelController.createPackingItem);
router.post('/trips/:tripId/packing/bulk', travelController.createPackingItems);
router.delete('/trips/:tripId/packing', travelController.clearPackingList);

// Packing Items (individual)
router.put('/packing/:id', travelController.updatePackingItem);
router.patch('/packing/:id/toggle', travelController.togglePackingItem);
router.delete('/packing/:id', travelController.deletePackingItem);

// Places - search and filter routes before :id routes
router.get('/places/search', travelController.searchPlaces);
router.get('/places/country/:countryCode', travelController.getPlacesByCountry);

// Places CRUD
router.get('/places', travelController.getAllPlaces);
router.post('/places', travelController.createPlace);
router.get('/places/:id', travelController.getPlace);
router.put('/places/:id', travelController.updatePlace);
router.delete('/places/:id', travelController.deletePlace);

export default router;
