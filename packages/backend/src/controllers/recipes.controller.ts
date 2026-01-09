import { Request, Response } from 'express';
import { RecipeRepository } from '../repositories/recipe.repository';
import { ShoppingRepository } from '../repositories/shopping.repository';
import {
  suggestRecipesFromIngredients,
  suggestRecipesByPreference,
  generateFullRecipe,
  categorizeGroceryItem,
  isAIEnabled,
  importRecipeFromUrl,
} from '../services/ai.service';

const recipeRepo = new RecipeRepository();
const shoppingRepo = new ShoppingRepository();

// =====================
// AI STATUS
// =====================

export async function getAIStatus(_req: Request, res: Response) {
  res.json({ success: true, data: { aiEnabled: isAIEnabled() } });
}

// =====================
// RECIPE CRUD
// =====================

export async function getAllRecipes(req: Request, res: Response) {
  try {
    const recipes = await recipeRepo.getAllRecipes();
    res.json({ success: true, data: recipes });
  } catch (error: any) {
    console.error('Get recipes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recipes',
      message: error.message,
    });
  }
}

export async function getRecipe(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const recipe = await recipeRepo.getRecipe(parseInt(id));

    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    res.json({ success: true, data: recipe });
  } catch (error: any) {
    console.error('Get recipe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recipe',
      message: error.message,
    });
  }
}

export async function searchRecipes(req: Request, res: Response) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const recipes = await recipeRepo.searchRecipes(q);
    res.json({ success: true, data: recipes });
  } catch (error: any) {
    console.error('Search recipes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search recipes',
      message: error.message,
    });
  }
}

export async function filterRecipes(req: Request, res: Response) {
  try {
    const { cuisine, mealType, difficulty, dietary, isFavorite } = req.query;

    const filters: any = {};
    if (cuisine) filters.cuisine = cuisine as string;
    if (mealType) filters.mealType = mealType as string;
    if (difficulty) filters.difficulty = difficulty as string;
    if (dietary) filters.dietary = dietary as string;
    if (isFavorite !== undefined) filters.isFavorite = isFavorite === 'true';

    const recipes = await recipeRepo.filterRecipes(filters);
    res.json({ success: true, data: recipes });
  } catch (error: any) {
    console.error('Filter recipes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter recipes',
      message: error.message,
    });
  }
}

export async function getFavoriteRecipes(req: Request, res: Response) {
  try {
    const recipes = await recipeRepo.getFavoriteRecipes();
    res.json({ success: true, data: recipes });
  } catch (error: any) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve favorites',
      message: error.message,
    });
  }
}

export async function getRecipesByTag(req: Request, res: Response) {
  try {
    const { tagId } = req.params;
    const recipes = await recipeRepo.getRecipesByTag(parseInt(tagId));
    res.json({ success: true, data: recipes });
  } catch (error: any) {
    console.error('Get recipes by tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recipes',
      message: error.message,
    });
  }
}

export async function createRecipe(req: Request, res: Response) {
  try {
    const recipeData = req.body;

    if (!recipeData.name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const id = await recipeRepo.createRecipe(recipeData);

    // If tags were provided, add them
    if (recipeData.tags && Array.isArray(recipeData.tags)) {
      for (const tagId of recipeData.tags) {
        await recipeRepo.addTagToRecipe(id, tagId);
      }
    }

    const recipe = await recipeRepo.getRecipe(id);
    res.json({ success: true, data: recipe });
  } catch (error: any) {
    console.error('Create recipe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create recipe',
      message: error.message,
    });
  }
}

export async function updateRecipe(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    await recipeRepo.updateRecipe(parseInt(id), updates);

    // If ingredients were provided, replace them
    if (updates.ingredients && Array.isArray(updates.ingredients)) {
      await recipeRepo.replaceIngredients(parseInt(id), updates.ingredients);
    }

    const recipe = await recipeRepo.getRecipe(parseInt(id));
    res.json({ success: true, data: recipe });
  } catch (error: any) {
    console.error('Update recipe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recipe',
      message: error.message,
    });
  }
}

export async function deleteRecipe(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await recipeRepo.deleteRecipe(parseInt(id));
    res.json({ success: true, message: 'Recipe deleted successfully' });
  } catch (error: any) {
    console.error('Delete recipe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete recipe',
      message: error.message,
    });
  }
}

export async function toggleFavorite(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await recipeRepo.toggleFavorite(parseInt(id));
    const recipe = await recipeRepo.getRecipe(parseInt(id));
    res.json({ success: true, data: recipe });
  } catch (error: any) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite',
      message: error.message,
    });
  }
}

// =====================
// SHOPPING LIST INTEGRATION
// =====================

