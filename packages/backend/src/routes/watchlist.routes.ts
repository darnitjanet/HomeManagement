import { Router } from 'express';
import * as watchlistController from '../controllers/watchlist.controller';

const router = Router();

// Get all watchlist items (optional ?status=want_to_watch or ?status=watched)
router.get('/', watchlistController.getAllItems);

// Search watchlist
router.get('/search', watchlistController.searchItems);

// Get single item
router.get('/:id', watchlistController.getItem);

// Add to watchlist
router.post('/', watchlistController.addItem);

// Update item
router.put('/:id', watchlistController.updateItem);

// Mark as watched
router.put('/:id/watched', watchlistController.markAsWatched);

// Delete from watchlist
router.delete('/:id', watchlistController.deleteItem);

export default router;
