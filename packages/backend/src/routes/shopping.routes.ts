import { Router } from 'express';
import * as shoppingController from '../controllers/shopping.controller';

const router = Router();

// AI Status
router.get('/ai-status', shoppingController.getAIStatus);

// Shopping Items
router.get('/:listType/items', shoppingController.getItems);
router.post('/:listType/items', shoppingController.addItem);
router.put('/:listType/items/:id', shoppingController.updateItemQuantity);
router.delete('/:listType/items/:id', shoppingController.removeItem);
router.delete('/:listType/items', shoppingController.clearList);

// Favorites
router.get('/:listType/favorites', shoppingController.getFavorites);
router.post('/:listType/favorites', shoppingController.addFavorite);
router.delete('/:listType/favorites/:id', shoppingController.removeFavorite);
router.post('/:listType/favorites/:id/add', shoppingController.addFavoriteToList);

export default router;
