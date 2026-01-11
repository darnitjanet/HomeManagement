import { Router } from 'express';
import * as mealPlanController from '../controllers/meal-plan.controller';

const router = Router();

// Get meal plan for a specific week
router.get('/', mealPlanController.getMealPlan);

// Get current week's meal plan
router.get('/current', mealPlanController.getCurrentMealPlan);

// Add or update a meal plan entry
router.post('/entries', mealPlanController.addMealPlanEntry);

// Update a meal plan entry
router.put('/entries/:id', mealPlanController.updateMealPlanEntry);

// Delete a meal plan entry
router.delete('/entries/:id', mealPlanController.deleteMealPlanEntry);

// Clear all entries for a week
router.delete('/clear', mealPlanController.clearMealPlan);

// Copy meal plan from one week to another
router.post('/copy', mealPlanController.copyMealPlan);

// Generate shopping list from meal plan
router.get('/shopping-list', mealPlanController.generateShoppingList);

export default router;
