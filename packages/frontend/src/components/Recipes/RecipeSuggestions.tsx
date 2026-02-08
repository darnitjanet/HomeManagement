import { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Trash2, ChefHat, Loader2, Package } from 'lucide-react';
import { recipesApi, pantryApi } from '../../services/api';
import { RecipeForm } from './RecipeForm';
import './RecipeSuggestions.css';

interface RecipeTag {
  id: number;
  name: string;
  color: string;
  priority: number;
}

interface RecipeSuggestion {
  name: string;
  description: string;
  estimatedTime?: number;
  difficulty?: string;
  cuisine?: string;
}

interface GeneratedRecipe {
  name: string;
  instructions: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  cuisine: string;
  mealType: string;
  difficulty: string;
  dietary?: string;
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit?: string;
    preparation?: string;
    optional?: boolean;
    sortOrder?: number;
  }>;
}

interface RecipeSuggestionsProps {
  onClose: () => void;
  onRecipeCreated: () => void;
}

const CUISINES = ['American', 'Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'French'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb'];

export function RecipeSuggestions({ onClose, onRecipeCreated }: RecipeSuggestionsProps) {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'preferences'>('ingredients');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<RecipeSuggestion[]>([]);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null);
  const [tags, setTags] = useState<RecipeTag[]>([]);

  // Ingredients mode state
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [loadingPantry, setLoadingPantry] = useState(false);

  // Preferences mode state
  const [prefCuisine, setPrefCuisine] = useState('');
  const [prefMealType, setPrefMealType] = useState('');
  const [prefDifficulty, setPrefDifficulty] = useState('');
  const [prefDietary, setPrefDietary] = useState('');
  const [prefMaxTime, setPrefMaxTime] = useState<number | ''>('');

  useEffect(() => {
    checkAIStatus();
    loadTags();
  }, []);

  const checkAIStatus = async () => {
    try {
      const response = await recipesApi.getAIStatus();
      setAiEnabled(response.data.data.aiEnabled);
    } catch {
      setAiEnabled(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await recipesApi.getAllTags();
      if (response.data.success) {
        setTags(response.data.data);
      }
    } catch {
      // Ignore tag load errors
    }
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const handleUpdateIngredient = (index: number, value: string) => {
    const updated = [...ingredients];
    updated[index] = value;
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const handleLoadPantryItems = async () => {
    setLoadingPantry(true);
    setError('');
    try {
      const response = await pantryApi.getIngredients();
      if (response.data.success && response.data.data.length > 0) {
        setIngredients(response.data.data);
      } else {
        setError('Your pantry is empty. Add items to your pantry first!');
      }
    } catch (err) {
      setError('Failed to load pantry items');
    } finally {
      setLoadingPantry(false);
    }
  };

  const handleSuggestFromIngredients = async () => {
    const validIngredients = ingredients.filter((i) => i.trim());
    if (validIngredients.length === 0) {
      setError('Please enter at least one ingredient');
      return;
    }

    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      console.log('[RecipeSuggestions] Requesting from ingredients:', validIngredients);
      const response = await recipesApi.suggestFromIngredients(validIngredients);
      console.log('[RecipeSuggestions] Response:', response.data);
      if (response.data.success) {
        setSuggestions(response.data.data);
        if (response.data.data.length === 0) {
          setError('No recipes found for these ingredients. Try adding more.');
        }
      } else {
        setError(response.data.error || 'Failed to get suggestions');
      }
    } catch (err: any) {
      console.error('[RecipeSuggestions] Error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to get suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestByPreference = async () => {
    setLoading(true);
    setError('');
    setSuggestions([]);

    try {
      const preferences: any = {};
      if (prefCuisine) preferences.cuisine = prefCuisine;
      if (prefMealType) preferences.mealType = prefMealType;
      if (prefDifficulty) preferences.difficulty = prefDifficulty;
      if (prefDietary) preferences.dietary = prefDietary;
      if (prefMaxTime) preferences.maxTimeMinutes = prefMaxTime;

      console.log('[RecipeSuggestions] Requesting by preference:', preferences);
      const response = await recipesApi.suggestByPreference(preferences);
      console.log('[RecipeSuggestions] Response:', response.data);
      if (response.data.success) {
        setSuggestions(response.data.data);
        if (response.data.data.length === 0) {
          setError('No recipes found. Try different preferences.');
        }
      } else {
        setError(response.data.error || 'Failed to get suggestions');
      }
    } catch (err: any) {
      console.error('[RecipeSuggestions] Error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to get suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecipe = async (suggestion: RecipeSuggestion) => {
    setGenerating(true);
    setError('');

    try {
      const response = await recipesApi.generateFromSuggestion({
        name: suggestion.name,
        description: suggestion.description,
        cuisine: suggestion.cuisine,
      });

      if (response.data.success) {
        setGeneratedRecipe(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate recipe');
    } finally {
      setGenerating(false);
    }
  };

  if (!aiEnabled) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="suggestions-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>
              <Sparkles size={20} /> AI Recipe Suggestions
            </h2>
            <button className="close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>
          <div className="ai-disabled">
            <ChefHat size={48} />
            <h3>AI Features Unavailable</h3>
            <p>AI recipe suggestions require an OpenAI API key to be configured.</p>
            <p>Add ANTHROPIC_API_KEY to your .env file to enable this feature.</p>
          </div>
        </div>
      </div>
    );
  }

  if (generatedRecipe) {
    return (
      <RecipeForm
        onClose={() => {
          setGeneratedRecipe(null);
          onClose();
        }}
        onSave={() => {
          setGeneratedRecipe(null);
          onRecipeCreated();
        }}
        tags={tags}
        initialData={generatedRecipe}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="suggestions-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Sparkles size={20} /> AI Recipe Suggestions
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'ingredients' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingredients')}
          >
            From Ingredients
          </button>
          <button
            className={`tab ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            By Preferences
          </button>
        </div>

        <div className="suggestions-content">
          {error && <div className="error-message">{error}</div>}

          {activeTab === 'ingredients' && (
            <div className="ingredients-mode">
              <p className="mode-description">
                Enter the ingredients you have on hand, and AI will suggest recipes you can make.
              </p>

              <button
                className="use-pantry-btn"
                onClick={handleLoadPantryItems}
                disabled={loadingPantry}
              >
                {loadingPantry ? (
                  <>
                    <Loader2 size={18} className="spinner" /> Loading...
                  </>
                ) : (
                  <>
                    <Package size={18} /> Use Pantry Items
                  </>
                )}
              </button>

              <div className="ingredients-input">
                {ingredients.map((ing, index) => (
                  <div key={index} className="ingredient-input-row">
                    <input
                      type="text"
                      value={ing}
                      onChange={(e) => handleUpdateIngredient(index, e.target.value)}
                      placeholder={`Ingredient ${index + 1}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIngredient();
                        }
                      }}
                    />
                    {ingredients.length > 1 && (
                      <button className="remove-btn" onClick={() => handleRemoveIngredient(index)}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button className="add-ingredient-btn" onClick={handleAddIngredient}>
                  <Plus size={16} /> Add Ingredient
                </button>
              </div>

              <button
                className="suggest-btn"
                onClick={handleSuggestFromIngredients}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" /> Getting Suggestions...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Get Recipe Ideas
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="preferences-mode">
              <p className="mode-description">
                Tell us what you're in the mood for, and AI will suggest perfect recipes.
              </p>

              <div className="preferences-form">
                <div className="pref-row">
                  <div className="pref-group">
                    <label>Cuisine</label>
                    <select value={prefCuisine} onChange={(e) => setPrefCuisine(e.target.value)}>
                      <option value="">Any cuisine</option>
                      {CUISINES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pref-group">
                    <label>Meal Type</label>
                    <select value={prefMealType} onChange={(e) => setPrefMealType(e.target.value)}>
                      <option value="">Any meal</option>
                      {MEAL_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pref-row">
                  <div className="pref-group">
                    <label>Difficulty</label>
                    <select value={prefDifficulty} onChange={(e) => setPrefDifficulty(e.target.value)}>
                      <option value="">Any difficulty</option>
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pref-group">
                    <label>Max Time (min)</label>
                    <input
                      type="number"
                      min="0"
                      value={prefMaxTime}
                      onChange={(e) =>
                        setPrefMaxTime(e.target.value ? parseInt(e.target.value) : '')
                      }
                      placeholder="Any"
                    />
                  </div>
                </div>

                <div className="pref-group">
                  <label>Dietary Preference</label>
                  <select value={prefDietary} onChange={(e) => setPrefDietary(e.target.value)}>
                    <option value="">None</option>
                    {DIETARY_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                className="suggest-btn"
                onClick={handleSuggestByPreference}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="spinner" /> Getting Suggestions...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Get Recipe Ideas
                  </>
                )}
              </button>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="suggestions-results">
              <h3>Recipe Ideas</h3>
              <div className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="suggestion-card">
                    <div className="suggestion-info">
                      <h4>{suggestion.name}</h4>
                      <p>{suggestion.description}</p>
                      <div className="suggestion-meta">
                        {suggestion.estimatedTime && (
                          <span className="meta-tag">{suggestion.estimatedTime} min</span>
                        )}
                        {suggestion.difficulty && (
                          <span className="meta-tag">{suggestion.difficulty}</span>
                        )}
                        {suggestion.cuisine && (
                          <span className="meta-tag">{suggestion.cuisine}</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="generate-btn"
                      onClick={() => handleGenerateRecipe(suggestion)}
                      disabled={generating}
                    >
                      {generating ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <>
                          <ChefHat size={16} /> Create Recipe
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
