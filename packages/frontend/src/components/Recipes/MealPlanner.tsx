import { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Copy,
  Trash2,
  ShoppingCart,
  Coffee,
  Sun,
  Moon,
  Cookie,
} from 'lucide-react';
import { mealPlanApi, recipesApi } from '../../services/api';
import './MealPlanner.css';

interface Recipe {
  id: number;
  name: string;
  image_url: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
}

interface MealPlanEntry {
  id: number;
  meal_plan_id: number;
  day_of_week: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_id: number | null;
  custom_meal: string | null;
  notes: string | null;
  servings: number;
  recipe?: {
    id: number;
    name: string;
    image_url: string | null;
  };
}

interface MealPlan {
  id: number;
  week_start_date: string;
  entries?: MealPlanEntry[];
}

interface ShoppingItem {
  name: string;
  quantity: number | null;
  unit: string | null;
  recipes: string[];
}

interface MealPlannerProps {
  onClose: () => void;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekStart(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });

  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}`;
  }
  return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}`;
}

export function MealPlanner({ onClose }: MealPlannerProps) {
  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(new Date()));
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; meal: 'breakfast' | 'lunch' | 'dinner' | 'snack' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customMeal, setCustomMeal] = useState('');
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  useEffect(() => {
    loadMealPlan();
    loadRecipes();
  }, [currentWeek]);

  const loadMealPlan = async () => {
    setLoading(true);
    try {
      const response = await mealPlanApi.getMealPlan(formatWeekStart(currentWeek));
      setMealPlan(response.data.data);
    } catch (error) {
      console.error('Failed to load meal plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipes = async () => {
    try {
      const response = await recipesApi.getAllRecipes();
      if (response.data.success) {
        setRecipes(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  };

  const handlePrevWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() - 7);
    setCurrentWeek(newWeek);
  };

  const handleNextWeek = () => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + 7);
    setCurrentWeek(newWeek);
  };

  const handleToday = () => {
    setCurrentWeek(getWeekStart(new Date()));
  };

  const openAddModal = (day: number, meal: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    setSelectedSlot({ day, meal });
    setSearchQuery('');
    setCustomMeal('');
    setShowAddModal(true);
  };

  const handleAddRecipe = async (recipeId: number) => {
    if (!selectedSlot) return;

    try {
      await mealPlanApi.addEntry(formatWeekStart(currentWeek), {
        day_of_week: selectedSlot.day,
        meal_type: selectedSlot.meal,
        recipe_id: recipeId,
      });
      setShowAddModal(false);
      loadMealPlan();
    } catch (error) {
      console.error('Failed to add recipe:', error);
    }
  };

  const handleAddCustomMeal = async () => {
    if (!selectedSlot || !customMeal.trim()) return;

    try {
      await mealPlanApi.addEntry(formatWeekStart(currentWeek), {
        day_of_week: selectedSlot.day,
        meal_type: selectedSlot.meal,
        custom_meal: customMeal.trim(),
      });
      setShowAddModal(false);
      loadMealPlan();
    } catch (error) {
      console.error('Failed to add custom meal:', error);
    }
  };

  const handleRemoveEntry = async (entryId: number) => {
    try {
      await mealPlanApi.deleteEntry(entryId);
      loadMealPlan();
    } catch (error) {
      console.error('Failed to remove entry:', error);
    }
  };

  const handleCopyPrevWeek = async () => {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);

    try {
      await mealPlanApi.copyWeek(formatWeekStart(prevWeek), formatWeekStart(currentWeek));
      loadMealPlan();
    } catch (error) {
      console.error('Failed to copy week:', error);
    }
  };

  const handleClearWeek = async () => {
    if (!confirm('Clear all meals for this week?')) return;

    try {
      await mealPlanApi.clearWeek(formatWeekStart(currentWeek));
      loadMealPlan();
    } catch (error) {
      console.error('Failed to clear week:', error);
    }
  };

  const handleGenerateShoppingList = async () => {
    try {
      const response = await mealPlanApi.generateShoppingList(formatWeekStart(currentWeek));
      setShoppingList(response.data.data || []);
      setShowShoppingList(true);
    } catch (error) {
      console.error('Failed to generate shopping list:', error);
    }
  };

  const getEntry = (day: number, meal: string): MealPlanEntry | undefined => {
    return mealPlan?.entries?.find(
      (e) => e.day_of_week === day && e.meal_type === meal
    );
  };

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isCurrentWeek = formatWeekStart(currentWeek) === formatWeekStart(getWeekStart(new Date()));

  return (
    <div className="meal-planner-overlay" onClick={onClose}>
      <div className="meal-planner-modal" onClick={(e) => e.stopPropagation()}>
        <div className="meal-planner-header">
          <h2>
            <Calendar size={24} />
            Meal Planner
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="meal-planner-toolbar">
          <div className="week-nav">
            <button onClick={handlePrevWeek}>
              <ChevronLeft size={20} />
            </button>
            <span className="week-label">{formatWeekRange(currentWeek)}</span>
            <button onClick={handleNextWeek}>
              <ChevronRight size={20} />
            </button>
            {!isCurrentWeek && (
              <button className="today-btn" onClick={handleToday}>
                Today
              </button>
            )}
          </div>
          <div className="toolbar-actions">
            <button className="toolbar-btn" onClick={handleCopyPrevWeek} title="Copy from last week">
              <Copy size={16} />
              Copy Last Week
            </button>
            <button className="toolbar-btn" onClick={handleClearWeek} title="Clear this week">
              <Trash2 size={16} />
              Clear
            </button>
            <button className="toolbar-btn primary" onClick={handleGenerateShoppingList}>
              <ShoppingCart size={16} />
              Shopping List
            </button>
          </div>
        </div>

        {loading ? (
          <div className="meal-planner-loading">Loading meal plan...</div>
        ) : (
          <div className="meal-planner-grid">
            <div className="grid-header">
              <div className="grid-corner"></div>
              {DAYS.map((day, index) => {
                const date = new Date(currentWeek);
                date.setDate(date.getDate() + index);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div key={day} className={`grid-day-header ${isToday ? 'today' : ''}`}>
                    <span className="day-name">{day}</span>
                    <span className="day-date">{date.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {MEAL_TYPES.map((meal) => {
              const Icon = MEAL_ICONS[meal];
              return (
                <div key={meal} className="grid-row">
                  <div className="grid-meal-label">
                    <Icon size={16} />
                    <span>{meal.charAt(0).toUpperCase() + meal.slice(1)}</span>
                  </div>
                  {DAYS.map((_, dayIndex) => {
                    const entry = getEntry(dayIndex + 1, meal); // 1-indexed days (Mon=1)
                    return (
                      <div key={dayIndex} className="grid-cell">
                        {entry ? (
                          <div className="meal-entry">
                            <span className="meal-name">
                              {entry.recipe?.name || entry.custom_meal}
                            </span>
                            <button
                              className="remove-btn"
                              onClick={() => handleRemoveEntry(entry.id)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="add-meal-btn"
                            onClick={() => openAddModal(dayIndex + 1, meal)}
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Meal Modal */}
        {showAddModal && selectedSlot && (
          <div className="add-meal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="add-meal-modal" onClick={(e) => e.stopPropagation()}>
              <div className="add-meal-header">
                <h3>
                  Add {selectedSlot.meal} for {FULL_DAYS[selectedSlot.day - 1]}
                </h3>
                <button onClick={() => setShowAddModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="add-meal-content">
                <div className="custom-meal-section">
                  <label>Custom Meal</label>
                  <div className="custom-meal-input">
                    <input
                      type="text"
                      placeholder="e.g., Leftovers, Eating out..."
                      value={customMeal}
                      onChange={(e) => setCustomMeal(e.target.value)}
                    />
                    <button
                      onClick={handleAddCustomMeal}
                      disabled={!customMeal.trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="divider">or choose a recipe</div>

                <input
                  type="text"
                  className="recipe-search"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="recipe-list">
                  {filteredRecipes.map((recipe) => (
                    <button
                      key={recipe.id}
                      className="recipe-option"
                      onClick={() => handleAddRecipe(recipe.id)}
                    >
                      {recipe.image_url && (
                        <img src={recipe.image_url} alt="" />
                      )}
                      <span>{recipe.name}</span>
                    </button>
                  ))}
                  {filteredRecipes.length === 0 && (
                    <p className="no-recipes">No recipes found</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shopping List Modal */}
        {showShoppingList && (
          <div className="shopping-list-overlay" onClick={() => setShowShoppingList(false)}>
            <div className="shopping-list-modal" onClick={(e) => e.stopPropagation()}>
              <div className="shopping-list-header">
                <h3>
                  <ShoppingCart size={20} />
                  Shopping List
                </h3>
                <button onClick={() => setShowShoppingList(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="shopping-list-content">
                {shoppingList.length === 0 ? (
                  <p className="empty-list">No ingredients needed for this week's meals.</p>
                ) : (
                  <ul className="shopping-items">
                    {shoppingList.map((item, index) => (
                      <li key={index}>
                        <span className="item-name">{item.name}</span>
                        {item.quantity && (
                          <span className="item-qty">
                            {item.quantity} {item.unit || ''}
                          </span>
                        )}
                        <span className="item-recipes">
                          ({item.recipes.join(', ')})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
