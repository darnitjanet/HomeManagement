import { db } from '../config/database';
import {
  Recipe,
  RecipeIngredient,
  RecipeTag,
  CreateRecipeInput,
  UpdateRecipeInput,
  CreateIngredientInput,
} from '../types';

export class RecipeRepository {
  // =====================
  // RECIPE CRUD
  // =====================

  async getAllRecipes(): Promise<Recipe[]> {
    const recipes = await db('recipes').orderBy('name', 'asc');

    for (const recipe of recipes) {
      recipe.ingredients = await this.getRecipeIngredients(recipe.id);
      recipe.tags = await this.getRecipeTags(recipe.id);
    }

    return recipes.map(this.mapFromDb);
  }

  async getRecipe(id: number): Promise<Recipe | null> {
    const recipe = await db('recipes').where({ id }).first();
    if (!recipe) return null;

    recipe.ingredients = await this.getRecipeIngredients(id);
    recipe.tags = await this.getRecipeTags(id);

    return this.mapFromDb(recipe);
  }

  async searchRecipes(query: string): Promise<Recipe[]> {
    const recipes = await db('recipes')
      .where('name', 'like', `%${query}%`)
      .orWhere('notes', 'like', `%${query}%`)
      .orWhere('cuisine', 'like', `%${query}%`)
      .orWhere('instructions', 'like', `%${query}%`)
      .orderBy('name', 'asc');

    for (const recipe of recipes) {
      recipe.ingredients = await this.getRecipeIngredients(recipe.id);
      recipe.tags = await this.getRecipeTags(recipe.id);
    }

    return recipes.map(this.mapFromDb);
  }

  async filterRecipes(filters: {
    cuisine?: string;
    mealType?: string;
    difficulty?: string;
    dietary?: string;
    isFavorite?: boolean;
  }): Promise<Recipe[]> {
    let query = db('recipes');

    if (filters.cuisine) query = query.where('cuisine', filters.cuisine);
    if (filters.mealType) query = query.where('meal_type', filters.mealType);
    if (filters.difficulty) query = query.where('difficulty', filters.difficulty);
    if (filters.dietary) query = query.where('dietary', 'like', `%${filters.dietary}%`);
    if (filters.isFavorite !== undefined) query = query.where('is_favorite', filters.isFavorite);

    const recipes = await query.orderBy('name', 'asc');

    for (const recipe of recipes) {
      recipe.ingredients = await this.getRecipeIngredients(recipe.id);
      recipe.tags = await this.getRecipeTags(recipe.id);
    }

    return recipes.map(this.mapFromDb);
  }

  async getFavoriteRecipes(): Promise<Recipe[]> {
    return this.filterRecipes({ isFavorite: true });
  }

  async getRecipesByTag(tagId: number): Promise<Recipe[]> {
    const recipes = await db('recipes')
      .join('recipe_tag_assignments', 'recipes.id', 'recipe_tag_assignments.recipe_id')
      .where('recipe_tag_assignments.tag_id', tagId)
      .select('recipes.*')
      .orderBy('recipes.name', 'asc');

    for (const recipe of recipes) {
      recipe.ingredients = await this.getRecipeIngredients(recipe.id);
      recipe.tags = await this.getRecipeTags(recipe.id);
    }

    return recipes.map(this.mapFromDb);
  }

  async createRecipe(input: CreateRecipeInput): Promise<number> {
    const dbData = this.mapToDb(input);
    const [id] = await db('recipes').insert(dbData);

    // Add ingredients if provided
    if (input.ingredients && input.ingredients.length > 0) {
      for (let i = 0; i < input.ingredients.length; i++) {
        await this.addIngredient(id, { ...input.ingredients[i], sortOrder: i });
      }
    }

    return id;
  }

  async updateRecipe(id: number, input: UpdateRecipeInput): Promise<void> {
    const dbData = this.mapToDb(input);
    await db('recipes')
      .where({ id })
      .update({
        ...dbData,
        updated_at: db.fn.now(),
      });
  }

  async deleteRecipe(id: number): Promise<void> {
    await db('recipes').where({ id }).delete();
  }

  async toggleFavorite(id: number): Promise<boolean> {
    const recipe = await db('recipes').where({ id }).first();
    const newValue = !recipe.is_favorite;
    await db('recipes').where({ id }).update({ is_favorite: newValue });
    return newValue;
  }

  // =====================
  // INGREDIENTS
  // =====================

  async getRecipeIngredients(recipeId: number): Promise<RecipeIngredient[]> {
    const ingredients = await db('recipe_ingredients')
      .where({ recipe_id: recipeId })
      .orderBy('sort_order', 'asc');

    return ingredients.map(this.mapIngredientFromDb);
  }

  async addIngredient(recipeId: number, input: CreateIngredientInput): Promise<number> {
    const [id] = await db('recipe_ingredients').insert({
      recipe_id: recipeId,
      name: input.name,
      quantity: input.quantity || null,
      unit: input.unit || null,
      preparation: input.preparation || null,
      optional: input.optional || false,
      sort_order: input.sortOrder || 0,
    });
    return id;
  }