export async function addIngredientsToShopping(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { ingredientIds, scaleMultiplier = 1 } = req.body;

    const recipe = await recipeRepo.getRecipe(parseInt(id));
    if (!recipe) {
      return res.status(404).json({ success: false, error: 'Recipe not found' });
    }

    // Get ingredients to add (all if ingredientIds not specified)
    let ingredientsToAdd = recipe.ingredients || [];
    if (ingredientIds && Array.isArray(ingredientIds) && ingredientIds.length > 0) {
      ingredientsToAdd = ingredientsToAdd.filter((i) => ingredientIds.includes(i.id));
    }

    const addedItems = [];
    for (const ingredient of ingredientsToAdd) {
      // Build the item name with unit info
      let itemName = ingredient.name;
      if (ingredient.quantity && ingredient.unit) {
        itemName = `${ingredient.name} (${ingredient.quantity * scaleMultiplier} ${ingredient.unit})`;
      }

      // Auto-categorize using AI
      const category = await categorizeGroceryItem(ingredient.name);

      const itemId = await shoppingRepo.addItem({
        listType: 'grocery',
        name: itemName,
        quantity: 1,
        category,
      });

      addedItems.push({ id: itemId, name: itemName, category });
    }

    res.json({
      success: true,
      data: { addedItems, recipeId: parseInt(id) },
    });
  } catch (error: any) {
    console.error('Add to shopping error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add ingredients to shopping list',
      message: error.message,
    });
  }
}

// =====================
// AI SUGGESTIONS
// =====================

export async function suggestFromIngredients(req: Request, res: Response) {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Ingredients array is required',
      });
    }

    const suggestions = await suggestRecipesFromIngredients(ingredients);
    res.json({ success: true, data: suggestions });
  } catch (error: any) {
    console.error('Suggest from ingredients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
      message: error.message,
    });
  }
}

export async function suggestByPreference(req: Request, res: Response) {
  try {
    const preferences = req.body;

    const suggestions = await suggestRecipesByPreference(preferences);
    res.json({ success: true, data: suggestions });
  } catch (error: any) {
    console.error('Suggest by preference error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
      message: error.message,
    });
  }
}

export async function generateRecipeFromSuggestion(req: Request, res: Response) {
  try {
    const suggestion = req.body;

    if (!suggestion.name) {
      return res.status(400).json({
        success: false,
        error: 'Suggestion with name is required',
      });
    }

    const fullRecipe = await generateFullRecipe(suggestion);

    if (!fullRecipe) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate recipe',
      });
    }

    res.json({ success: true, data: fullRecipe });
  } catch (error: any) {
    console.error('Generate recipe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recipe',
      message: error.message,
    });
  }
}

// =====================
// URL IMPORT
// =====================

export async function importFromUrl(req: Request, res: Response) {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    const importedRecipe = await importRecipeFromUrl(url);
    res.json({ success: true, data: importedRecipe });
  } catch (error: any) {
    console.error('Import from URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import recipe',
      message: error.message,
    });
  }
}

// =====================
// TAG ENDPOINTS
// =====================

export async function getAllTags(req: Request, res: Response) {
  try {
    const tags = await recipeRepo.getAllTags();
    res.json({ success: true, data: tags });
  } catch (error: any) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tags',
      message: error.message,
    });
  }
}

export async function createTag(req: Request, res: Response) {
  try {
    const { name, color, priority } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Tag name is required' });
    }

    const id = await recipeRepo.createTag(name, color || '#6b7280', priority || 0);
    const tags = await recipeRepo.getAllTags();
    const tag = tags.find((t) => t.id === id);

    res.json({ success: true, data: tag });
  } catch (error: any) {
    console.error('Create tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tag',
      message: error.message,
    });
  }
}

export async function updateTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    await recipeRepo.updateTag(parseInt(id), updates);

    const tags = await recipeRepo.getAllTags();
    const tag = tags.find((t) => t.id === parseInt(id));

    res.json({ success: true, data: tag });
  } catch (error: any) {
    console.error('Update tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tag',
      message: error.message,
    });
  }
}

export async function deleteTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await recipeRepo.deleteTag(parseInt(id));
    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error: any) {
    console.error('Delete tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tag',
      message: error.message,
    });
  }
}

export async function addTagToRecipe(req: Request, res: Response) {
  try {
    const { id, tagId } = req.params;

    await recipeRepo.addTagToRecipe(parseInt(id), parseInt(tagId));

    const recipe = await recipeRepo.getRecipe(parseInt(id));
    res.json({ success: true, data: recipe });
  } catch (error: any) {
    console.error('Add tag to recipe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add tag to recipe',
      message: error.message,
    });
  }
}

export async function removeTagFromRecipe(req: Request, res: Response) {
  try {
    const { id, tagId } = req.params;

    await recipeRepo.removeTagFromRecipe(parseInt(id), parseInt(tagId));

    const recipe = await recipeRepo.getRecipe(parseInt(id));
    res.json({ success: true, data: recipe });
  } catch (error: any) {
    console.error('Remove tag from recipe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove tag from recipe',
      message: error.message,
    });
  }
}
