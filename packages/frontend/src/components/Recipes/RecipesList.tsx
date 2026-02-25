import { useState, useEffect } from 'react';
import { Trash2, Clock, Users, Heart, ShoppingCart, Sparkles, Link, CalendarDays, X, Check, Package } from 'lucide-react';
import { recipesApi, pantryApi } from '../../services/api';
import { decimalToFraction } from '../../utils/fractions';
import { RecipeForm } from './RecipeForm';
import { RecipeDetail } from './RecipeDetail';
import { RecipeSuggestions } from './RecipeSuggestions';
import { RecipeImport } from './RecipeImport';
import { MealPlanner } from './MealPlanner';
import { MicButton } from '../common/MicButton';
import './RecipesList.css';

interface RecipeIngredient {
  id: number;
  recipeId: number;
  name: string;
  quantity?: number;
  unit?: string;
  preparation?: string;
  optional: boolean;
  sortOrder: number;
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
  createdAt: string;
  updatedAt: string;
  ingredients?: RecipeIngredient[];
  tags?: RecipeTag[];
}

const CUISINES = ['American', 'Italian', 'Mexican', 'Asian', 'Indian', 'Mediterranean', 'French', 'Other'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Appetizer'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export function RecipesList() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showMealPlanner, setShowMealPlanner] = useState(false);

  // Shopping list ingredient selection
  const [showIngredientSelect, setShowIngredientSelect] = useState(false);
  const [ingredientSelectRecipe, setIngredientSelectRecipe] = useState<Recipe | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [addingToShopping, setAddingToShopping] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  useEffect(() => {
    loadRecipes();
    loadTags();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await recipesApi.getAllRecipes();
      if (response.data.success) {
        setRecipes(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await recipesApi.getAllTags();
      if (response.data.success) {
        setTags(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      loadRecipes();
      return;
    }

    setLoading(true);
    try {
      const response = await recipesApi.searchRecipes(query);
      if (response.data.success) {
        setRecipes(response.data.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    const filters: any = {};
    if (selectedCuisine) filters.cuisine = selectedCuisine;
    if (selectedMealType) filters.mealType = selectedMealType;
    if (selectedDifficulty) filters.difficulty = selectedDifficulty;
    if (showFavoritesOnly) filters.isFavorite = true;

    setLoading(true);
    try {
      const response = await recipesApi.filterRecipes(filters);
      if (response.data.success) {
        setRecipes(response.data.data);
      }
    } catch (error) {
      console.error('Filter failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCuisine('');
    setSelectedMealType('');
    setSelectedDifficulty('');
    setShowFavoritesOnly(false);
    loadRecipes();
  };

  const handleDeleteRecipe = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
      await recipesApi.deleteRecipe(id);
      loadRecipes();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleToggleFavorite = async (id: number) => {
    try {
      await recipesApi.toggleFavorite(id);
      loadRecipes();
    } catch (error) {
      console.error('Toggle favorite failed:', error);
    }
  };

  const handleAddToShopping = async (recipeId: number) => {
    // Find the recipe
    const recipe = recipes.find(r => r.id === recipeId) || selectedRecipe;
    if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
      alert('No ingredients to add');
      return;
    }

    // Fetch pantry items to compare
    try {
      const pantryRes = await pantryApi.getIngredients();
      if (pantryRes.data.success) {
        setPantryItems(pantryRes.data.data.map((p: string) => p.toLowerCase()));
      }
    } catch (err) {
      console.error('Failed to fetch pantry items:', err);
      setPantryItems([]);
    }

    // Pre-select ingredients NOT in pantry
    const notInPantry = new Set<number>();
    recipe.ingredients.forEach(ing => {
      const ingName = ing.name.toLowerCase();
      const inPantry = pantryItems.some(p =>
        p.includes(ingName) || ingName.includes(p)
      );
      if (!inPantry) {
        notInPantry.add(ing.id);
      }
    });

    setSelectedIngredients(notInPantry);
    setIngredientSelectRecipe(recipe);
    setShowIngredientSelect(true);
  };

  const handleConfirmAddToShopping = async () => {
    if (!ingredientSelectRecipe || selectedIngredients.size === 0) return;

    setAddingToShopping(true);
    try {
      const response = await recipesApi.addToShopping(ingredientSelectRecipe.id, {
        ingredientIds: Array.from(selectedIngredients)
      });
      if (response.data.success) {
        alert(`Added ${response.data.data.addedItems.length} items to shopping list!`);
        setShowIngredientSelect(false);
        setIngredientSelectRecipe(null);
      }
    } catch (error) {
      console.error('Add to shopping failed:', error);
      alert('Failed to add items to shopping list');
    } finally {
      setAddingToShopping(false);
    }
  };

  const toggleIngredient = (id: number) => {
    const newSet = new Set(selectedIngredients);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIngredients(newSet);
  };

  const isInPantry = (ingredientName: string): boolean => {
    const ingName = ingredientName.toLowerCase();
    return pantryItems.some(p => p.includes(ingName) || ingName.includes(p));
  };

  const formatTime = (prepMinutes?: number, cookMinutes?: number): string => {
    const total = (prepMinutes || 0) + (cookMinutes || 0);
    if (total === 0) return '-';
    if (total < 60) return `${total} min`;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  useEffect(() => {
    if (selectedCuisine || selectedMealType || selectedDifficulty || showFavoritesOnly) {
      handleFilter();
    }
  }, [selectedCuisine, selectedMealType, selectedDifficulty, showFavoritesOnly]);

  if (loading && recipes.length === 0) {
    return (
      <div className="recipes-loading">
        <div className="loading-spinner"></div>
        <p>Loading recipes...</p>
      </div>
    );
  }

  return (
    <div className="recipes-page">
      <div className="recipes-banner">
        <img src="/Recipes.png" alt="Recipes" />
      </div>

      <div className="recipes-header">
        <h1>Recipes</h1>
        <div className="header-actions">
          <button className="primary" onClick={() => setShowAddForm(true)}>
            + Add Recipe
          </button>
          <button className="secondary meal-planner-btn" onClick={() => setShowMealPlanner(true)}>
            <CalendarDays size={18} />
            Meal Plan
          </button>
          <button className="secondary import-btn" onClick={() => setShowImport(true)}>
            <Link size={18} />
            Import URL
          </button>
          <button className="secondary ai-btn" onClick={() => setShowSuggestions(true)}>
            <Sparkles size={18} />
            AI Suggestions
          </button>
        </div>
      </div>

      <div className="recipes-filters">
        <div className="input-with-mic">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
          <MicButton onResult={(text) => handleSearch(text)} />
        </div>

        <select value={selectedCuisine} onChange={(e) => setSelectedCuisine(e.target.value)}>
          <option value="">All Cuisines</option>
          {CUISINES.map((cuisine) => (
            <option key={cuisine} value={cuisine}>
              {cuisine}
            </option>
          ))}
        </select>

        <select value={selectedMealType} onChange={(e) => setSelectedMealType(e.target.value)}>
          <option value="">All Meal Types</option>
          {MEAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value)}>
          <option value="">All Difficulties</option>
          {DIFFICULTIES.map((diff) => (
            <option key={diff} value={diff}>
              {diff}
            </option>
          ))}
        </select>

        <label className="favorites-filter">
          <input
            type="checkbox"
            checked={showFavoritesOnly}
            onChange={(e) => setShowFavoritesOnly(e.target.checked)}
          />
          Favorites Only
        </label>

        <button onClick={handleClearFilters} className="clear-filters">
          Clear Filters
        </button>
      </div>

      <div className="results-count">{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</div>

      {error && <div className="error-message">{error}</div>}

      <div className="recipes-grid">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="recipe-card" onClick={() => setSelectedRecipe(recipe)}>
            <div className="recipe-card-header">
              <h3 className="recipe-name">{recipe.name}</h3>
              <div className="recipe-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleToggleFavorite(recipe.id)}
                  className={`icon-btn favorite-btn ${recipe.isFavorite ? 'active' : ''}`}
                  title={recipe.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart size={18} fill={recipe.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => handleAddToShopping(recipe.id)}
                  className="icon-btn shopping-btn"
                  title="Add ingredients to shopping list"
                >
                  <ShoppingCart size={18} />
                </button>
                <button
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  className="icon-btn delete-btn"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="recipe-badges">
              {recipe.cuisine && <span className="badge cuisine-badge">{recipe.cuisine}</span>}
              {recipe.mealType && <span className="badge meal-badge">{recipe.mealType}</span>}
              {recipe.difficulty && (
                <span className={`badge difficulty-badge ${recipe.difficulty.toLowerCase()}`}>
                  {recipe.difficulty}
                </span>
              )}
            </div>

            <div className="recipe-meta">
              <div className="meta-item">
                <Clock size={16} />
                <span>{formatTime(recipe.prepTimeMinutes, recipe.cookTimeMinutes)}</span>
              </div>
              {recipe.servings && (
                <div className="meta-item">
                  <Users size={16} />
                  <span>{recipe.servings} servings</span>
                </div>
              )}
            </div>

            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="recipe-ingredients-preview">
                {recipe.ingredients.slice(0, 3).map((ing) => ing.name).join(', ')}
                {recipe.ingredients.length > 3 && ` +${recipe.ingredients.length - 3} more`}
              </div>
            )}

            {recipe.tags && recipe.tags.length > 0 && (
              <div className="recipe-tags">
                {recipe.tags.map((tag) => (
                  <span key={tag.id} className="tag-badge" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {recipes.length === 0 && !loading && (
        <div className="no-recipes">
          <p>No recipes found. Add your first recipe or try AI suggestions!</p>
        </div>
      )}

      {showAddForm && (
        <RecipeForm
          onClose={() => {
            setShowAddForm(false);
            setEditingRecipe(null);
          }}
          onSave={() => {
            setShowAddForm(false);
            setEditingRecipe(null);
            loadRecipes();
          }}
          recipe={editingRecipe}
          tags={tags}
        />
      )}

      {selectedRecipe && (
        <RecipeDetail
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onEdit={() => {
            setEditingRecipe(selectedRecipe);
            setSelectedRecipe(null);
            setShowAddForm(true);
          }}
          onAddToShopping={() => handleAddToShopping(selectedRecipe.id)}
          onDelete={() => {
            handleDeleteRecipe(selectedRecipe.id);
            setSelectedRecipe(null);
          }}
        />
      )}

      {showSuggestions && (
        <RecipeSuggestions
          onClose={() => setShowSuggestions(false)}
          onRecipeCreated={() => {
            setShowSuggestions(false);
            loadRecipes();
          }}
        />
      )}

      {showImport && (
        <RecipeImport
          onClose={() => setShowImport(false)}
          onRecipeCreated={() => {
            setShowImport(false);
            loadRecipes();
          }}
          tags={tags}
        />
      )}

      {showMealPlanner && (
        <MealPlanner onClose={() => setShowMealPlanner(false)} />
      )}

      {/* Ingredient Selection Modal */}
      {showIngredientSelect && ingredientSelectRecipe && (
        <div className="modal-overlay" onClick={() => setShowIngredientSelect(false)}>
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '500px',
              maxHeight: '80vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart size={20} /> Add to Shopping List
              </h2>
              <button onClick={() => setShowIngredientSelect(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={24} color="#6b7280" />
              </button>
            </div>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                Select ingredients to add for <strong>{ingredientSelectRecipe.name}</strong>
              </p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
              {ingredientSelectRecipe.ingredients?.map((ing) => {
                const inPantry = isInPantry(ing.name);
                const isSelected = selectedIngredients.has(ing.id);
                return (
                  <div
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '8px',
                      background: isSelected ? '#ecfdf5' : inPantry ? '#f3f4f6' : '#fff',
                      border: `1px solid ${isSelected ? '#10b981' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: `2px solid ${isSelected ? '#10b981' : '#d1d5db'}`,
                        background: isSelected ? '#10b981' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px',
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && <Check size={14} color="white" />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, color: inPantry ? '#9ca3af' : '#1f2937' }}>
                        {ing.quantity && `${decimalToFraction(ing.quantity)} `}
                        {ing.unit && `${ing.unit} `}
                        {ing.name}
                        {ing.preparation && <span style={{ color: '#9ca3af' }}> ({ing.preparation})</span>}
                      </div>
                    </div>
                    {inPantry && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '4px' }}>
                        <Package size={12} /> In Pantry
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: '12px', padding: '16px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb' }}>
              <button
                onClick={() => setShowIngredientSelect(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAddToShopping}
                disabled={selectedIngredients.size === 0 || addingToShopping}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: selectedIngredients.size === 0 ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: selectedIngredients.size === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                }}
              >
                {addingToShopping ? 'Adding...' : `Add ${selectedIngredients.size} Items`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
