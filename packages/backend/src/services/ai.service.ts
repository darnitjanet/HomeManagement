import Anthropic from '@anthropic-ai/sdk';
import { GroceryCategory, RecipeSuggestion, RecipePreferences } from '../types';
import { SmartInputParseResult } from '../types/smart-input.types';

const VALID_CATEGORIES: GroceryCategory[] = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Pantry',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Other',
];

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

export async function categorizeGroceryItem(itemName: string): Promise<GroceryCategory> {
  const client = getClient();

  if (!client) {
    console.log('No Anthropic API key configured, defaulting to Other');
    return 'Other';
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: `Categorize this grocery item into exactly one of these categories: Produce, Dairy, Meat & Seafood, Bakery, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other.

Item: "${itemName}"

Respond with ONLY the category name, nothing else.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    // Validate the response is a valid category
    const category = VALID_CATEGORIES.find(
      (c) => c.toLowerCase() === text.toLowerCase()
    );

    return category || 'Other';
  } catch (error) {
    console.error('AI categorization error:', error);
    return 'Other';
  }
}

export async function categorizeMultipleItems(
  itemNames: string[]
): Promise<Record<string, GroceryCategory>> {
  const client = getClient();

  if (!client || itemNames.length === 0) {
    return itemNames.reduce((acc, name) => {
      acc[name] = 'Other';
      return acc;
    }, {} as Record<string, GroceryCategory>);
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Categorize each grocery item into exactly one of these categories: Produce, Dairy, Meat & Seafood, Bakery, Frozen, Pantry, Beverages, Snacks, Household, Personal Care, Other.

Items:
${itemNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Respond with a JSON object where keys are the item names and values are the categories. Example: {"milk": "Dairy", "apples": "Produce"}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';

    // Parse JSON response
    const parsed = JSON.parse(text);

    // Validate and normalize
    const result: Record<string, GroceryCategory> = {};
    for (const name of itemNames) {
      const category = parsed[name] || parsed[name.toLowerCase()];
      const validCategory = VALID_CATEGORIES.find(
        (c) => c.toLowerCase() === (category || '').toLowerCase()
      );
      result[name] = validCategory || 'Other';
    }

    return result;
  } catch (error) {
    console.error('AI batch categorization error:', error);
    return itemNames.reduce((acc, name) => {
      acc[name] = 'Other';
      return acc;
    }, {} as Record<string, GroceryCategory>);
  }
}

export function isAIEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function parseSmartInput(
  input: string,
  currentDate: string
): Promise<SmartInputParseResult> {
  const client = getClient();

  if (!client) {
    throw new Error('AI service not configured - missing ANTHROPIC_API_KEY');
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are a natural language parser for a home management app. Parse the following input into structured actions.

Current date/time: ${currentDate}

Supported action types:
1. SHOPPING: Adding items to a shopping list
   - Keywords: "add X to shopping", "buy X", "need X", "get X", "pick up X"
   - Determine if grocery (food/drink items) or other (non-food like batteries, cleaning supplies, etc)
   - Extract quantity if mentioned (e.g., "2 gallons of milk" -> quantity: 2, name: "milk")
   - Default quantity is 1

2. CALENDAR: Creating calendar events with specific date/time
   - Keywords: "schedule X", "appointment X", "meeting X", "X on Tuesday", "X at 2pm"
   - ONLY use calendar for events with specific dates/times mentioned
   - Include the full natural language time expression for Google Calendar quick-add
   - Convert relative dates (e.g., "Tuesday" means the next Tuesday from current date)

3. TODO: Creating a task/to-do item
   - Keywords: "call X", "email X", "remind me to X", "task X", "do X", "remember to X", "don't forget X"
   - Use for action items, tasks, reminders WITHOUT specific date/time
   - Set priority based on urgency words: "urgent"/"asap" = urgent, "important" = high, default = medium
   - Extract the task title and optional description

User input: "${input.replace(/"/g, '\\"')}"

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{"actions":[...],"unrecognized":null}

Where actions is an array of:
- Shopping: {"type":"shopping","listType":"grocery"|"other","name":"item name","quantity":1}
- Calendar: {"type":"calendar","text":"event description with date/time"}
- Todo: {"type":"todo","title":"task title","description":"optional details","priority":"medium"}

Examples:
Input: "Add milk and bread to shopping"
Output: {"actions":[{"type":"shopping","listType":"grocery","name":"milk","quantity":1},{"type":"shopping","listType":"grocery","name":"bread","quantity":1}],"unrecognized":null}

Input: "Schedule dentist Tuesday 2pm"
Output: {"actions":[{"type":"calendar","text":"dentist Tuesday 2pm"}],"unrecognized":null}

Input: "Get 2 batteries and book haircut for Friday at 3"
Output: {"actions":[{"type":"shopping","listType":"other","name":"batteries","quantity":2},{"type":"calendar","text":"haircut Friday at 3"}],"unrecognized":null}

Input: "Call the pharmacy"
Output: {"actions":[{"type":"todo","title":"Call the pharmacy","priority":"medium"}],"unrecognized":null}

Input: "Urgent: email boss about project deadline"
Output: {"actions":[{"type":"todo","title":"Email boss about project deadline","priority":"urgent"}],"unrecognized":null}

Input: "Remember to pick up dry cleaning"
Output: {"actions":[{"type":"todo","title":"Pick up dry cleaning","priority":"medium"}],"unrecognized":null}

Input: "Don't forget Sarah's birthday gift - she wants a book"
Output: {"actions":[{"type":"todo","title":"Sarah's birthday gift","description":"she wants a book","priority":"medium"}],"unrecognized":null}

Parse the input now:`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text'
        ? response.content[0].text.trim()
        : '{"actions":[],"unrecognized":null}';

    // Clean up potential markdown code blocks
    const cleanedText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedText) as SmartInputParseResult;

    // Validate the structure
    if (!Array.isArray(parsed.actions)) {
      return { actions: [], unrecognized: input };
    }

    // Ensure all actions have valid structure
    const validActions = parsed.actions.filter((action) => {
      if (action.type === 'shopping') {
        return (
          action.name &&
          typeof action.name === 'string' &&
          (action.listType === 'grocery' || action.listType === 'other')
        );
      }
      if (action.type === 'calendar') {
        return action.text && typeof action.text === 'string';
      }
      if (action.type === 'todo') {
        return action.title && typeof action.title === 'string';
      }
      return false;
    });

    return {
      actions: validActions,
      unrecognized: parsed.unrecognized || null,
    };
  } catch (error) {
    console.error('Smart input parsing error:', error);
    return { actions: [], unrecognized: input };
  }
}

