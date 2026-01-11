import { Request, Response } from 'express';
import * as mealPlanRepo from '../repositories/meal-plan.repository';

// Get meal plan for a specific week
export async function getMealPlan(req: Request, res: Response) {
  try {
    const { weekStart } = req.query;

    if (!weekStart || typeof weekStart !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'weekStart query parameter is required (YYYY-MM-DD format)',
      });
    }

    const plan = await mealPlanRepo.getMealPlanForWeek(weekStart);

    res.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error('Get meal plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get meal plan',
    });
  }
}

// Get current week's meal plan
export async function getCurrentMealPlan(req: Request, res: Response) {
  try {
    const plan = await mealPlanRepo.getCurrentWeekMealPlan();

    res.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error('Get current meal plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get current meal plan',
    });
  }
}

// Add or update a meal plan entry
export async function addMealPlanEntry(req: Request, res: Response) {
  try {
    const { weekStart } = req.query;
    const { day_of_week, meal_type, recipe_id, custom_meal, notes, servings } = req.body;

    if (!weekStart || typeof weekStart !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'weekStart query parameter is required',
      });
    }

    if (day_of_week === undefined || !meal_type) {
      return res.status(400).json({
        success: false,
        message: 'day_of_week and meal_type are required',
      });
    }

    const entry = await mealPlanRepo.addMealPlanEntry(weekStart, {
      day_of_week,
      meal_type,
      recipe_id,
      custom_meal,
      notes,
      servings,
    });

    res.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('Add meal plan entry error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add meal plan entry',
    });
  }
}

// Update a meal plan entry
export async function updateMealPlanEntry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const entry = await mealPlanRepo.updateMealPlanEntry(parseInt(id), req.body);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan entry not found',
      });
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('Update meal plan entry error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update meal plan entry',
    });
  }
}

// Delete a meal plan entry
export async function deleteMealPlanEntry(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await mealPlanRepo.deleteMealPlanEntry(parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan entry not found',
      });
    }

    res.json({
      success: true,
      message: 'Entry deleted',
    });
  } catch (error: any) {
    console.error('Delete meal plan entry error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete meal plan entry',
    });
  }
}

// Clear all entries for a week
export async function clearMealPlan(req: Request, res: Response) {
  try {
    const { weekStart } = req.query;

    if (!weekStart || typeof weekStart !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'weekStart query parameter is required',
      });
    }

    await mealPlanRepo.clearMealPlan(weekStart);

    res.json({
      success: true,
      message: 'Meal plan cleared',
    });
  } catch (error: any) {
    console.error('Clear meal plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear meal plan',
    });
  }
}

// Copy meal plan from one week to another
export async function copyMealPlan(req: Request, res: Response) {
  try {
    const { fromWeek, toWeek } = req.body;

    if (!fromWeek || !toWeek) {
      return res.status(400).json({
        success: false,
        message: 'fromWeek and toWeek are required',
      });
    }

    const plan = await mealPlanRepo.copyMealPlan(fromWeek, toWeek);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Source meal plan not found or empty',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error: any) {
    console.error('Copy meal plan error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to copy meal plan',
    });
  }
}

// Generate shopping list from meal plan
export async function generateShoppingList(req: Request, res: Response) {
  try {
    const { weekStart } = req.query;

    if (!weekStart || typeof weekStart !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'weekStart query parameter is required',
      });
    }

    const shoppingList = await mealPlanRepo.generateShoppingList(weekStart);

    res.json({
      success: true,
      data: shoppingList,
    });
  } catch (error: any) {
    console.error('Generate shopping list error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate shopping list',
    });
  }
}
