import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { recipesApi } from '../../services/api';
import './RecipeForm.css';

// Helper to parse fractions like "1/4", "1 1/2", "2/3" to decimal
function parseFraction(str: string): number | undefined {
  if (!str || str.trim() === '') return undefined;

  const trimmed = str.trim();

  // Try parsing as plain number first
  const asNumber = parseFloat(trimmed);
  if (!isNaN(asNumber) && !trimmed.includes('/')) {
    return asNumber;
  }

  // Handle mixed numbers like "1 1/2" or "2 3/4"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const num = parseInt(mixedMatch[2]);
    const denom = parseInt(mixedMatch[3]);
    if (denom !== 0) {
      return whole + num / denom;
    }
  }

  // Handle simple fractions like "1/4" or "3/4"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1]);
    const denom = parseInt(fractionMatch[2]);
    if (denom !== 0) {
      return num / denom;
    }
  }

  // If it's a number with fraction (like "1/4" parsed as NaN), return undefined
  return isNaN(asNumber) ? undefined : asNumber;
}

// Helper to convert decimal to fraction string for display
function decimalToFraction(decimal: number | undefined): string {
  if (decimal === undefined || decimal === null) return '';

  // Common fractions to check
  const fractions: [number, string][] = [
    [0.125, '1/8'],
    [0.25, '1/4'],
    [0.333, '1/3'],
    [0.375, '3/8'],
    [0.5, '1/2'],
    [0.625, '5/8'],
    [0.667, '2/3'],
    [0.75, '3/4'],
    [0.875, '7/8'],
  ];

  const whole = Math.floor(decimal);
  const frac = decimal - whole;

  // Check if it's close to a common fraction
  for (const [value, str] of fractions) {
    if (Math.abs(frac - value) < 0.01) {
      if (whole === 0) {
        return str;
      }
      return `${whole} ${str}`;
    }
  }

  // If it's a whole number
  if (Math.abs(frac) < 0.01) {
    return whole.toString();
  }

  // Otherwise return the decimal
  return decimal.toString();
}

interface RecipeIngredient {
  id?: number;
  name: string;
  quantity?: number;
  quantityDisplay?: string; // For displaying/editing fractions
  unit?: string;
  preparation?: string;
  optional?: boolean;
  sortOrder?: number;
}

interface RecipeTag {
  id: number;
  name: string;
  color: string;
  priority: number;
}

interface Recipe {
  id: number;
  name: string;
  instructions?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  cuisine?: string;
  mealType?: string;
  difficulty?: string;
  dietary?: string;
  notes?: string;
  imageUrl?: string;
  sourceUrl?: string;
  isFavorite: boolean;
  ingredients?: RecipeIngredient[];
  tags?: RecipeTag[];
}

interface RecipeFormProps {
  onClose: () => void;
  onSave: () => void;
  recipe?: Recipe | null;
  tags: RecipeTag[];
  initialData?: Partial<Recipe>;
}

const CUISINES = ['American', 'Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'French', 'Other'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DIETARY_OPTIONS = ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb'];
const UNITS = ['', 'tsp', 'tbsp', 'cup', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'piece', 'slice', 'clove', 'can', 'package'];