  async updateIngredient(id: number, input: Partial<CreateIngredientInput>): Promise<void> {
    const updates: any = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.quantity !== undefined) updates.quantity = input.quantity;
    if (input.unit !== undefined) updates.unit = input.unit;
    if (input.preparation !== undefined) updates.preparation = input.preparation;
    if (input.optional !== undefined) updates.optional = input.optional;
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

    await db('recipe_ingredients').where({ id }).update(updates);
  }

  async deleteIngredient(id: number): Promise<void> {
    await db('recipe_ingredients').where({ id }).delete();
  }

  async replaceIngredients(recipeId: number, ingredients: CreateIngredientInput[]): Promise<void> {
    await db('recipe_ingredients').where({ recipe_id: recipeId }).delete();

    for (let i = 0; i < ingredients.length; i++) {
      await this.addIngredient(recipeId, { ...ingredients[i], sortOrder: i });
    }
  }

  // =====================
  // TAG MANAGEMENT
  // =====================

  async getAllTags(): Promise<RecipeTag[]> {
    const tags = await db('recipe_tags').orderBy('priority', 'desc');
    return tags.map(this.mapTagFromDb);
  }

  async getRecipeTags(recipeId: number): Promise<RecipeTag[]> {
    const tags = await db('recipe_tags')
      .join('recipe_tag_assignments', 'recipe_tags.id', 'recipe_tag_assignments.tag_id')
      .where('recipe_tag_assignments.recipe_id', recipeId)
      .select('recipe_tags.*')
      .orderBy('recipe_tags.priority', 'desc');

    return tags.map(this.mapTagFromDb);
  }

  async createTag(name: string, color: string, priority: number = 0): Promise<number> {
    const [id] = await db('recipe_tags').insert({ name, color, priority });
    return id;
  }

  async updateTag(
    id: number,
    data: { name?: string; color?: string; priority?: number }
  ): Promise<void> {
    await db('recipe_tags').where({ id }).update(data);
  }

  async deleteTag(id: number): Promise<void> {
    await db('recipe_tags').where({ id }).delete();
  }

  async addTagToRecipe(recipeId: number, tagId: number): Promise<void> {
    // Check if assignment already exists
    const existing = await db('recipe_tag_assignments')
      .where({ recipe_id: recipeId, tag_id: tagId })
      .first();

    if (!existing) {
      await db('recipe_tag_assignments').insert({
        recipe_id: recipeId,
        tag_id: tagId,
      });
    }
  }

  async removeTagFromRecipe(recipeId: number, tagId: number): Promise<void> {
    await db('recipe_tag_assignments')
      .where({ recipe_id: recipeId, tag_id: tagId })
      .delete();
  }

  // =====================
  // MAPPING FUNCTIONS
  // =====================

  private mapFromDb(row: any): Recipe {
    return {
      id: row.id,
      name: row.name,
      instructions: row.instructions,
      prepTimeMinutes: row.prep_time_minutes,
      cookTimeMinutes: row.cook_time_minutes,
      servings: row.servings,
      cuisine: row.cuisine,
      mealType: row.meal_type,
      difficulty: row.difficulty,
      dietary: row.dietary,
      notes: row.notes,
      imageUrl: row.image_url,
      sourceUrl: row.source_url,
      isFavorite: !!row.is_favorite,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ingredients: row.ingredients,
      tags: row.tags,
    };
  }

  private mapToDb(input: Partial<CreateRecipeInput>): any {
    const dbData: any = {};

    if (input.name !== undefined) dbData.name = input.name;
    if (input.instructions !== undefined) dbData.instructions = input.instructions;
    if (input.prepTimeMinutes !== undefined) dbData.prep_time_minutes = input.prepTimeMinutes;
    if (input.cookTimeMinutes !== undefined) dbData.cook_time_minutes = input.cookTimeMinutes;
    if (input.servings !== undefined) dbData.servings = input.servings;
    if (input.cuisine !== undefined) dbData.cuisine = input.cuisine;
    if (input.mealType !== undefined) dbData.meal_type = input.mealType;
    if (input.difficulty !== undefined) dbData.difficulty = input.difficulty;
    if (input.dietary !== undefined) dbData.dietary = input.dietary;
    if (input.notes !== undefined) dbData.notes = input.notes;
    if (input.imageUrl !== undefined) dbData.image_url = input.imageUrl;
    if (input.sourceUrl !== undefined) dbData.source_url = input.sourceUrl;

    return dbData;
  }

  private mapIngredientFromDb(row: any): RecipeIngredient {
    return {
      id: row.id,
      recipeId: row.recipe_id,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      preparation: row.preparation,
      optional: !!row.optional,
      sortOrder: row.sort_order,
    };
  }

  private mapTagFromDb(row: any): RecipeTag {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      priority: row.priority,
      createdAt: row.created_at,
    };
  }
}