// =====================
// RECIPE AI FUNCTIONS
// =====================

export async function suggestRecipesFromIngredients(
  ingredients: string[]
): Promise<RecipeSuggestion[]> {
  const client = getClient();

  if (!client) {
    throw new Error('AI service not configured - missing ANTHROPIC_API_KEY');
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Based on these available ingredients, suggest 5 recipes that can be made:

Ingredients: ${ingredients.join(', ')}

For each recipe, provide:
- name: Recipe name
- description: Brief description (1-2 sentences)
- cuisine: Type of cuisine (American, Italian, Mexican, Asian, Indian, Mediterranean, French, Other)
- mealType: Breakfast, Lunch, Dinner, Snack, Dessert, or Appetizer
- estimatedTime: Total time to prepare (e.g., "30 minutes")
- matchedIngredients: Which of the provided ingredients are used
- missingIngredients: Any essential ingredients that would need to be purchased

Respond with ONLY valid JSON array, no markdown:
[{"name":"...","description":"...","cuisine":"...","mealType":"...","estimatedTime":"...","matchedIngredients":["..."],"missingIngredients":["..."]}]`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';
    const cleanedText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleanedText) as RecipeSuggestion[];
  } catch (error) {
    console.error('Recipe suggestion error:', error);
    return [];
  }
}

export async function suggestRecipesByPreference(
  preferences: RecipePreferences
): Promise<RecipeSuggestion[]> {
  const client = getClient();

  if (!client) {
    throw new Error('AI service not configured - missing ANTHROPIC_API_KEY');
  }

  const prefDescription = [];
  if (preferences.cuisine) prefDescription.push(`Cuisine: ${preferences.cuisine}`);
  if (preferences.mealType) prefDescription.push(`Meal type: ${preferences.mealType}`);
  if (preferences.dietary) prefDescription.push(`Dietary: ${preferences.dietary}`);
  if (preferences.maxTimeMinutes)
    prefDescription.push(`Max time: ${preferences.maxTimeMinutes} minutes`);
  if (preferences.difficulty) prefDescription.push(`Difficulty: ${preferences.difficulty}`);

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: `Suggest 5 recipes based on these preferences:

${prefDescription.length > 0 ? prefDescription.join('\n') : 'No specific preferences - suggest popular home cooking recipes'}

For each recipe, provide:
- name: Recipe name
- description: Brief description (1-2 sentences)
- cuisine: Type of cuisine
- mealType: Breakfast, Lunch, Dinner, Snack, Dessert, or Appetizer
- estimatedTime: Total time to prepare

Respond with ONLY valid JSON array, no markdown:
[{"name":"...","description":"...","cuisine":"...","mealType":"...","estimatedTime":"..."}]`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';
    const cleanedText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleanedText) as RecipeSuggestion[];
  } catch (error) {
    console.error('Recipe preference suggestion error:', error);
    return [];
  }
}

export interface GeneratedRecipe {
  name: string;
  instructions: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  cuisine?: string;
  mealType?: string;
  difficulty?: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    preparation?: string;
  }>;
}

// =====================
// RECIPE URL IMPORT
// =====================

export interface ImportedRecipe {
  name: string;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: string;
  mealType?: string;
  difficulty?: string;
  sourceUrl: string;
  imageUrl?: string;
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    preparation?: string;
  }>;
}

function parseISO8601Duration(duration: string): number {
  // Parse ISO 8601 duration format (e.g., PT30M, PT1H30M)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  return hours * 60 + minutes;
}

function extractSchemaRecipe(html: string): ImportedRecipe | null {
  // Try to find JSON-LD script with Recipe schema
  const jsonLdMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  if (!jsonLdMatch) return null;

  for (const match of jsonLdMatch) {
    try {
      const jsonContent = match.replace(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i,
        ''
      ).replace(/<\/script>/i, '').trim();

      const data = JSON.parse(jsonContent);

      // Handle @graph array or direct object
      const items = data['@graph'] || (Array.isArray(data) ? data : [data]);

      for (const item of items) {
        if (item['@type'] === 'Recipe' ||
            (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {

          // Parse ingredients
          const ingredients: ImportedRecipe['ingredients'] = [];
          const recipeIngredients = item.recipeIngredient || [];

          for (const ing of recipeIngredients) {
            if (typeof ing === 'string') {
              // Try to parse "2 cups flour" format
              const match = ing.match(/^([\d./\s]+)?\s*(\w+)?\s+(.+)$/);
              if (match) {
                const qty = match[1] ? parseFloat(match[1].replace(/\s/g, '')) : undefined;
                ingredients.push({
                  name: match[3] || ing,
                  quantity: isNaN(qty as number) ? undefined : qty,
                  unit: match[2] || undefined,
                });
              } else {
                ingredients.push({ name: ing });
              }
            }
          }

          // Parse instructions
          let instructions = '';
          const recipeInstructions = item.recipeInstructions || [];
          if (typeof recipeInstructions === 'string') {
            instructions = recipeInstructions;
          } else if (Array.isArray(recipeInstructions)) {
            instructions = recipeInstructions
              .map((step: any, i: number) => {
                if (typeof step === 'string') return `${i + 1}. ${step}`;
                if (step.text) return `${i + 1}. ${step.text}`;
                return '';
              })
              .filter(Boolean)
              .join('\n');
          }

          return {
            name: item.name || 'Imported Recipe',
            instructions: instructions || undefined,
            prepTimeMinutes: item.prepTime ? parseISO8601Duration(item.prepTime) : undefined,
            cookTimeMinutes: item.cookTime ? parseISO8601Duration(item.cookTime) : undefined,
            servings: item.recipeYield
              ? parseInt(String(item.recipeYield).match(/\d+/)?.[0] || '0') || undefined
              : undefined,
            cuisine: item.recipeCuisine || undefined,
            imageUrl: typeof item.image === 'string'
              ? item.image
              : item.image?.url || item.image?.[0]?.url || item.image?.[0] || undefined,
            sourceUrl: '',
            ingredients,
          };
        }
      }
    } catch (e) {
      // Continue to next script tag
    }
  }

  return null;
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  // Fetch the URL
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; HomeManagement/1.0; Recipe Importer)',
      'Accept': 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();

  // Try Schema.org extraction first
  const schemaRecipe = extractSchemaRecipe(html);
  if (schemaRecipe) {
    schemaRecipe.sourceUrl = url;
    return schemaRecipe;
  }

  // Fall back to AI parsing
  const client = getClient();
  if (!client) {
    throw new Error('No structured recipe data found and AI service not configured');
  }

  // Extract text content (simplified - remove script, style, and get text)
  const textContent = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000); // Limit for API

  try {
    const aiResponse = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2500,
      messages: [
        {
          role: 'user',
          content: `Extract recipe information from this webpage content. Parse it into a structured recipe format.

Webpage content:
${textContent}

Extract and respond with ONLY valid JSON (no markdown):
{
  "name": "Recipe name",
  "instructions": "Step by step instructions with numbered steps",
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "servings": 4,
  "cuisine": "Italian/American/Mexican/Asian/etc or null",
  "difficulty": "Easy/Medium/Hard or null",
  "ingredients": [
    {"name": "ingredient name", "quantity": 2, "unit": "cups", "preparation": "diced"}
  ]
}

If you cannot find recipe information, respond with: {"error": "No recipe found"}`,
        },
      ],
    });

    const text =
      aiResponse.content[0].type === 'text' ? aiResponse.content[0].text.trim() : '{}';
    const cleanedText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedText);

    if (parsed.error) {
      throw new Error(parsed.error);
    }

    return {
      ...parsed,
      sourceUrl: url,
    };
  } catch (error) {
    console.error('AI recipe parsing error:', error);
    throw new Error('Could not extract recipe from this URL');
  }
}

export async function generateFullRecipe(
  suggestion: RecipeSuggestion
): Promise<GeneratedRecipe | null> {
  const client = getClient();

  if (!client) {
    throw new Error('AI service not configured - missing ANTHROPIC_API_KEY');
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Generate a complete recipe for: ${suggestion.name}
Description: ${suggestion.description}
Cuisine: ${suggestion.cuisine || 'Any'}

Provide the full recipe with:
- name: Recipe name
- instructions: Step-by-step cooking instructions (numbered steps, use \\n for newlines)
- prepTimeMinutes: Preparation time in minutes (number)
- cookTimeMinutes: Cooking time in minutes (number)
- servings: Number of servings (number)
- cuisine: Type of cuisine
- mealType: Breakfast, Lunch, Dinner, Snack, Dessert, or Appetizer
- difficulty: Easy, Medium, or Hard
- ingredients: Array of ingredients with name, quantity (number), unit, and optional preparation

Respond with ONLY valid JSON, no markdown:
{"name":"...","instructions":"1. Step one\\n2. Step two...","prepTimeMinutes":15,"cookTimeMinutes":30,"servings":4,"cuisine":"Italian","mealType":"Dinner","difficulty":"Easy","ingredients":[{"name":"chicken breast","quantity":2,"unit":"lbs","preparation":"diced"}]}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const cleanedText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleanedText) as GeneratedRecipe;
  } catch (error) {
    console.error('Generate full recipe error:', error);
    return null;
  }
}

// =====================
// ADHD-FRIENDLY TODO AI FUNCTIONS
// =====================

export interface TaskBreakdown {
  subtasks: Array<{
    title: string;
    estimated_minutes: number;
    energy_level: 'low' | 'medium' | 'high';
    order: number;
  }>;
}

export interface TodoNudge {
  todoId: number;
  todoTitle: string;
  message: string;
  reason: string;
}

// Break down a large task into smaller, manageable steps (ADHD-friendly)
export async function breakdownTask(
  taskTitle: string,
  taskDescription?: string
): Promise<TaskBreakdown> {
  const client = getClient();

  if (!client) {
    throw new Error('AI service not configured - missing ANTHROPIC_API_KEY');
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `You are helping someone with ADHD break down a task into smaller, manageable steps. Each step should be:
- Small enough to complete in one sitting (5-30 minutes ideally)
- Concrete and actionable (start with a verb)
- Clear about what "done" looks like

Task: "${taskTitle}"
${taskDescription ? `Details: ${taskDescription}` : ''}

Break this into 3-7 subtasks. For each, estimate time in minutes and energy level needed (low = can do when tired, high = needs focus).

Respond with ONLY valid JSON, no markdown:
{"subtasks":[{"title":"First small step","estimated_minutes":10,"energy_level":"low","order":1}]}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const cleanedText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    return JSON.parse(cleanedText) as TaskBreakdown;
  } catch (error) {
    console.error('Task breakdown error:', error);
    return { subtasks: [] };
  }
}

