import { db } from '../config/database';

export interface MealPlan {
  id: number;
  week_start_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  entries?: MealPlanEntry[];
}

export interface MealPlanEntry {
  id: number;
  meal_plan_id: number;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id: number | null;
  custom_meal: string | null;
  notes: string | null;
  servings: number;
  created_at: string;
  updated_at: string;
  recipe?: {
    id: number;
    name: string;
    image_url: string | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
  };
}

export interface CreateMealPlanEntryData {
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id?: number | null;
  custom_meal?: string | null;
  notes?: string | null;
  servings?: number;
}

// Get Monday of a given week
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Get or create meal plan for a week
export async function getOrCreateMealPlan(weekStartDate: string): Promise<MealPlan> {
  let plan = await db('meal_plans').where({ week_start_date: weekStartDate }).first();

  if (!plan) {
    const [id] = await db('meal_plans').insert({
      week_start_date: weekStartDate,
    });
    plan = await db('meal_plans').where({ id }).first();
  }

  return plan;
}

// Get meal plan with entries for a specific week
export async function getMealPlanForWeek(weekStartDate: string): Promise<MealPlan | null> {
  const plan = await db('meal_plans').where({ week_start_date: weekStartDate }).first();

  if (!plan) return null;

  const entries = await db('meal_plan_entries')
    .where({ meal_plan_id: plan.id })
    .leftJoin('recipes', 'meal_plan_entries.recipe_id', 'recipes.id')
    .select(
      'meal_plan_entries.*',
      'recipes.name as recipe_name',
      'recipes.image_url as recipe_image_url',
      'recipes.prep_time_minutes as recipe_prep_time',
      'recipes.cook_time_minutes as recipe_cook_time'
    );

  plan.entries = entries.map((entry: any) => ({
    id: entry.id,
    meal_plan_id: entry.meal_plan_id,
    day_of_week: entry.day_of_week,
    meal_type: entry.meal_type,
    recipe_id: entry.recipe_id,
    custom_meal: entry.custom_meal,
    notes: entry.notes,
    servings: entry.servings,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    recipe: entry.recipe_id ? {
      id: entry.recipe_id,
      name: entry.recipe_name,
      image_url: entry.recipe_image_url,
      prep_time_minutes: entry.recipe_prep_time,
      cook_time_minutes: entry.recipe_cook_time,
    } : undefined,
  }));

  return plan;
}

// Get meal plan for current week
export async function getCurrentWeekMealPlan(): Promise<MealPlan | null> {
  const weekStart = getWeekStart(new Date());
  return getMealPlanForWeek(weekStart);
}

// Add entry to meal plan
export async function addMealPlanEntry(
  weekStartDate: string,
  data: CreateMealPlanEntryData
): Promise<MealPlanEntry> {
  const plan = await getOrCreateMealPlan(weekStartDate);

  // Check if entry already exists for this slot
  const existing = await db('meal_plan_entries')
    .where({
      meal_plan_id: plan.id,
      day_of_week: data.day_of_week,
      meal_type: data.meal_type,
    })
    .first();

  if (existing) {
    // Update existing entry
    await db('meal_plan_entries')
      .where({ id: existing.id })
      .update({
        recipe_id: data.recipe_id || null,
        custom_meal: data.custom_meal || null,
        notes: data.notes || null,
        servings: data.servings || 4,
        updated_at: new Date().toISOString(),
      });
    return db('meal_plan_entries').where({ id: existing.id }).first();
  }

  // Create new entry
  const [id] = await db('meal_plan_entries').insert({
    meal_plan_id: plan.id,
    day_of_week: data.day_of_week,
    meal_type: data.meal_type,
    recipe_id: data.recipe_id || null,
    custom_meal: data.custom_meal || null,
    notes: data.notes || null,
    servings: data.servings || 4,
  });

  return db('meal_plan_entries').where({ id }).first();
}

// Update meal plan entry
export async function updateMealPlanEntry(
  entryId: number,
  data: Partial<CreateMealPlanEntryData>
): Promise<MealPlanEntry | null> {
  const updateData: any = { updated_at: new Date().toISOString() };

  if (data.recipe_id !== undefined) updateData.recipe_id = data.recipe_id;
  if (data.custom_meal !== undefined) updateData.custom_meal = data.custom_meal;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.servings !== undefined) updateData.servings = data.servings;
  if (data.day_of_week !== undefined) updateData.day_of_week = data.day_of_week;
  if (data.meal_type !== undefined) updateData.meal_type = data.meal_type;

  await db('meal_plan_entries').where({ id: entryId }).update(updateData);
  return db('meal_plan_entries').where({ id: entryId }).first();
}