export function RecipeForm({ onClose, onSave, recipe, tags, initialData }: RecipeFormProps) {
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | ''>('');
  const [cookTimeMinutes, setCookTimeMinutes] = useState<number | ''>('');
  const [servings, setServings] = useState<number | ''>('');
  const [cuisine, setCuisine] = useState('');
  const [mealType, setMealType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [dietary, setDietary] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (recipe) {
      setName(recipe.name);
      setInstructions(recipe.instructions || '');
      setPrepTimeMinutes(recipe.prepTimeMinutes || '');
      setCookTimeMinutes(recipe.cookTimeMinutes || '');
      setServings(recipe.servings || '');
      setCuisine(recipe.cuisine || '');
      setMealType(recipe.mealType || '');
      setDifficulty(recipe.difficulty || '');
      setDietary(recipe.dietary || '');
      setNotes(recipe.notes || '');
      setImageUrl(recipe.imageUrl || '');
      setSourceUrl(recipe.sourceUrl || '');
      setIngredients((recipe.ingredients || []).map(ing => ({
        ...ing,
        quantityDisplay: decimalToFraction(ing.quantity),
      })));
      setSelectedTags(recipe.tags?.map((t) => t.id) || []);
    } else if (initialData) {
      // For AI-generated recipes
      setName(initialData.name || '');
      setInstructions(initialData.instructions || '');
      setPrepTimeMinutes(initialData.prepTimeMinutes || '');
      setCookTimeMinutes(initialData.cookTimeMinutes || '');
      setServings(initialData.servings || '');
      setCuisine(initialData.cuisine || '');
      setMealType(initialData.mealType || '');
      setDifficulty(initialData.difficulty || '');
      setDietary(initialData.dietary || '');
      setNotes(initialData.notes || '');
      if (initialData.ingredients) {
        setIngredients(
          initialData.ingredients.map((ing, idx) => ({
            ...ing,
            quantityDisplay: decimalToFraction(ing.quantity),
            optional: ing.optional || false,
            sortOrder: idx,
          }))
        );
      }
    }
  }, [recipe, initialData]);

  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        name: '',
        quantityDisplay: '',
        unit: '',
        preparation: '',
        optional: false,
        sortOrder: ingredients.length,
      },
    ]);
  };

  const handleUpdateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleToggleTag = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Recipe name is required');
      return;
    }

    setSaving(true);

    try {
      const recipeData = {
        name: name.trim(),
        instructions: instructions.trim() || undefined,
        prepTimeMinutes: prepTimeMinutes || undefined,
        cookTimeMinutes: cookTimeMinutes || undefined,
        servings: servings || undefined,
        cuisine: cuisine || undefined,
        mealType: mealType || undefined,
        difficulty: difficulty || undefined,
        dietary: dietary || undefined,
        notes: notes.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        ingredients: ingredients
          .filter((ing) => ing.name.trim())
          .map((ing, idx) => ({
            name: ing.name.trim(),
            quantity: parseFraction(ing.quantityDisplay || ''),
            unit: ing.unit || undefined,
            preparation: ing.preparation || undefined,
            optional: ing.optional,
            sortOrder: idx,
          })),
        tags: selectedTags,
      };

      if (recipe) {
        await recipesApi.updateRecipe(recipe.id, recipeData);
      } else {
        await recipesApi.createRecipe(recipeData);
      }

      onSave();
    } catch (error: any) {
      console.error('Save recipe error:', error);
      setError(error.response?.data?.message || 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recipe-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{recipe ? 'Edit Recipe' : 'Add Recipe'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-content">
            {error && <div className="form-error">{error}</div>}

            <div className="form-section">
              <h3>Basic Info</h3>

              <div className="form-group">
                <label htmlFor="name">Recipe Name *</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter recipe name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="cuisine">Cuisine</label>
                  <select id="cuisine" value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                    <option value="">Select cuisine</option>
                    {CUISINES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="mealType">Meal Type</label>
                  <select id="mealType" value={mealType} onChange={(e) => setMealType(e.target.value)}>
                    <option value="">Select type</option>
                    {MEAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="difficulty">Difficulty</label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                  >
                    <option value="">Select difficulty</option>
                    {DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="prepTime">Prep Time (min)</label>
                  <input
                    id="prepTime"
                    type="number"
                    min="0"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cookTime">Cook Time (min)</label>
                  <input
                    id="cookTime"
                    type="number"
                    min="0"
                    value={cookTimeMinutes}
                    onChange={(e) => setCookTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="servings">Servings</label>
                  <input
                    id="servings"
                    type="number"
                    min="1"
                    value={servings}
                    onChange={(e) => setServings(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="4"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="dietary">Dietary</label>
                <select id="dietary" value={dietary} onChange={(e) => setDietary(e.target.value)}>
                  <option value="">None</option>
                  {DIETARY_OPTIONS.filter((d) => d !== 'None').map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-section">
              <div className="section-header">
                <h3>Ingredients</h3>
                <button type="button" className="add-btn" onClick={handleAddIngredient}>
                  <Plus size={16} /> Add Ingredient
                </button>
              </div>

              <div className="ingredients-list">
                {ingredients.map((ing, index) => (
                  <div key={index} className="ingredient-row">
                    <GripVertical size={16} className="drag-handle" />
                    <input
                      type="text"
                      className="quantity-input"
                      placeholder="Qty"
                      value={ing.quantityDisplay || ''}
                      onChange={(e) =>
                        handleUpdateIngredient(index, 'quantityDisplay', e.target.value)
                      }
                    />
                    <select
                      className="unit-select"
                      value={ing.unit || ''}
                      onChange={(e) => handleUpdateIngredient(index, 'unit', e.target.value)}
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u || '-'}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="name-input"
                      placeholder="Ingredient name"
                      value={ing.name}
                      onChange={(e) => handleUpdateIngredient(index, 'name', e.target.value)}
                    />
                    <input
                      type="text"
                      className="prep-input"
                      placeholder="Prep (e.g., diced)"
                      value={ing.preparation || ''}
                      onChange={(e) => handleUpdateIngredient(index, 'preparation', e.target.value)}
                    />
                    <label className="optional-check">
                      <input
                        type="checkbox"
                        checked={ing.optional}
                        onChange={(e) => handleUpdateIngredient(index, 'optional', e.target.checked)}
                      />
                      Optional
                    </label>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => handleRemoveIngredient(index)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {ingredients.length === 0 && (
                  <p className="no-ingredients">No ingredients added yet.</p>
                )}
              </div>
            </div>

            <div className="form-section">
              <h3>Instructions</h3>
              <div className="form-group">
                <textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Enter cooking instructions..."
                  rows={8}
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Additional Info</h3>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sourceUrl">Source URL</label>
                  <input
                    id="sourceUrl"
                    type="url"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="imageUrl">Image URL</label>
                  <input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="form-section">
                <h3>Tags</h3>
                <div className="tags-select">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`tag-option ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                      style={{
                        backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                        borderColor: tag.color,
                        color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                      }}
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : recipe ? 'Update Recipe' : 'Save Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