// Generate a gentle, ADHD-friendly nudge for a task
export async function generateNudge(
  todo: { id: number; title: string; priority: string; estimated_minutes?: number | null },
  context: {
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    currentEnergyMatch: boolean;
    hasUpcomingEvent: boolean;
    minutesUntilEvent?: number;
  }
): Promise<TodoNudge> {
  const client = getClient();

  if (!client) {
    // Fallback nudges when AI isn't available
    const fallbackMessages = [
      `Hey, how about tackling "${todo.title}"?`,
      `Got a moment? "${todo.title}" is waiting for you.`,
      `Quick win opportunity: "${todo.title}"`,
      `Feeling ready? "${todo.title}" could use some attention.`,
    ];
    return {
      todoId: todo.id,
      todoTitle: todo.title,
      message: fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)],
      reason: 'general reminder',
    };
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Generate a gentle, encouraging reminder for someone with ADHD about this task. Be warm, not pushy. Acknowledge that starting is hard. Keep it brief (1-2 sentences max).

Task: "${todo.title}"
Priority: ${todo.priority}
Estimated time: ${todo.estimated_minutes ? `${todo.estimated_minutes} minutes` : 'unknown'}
Time of day: ${context.timeOfDay}
Energy level matches task: ${context.currentEnergyMatch ? 'yes' : 'no'}
${context.hasUpcomingEvent ? `Has ${context.minutesUntilEvent} minutes before next event` : 'No upcoming events'}