// Delete meal plan entry
export async function deleteMealPlanEntry(entryId: number): Promise<boolean> {
  const deleted = await db('meal_plan_entries').where({ id: entryId }).delete();
  return deleted > 0;
}

// Clear all entries for a meal plan
export async function clearMealPlan(weekStartDate: string): Promise<boolean> {
  const plan = await db('meal_plans').where({ week_start_date: weekStartDate }).first();
  if (!plan) return false;

  await db('meal_plan_entries').where({ meal_plan_id: plan.id }).delete();
  return true;
}

// Copy meal plan from one week to another
export async function copyMealPlan(
  fromWeekStart: string,
  toWeekStart: string
): Promise<MealPlan | null> {
  const sourcePlan = await getMealPlanForWeek(fromWeekStart);
  if (!sourcePlan || !sourcePlan.entries || sourcePlan.entries.length === 0) {
    return null;
  }

  const targetPlan = await getOrCreateMealPlan(toWeekStart);

  // Clear existing entries in target
  await db('meal_plan_entries').where({ meal_plan_id: targetPlan.id }).delete();

  // Copy entries
  const newEntries = sourcePlan.entries.map((entry) => ({
    meal_plan_id: targetPlan.id,
    day_of_week: entry.day_of_week,
    meal_type: entry.meal_type,
    recipe_id: entry.recipe_id,
    custom_meal: entry.custom_meal,
    notes: entry.notes,
    servings: entry.servings,
  }));

  if (newEntries.length > 0) {
    await db('meal_plan_entries').insert(newEntries);
  }

  return getMealPlanForWeek(toWeekStart);
}

// Get ingredients for meal plan (for shopping list generation)
export async function getMealPlanIngredients(weekStartDate: string): Promise<{
  ingredient: string;
  quantity: number | null;
  unit: string | null;
  recipe_name: string;
}[]> {
  const plan = await db('meal_plans').where({ week_start_date: weekStartDate }).first();
  if (!plan) return [];

  const ingredients = await db('meal_plan_entries')
    .where({ meal_plan_id: plan.id })
    .whereNotNull('recipe_id')
    .join('recipes', 'meal_plan_entries.recipe_id', 'recipes.id')
    .join('recipe_ingredients', 'recipes.id', 'recipe_ingredients.recipe_id')
    .select(
      'recipe_ingredients.name as ingredient',
      'recipe_ingredients.quantity',
      'recipe_ingredients.unit',
      'recipes.name as recipe_name',
      'meal_plan_entries.servings as planned_servings',
      'recipes.servings as recipe_servings'
    );

  // Adjust quantities based on servings
  return ingredients.map((item: any) => {
    const servingRatio = item.recipe_servings ? item.planned_servings / item.recipe_servings : 1;
    return {
      ingredient: item.ingredient,
      quantity: item.quantity ? Math.ceil(item.quantity * servingRatio * 10) / 10 : null,
      unit: item.unit,
      recipe_name: item.recipe_name,
    };
  });
}

// Get consolidated shopping list from meal plan
export async function generateShoppingList(weekStartDate: string): Promise<{
  name: string;
  quantity: number | null;
  unit: string | null;
  recipes: string[];
}[]> {
  const ingredients = await getMealPlanIngredients(weekStartDate);

  // Consolidate ingredients
  const consolidated = new Map<string, {
    quantity: number | null;
    unit: string | null;
    recipes: Set<string>;
  }>();

  for (const item of ingredients) {
    const key = `${item.ingredient.toLowerCase()}|${item.unit || ''}`;

    if (consolidated.has(key)) {
      const existing = consolidated.get(key)!;
      if (existing.quantity !== null && item.quantity !== null) {
        existing.quantity += item.quantity;
      }
      existing.recipes.add(item.recipe_name);
    } else {
      consolidated.set(key, {
        quantity: item.quantity,
        unit: item.unit,
        recipes: new Set([item.recipe_name]),
      });
    }
  }

  // Convert to array
  return Array.from(consolidated.entries()).map(([key, value]) => ({
    name: key.split('|')[0],
    quantity: value.quantity ? Math.ceil(value.quantity * 10) / 10 : null,
    unit: value.unit,
    recipes: Array.from(value.recipes),
  })).sort((a, b) => a.name.localeCompare(b.name));
}
