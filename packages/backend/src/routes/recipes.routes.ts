import { Router } from 'express';
import * as recipesController from '../controllers/recipes.controller';

const router = Router();

// AI Status
router.get('/ai-status', recipesController.getAIStatus);

// AI Suggestions
router.post('/suggest/from-ingredients', recipesController.suggestFromIngredients);
router.post('/suggest/by-preference', recipesController.suggestByPreference);
router.post('/suggest/generate', recipesController.generateRecipeFromSuggestion);

// URL Import
router.post('/import-url', recipesController.importFromUrl);

// Tags management (before :id routes)
router.get('/tags/all', recipesController.getAllTags);
router.post('/tags', recipesController.createTag);
router.put('/tags/:id', recipesController.updateTag);
router.delete('/tags/:id', recipesController.deleteTag);

// Get recipes
router.get('/', recipesController.getAllRecipes);
router.get('/search', recipesController.searchRecipes);
router.get('/filter', recipesController.filterRecipes);
router.get('/favorites', recipesController.getFavoriteRecipes);
router.get('/tag/:tagId', recipesController.getRecipesByTag);
router.get('/:id', recipesController.getRecipe);

// Create recipe
router.post('/', recipesController.createRecipe);

// Update recipe
router.put('/:id', recipesController.updateRecipe);
router.post('/:id/favorite', recipesController.toggleFavorite);

// Delete recipe
router.delete('/:id', recipesController.deleteRecipe);

// Shopping list integration
router.post('/:id/add-to-shopping', recipesController.addIngredientsToShopping);

// Recipe tags
router.post('/:id/tags/:tagId', recipesController.addTagToRecipe);
router.delete('/:id/tags/:tagId', recipesController.removeTagFromRecipe);

export default router;