Respond with ONLY valid JSON:
{"message":"Your gentle reminder here","reason":"why now is good"}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const cleanedText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedText);
    return {
      todoId: todo.id,
      todoTitle: todo.title,
      message: parsed.message || `Time to work on "${todo.title}"?`,
      reason: parsed.reason || 'general reminder',
    };
  } catch (error) {
    console.error('Generate nudge error:', error);
    return {
      todoId: todo.id,
      todoTitle: todo.title,
      message: `Hey, how about "${todo.title}"?`,
      reason: 'general reminder',
    };
  }
}

// Suggest the best task to do right now based on context
export async function suggestNextTask(
  todos: Array<{
    id: number;
    title: string;
    priority: string;
    energy_level: string;
    estimated_minutes?: number | null;
    due_date?: string | null;
    context: string;
  }>,
  userContext: {
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    availableMinutes?: number;
    currentLocation?: string;
  }
): Promise<{ todoId: number; reason: string } | null> {
  if (todos.length === 0) return null;

  const client = getClient();

  if (!client) {
    // Simple fallback: return highest priority task
    return {
      todoId: todos[0].id,
      reason: 'Highest priority task',
    };
  }

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Help someone with ADHD pick the best task to do right now. Consider:
- Time of day affects energy (morning = high energy, evening = low energy usually)
- Match task energy level to available energy
- Urgent/high priority tasks should be weighted more
- If limited time, suggest shorter tasks
- Location/context matters (can't do "errands" if at "home")

Current context:
- Time: ${userContext.timeOfDay}
- Available time: ${userContext.availableMinutes ? `${userContext.availableMinutes} minutes` : 'flexible'}
- Location: ${userContext.currentLocation || 'home'}

Tasks:
${todos.map((t, i) => `${i + 1}. "${t.title}" - Priority: ${t.priority}, Energy: ${t.energy_level}, Time: ${t.estimated_minutes || '?'}min, Context: ${t.context}${t.due_date ? `, Due: ${t.due_date}` : ''}`).join('\n')}

Pick ONE task. Respond with ONLY valid JSON:
{"taskNumber":1,"reason":"Brief explanation"}`,
        },
      ],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const cleanedText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanedText);
    const taskIndex = (parsed.taskNumber || 1) - 1;

    if (taskIndex >= 0 && taskIndex < todos.length) {
      return {
        todoId: todos[taskIndex].id,
        reason: parsed.reason || 'Good fit for right now',
      };
    }

    return { todoId: todos[0].id, reason: 'Top priority' };
  } catch (error) {
    console.error('Suggest next task error:', error);
    return { todoId: todos[0].id, reason: 'Top priority' };
  }
}
