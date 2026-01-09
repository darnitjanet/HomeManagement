import { Router } from 'express';
import * as pantryController from '../controllers/pantry.controller';

const router = Router();

// Constants (categories, locations, units)
router.get('/constants', pantryController.getConstants);

// Queries (put before :id routes to avoid conflicts)
router.get('/search', pantryController.searchItems);
router.get('/expiring', pantryController.getExpiringItems);
router.get('/expired', pantryController.getExpiredItems);
router.get('/low-stock', pantryController.getLowStockItems);
router.get('/ingredients', pantryController.getIngredients);
router.get('/ingredients/detailed', pantryController.getIngredientsWithQuantity);

// Bulk operations
router.post('/bulk', pantryController.addMultipleItems);

// CRUD operations
router.get('/items', pantryController.getAllItems);
router.get('/items/:id', pantryController.getItem);
router.post('/items', pantryController.createItem);
router.put('/items/:id', pantryController.updateItem);
router.delete('/items/:id', pantryController.deleteItem);

// Quantity operations
router.patch('/items/:id/quantity', pantryController.updateQuantity);
router.post('/items/:id/increment', pantryController.incrementQuantity);
router.post('/items/:id/decrement', pantryController.decrementQuantity);

// Barcode lookup
router.get('/barcode/:barcode', pantryController.lookupBarcode);

export default router;
