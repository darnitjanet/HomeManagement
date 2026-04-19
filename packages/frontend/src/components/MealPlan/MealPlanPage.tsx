import { useState, useEffect } from 'react';
import {
  Calendar,
  List,
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
import './MealPlanPage.css';

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

type ViewMode = 'calendar' | 'list';

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

export function MealPlanPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
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

  const getEntriesForDay = (day: number): MealPlanEntry[] => {
    return mealPlan?.entries?.filter((e) => e.day_of_week === day) || [];
  };

  const filteredRecipes = recipes.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isCurrentWeek = formatWeekStart(currentWeek) === formatWeekStart(getWeekStart(new Date()));

  const getDayDate = (dayIndex: number): Date => {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() + dayIndex);
    return date;
  };

  const isDayToday = (dayIndex: number): boolean => {
    return getDayDate(dayIndex).toDateString() === new Date().toDateString();
  };

  return (
    <div className="meal-plan-page">
      <div className="meal-plan-page-header">
        <h2>
          <Calendar size={24} />
          Meal Planner
        </h2>
      </div>

      <div className="meal-plan-toolbar">
        <div className="meal-plan-week-nav">
          <button className="meal-plan-nav-btn" onClick={handlePrevWeek} aria-label="Previous week">
            <ChevronLeft size={20} />
          </button>
          <span className="meal-plan-week-label">{formatWeekRange(currentWeek)}</span>
          <button className="meal-plan-nav-btn" onClick={handleNextWeek} aria-label="Next week">
            <ChevronRight size={20} />
          </button>
          {!isCurrentWeek && (
            <button className="meal-plan-today-btn" onClick={handleToday}>
              Today
            </button>
          )}
        </div>

        <div className="meal-plan-view-toggle">
          <button
            className={`meal-plan-view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            <Calendar size={16} />
            Calendar
          </button>
          <button
            className={`meal-plan-view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
            List
          </button>
        </div>

        <div className="meal-plan-toolbar-actions">
          <button className="meal-plan-action-btn" onClick={handleCopyPrevWeek} title="Copy from last week">
            <Copy size={16} />
            <span className="meal-plan-btn-label">Copy Last Week</span>
          </button>
          <button className="meal-plan-action-btn" onClick={handleClearWeek} title="Clear this week">
            <Trash2 size={16} />
            <span className="meal-plan-btn-label">Clear</span>
          </button>
          <button className="meal-plan-action-btn primary" onClick={handleGenerateShoppingList}>
            <ShoppingCart size={16} />
            <span className="meal-plan-btn-label">Shopping List</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="meal-plan-loading">Loading meal plan...</div>
      ) : viewMode === 'calendar' ? (
        /* Calendar View */
        <div className="meal-plan-calendar">
          <div className="meal-plan-grid-header">
            <div className="meal-plan-grid-corner"></div>
            {DAYS.map((day, index) => {
              const date = getDayDate(index);
              const isToday = isDayToday(index);
              return (
                <div key={day} className={`meal-plan-day-header ${isToday ? 'today' : ''}`}>
                  <span className="meal-plan-day-name">{day}</span>
                  <span className="meal-plan-day-date">{date.getDate()}</span>
                </div>
              );
            })}
          </div>

          {MEAL_TYPES.map((meal) => {
            const Icon = MEAL_ICONS[meal];
            return (
              <div key={meal} className="meal-plan-grid-row">
                <div className="meal-plan-meal-label">
                  <Icon size={16} />
                  <span>{meal.charAt(0).toUpperCase() + meal.slice(1)}</span>
                </div>
                {DAYS.map((_, dayIndex) => {
                  const entry = getEntry(dayIndex + 1, meal);
                  const isToday = isDayToday(dayIndex);
                  return (
                    <div key={dayIndex} className={`meal-plan-cell ${isToday ? 'today' : ''}`}>
                      {entry ? (
                        <div className="meal-plan-entry">
                          <span className="meal-plan-entry-name">
                            {entry.recipe?.name || entry.custom_meal}
                          </span>
                          <button
                            className="meal-plan-remove-btn"
                            onClick={() => handleRemoveEntry(entry.id)}
                            aria-label="Remove meal"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="meal-plan-add-btn"
                          onClick={() => openAddModal(dayIndex + 1, meal)}
                          aria-label={`Add ${meal} for ${FULL_DAYS[dayIndex]}`}
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
      ) : (
        /* List View */
        <div className="meal-plan-list">
          {DAYS.map((day, dayIndex) => {
            const date = getDayDate(dayIndex);
            const isToday = isDayToday(dayIndex);
            const dayEntries = getEntriesForDay(dayIndex + 1);

            return (
              <div key={day} className={`meal-plan-day-card ${isToday ? 'today' : ''}`}>
                <div className="meal-plan-day-card-header">
                  <span className="meal-plan-day-card-name">{FULL_DAYS[dayIndex]}</span>
                  <span className="meal-plan-day-card-date">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  {isToday && <span className="meal-plan-today-badge">Today</span>}
                </div>

                <div className="meal-plan-day-card-body">
                  {MEAL_TYPES.map((meal) => {
                    const Icon = MEAL_ICONS[meal];
                    const entry = dayEntries.find((e) => e.meal_type === meal);

                    return (
                      <div key={meal} className="meal-plan-list-meal">
                        <div className="meal-plan-list-meal-header">
                          <Icon size={16} />
                          <span className="meal-plan-list-meal-type">
                            {meal.charAt(0).toUpperCase() + meal.slice(1)}
                          </span>
                        </div>
                        <div className="meal-plan-list-meal-content">
                          {entry ? (
                            <div className="meal-plan-list-entry">
                              <span className="meal-plan-list-entry-name">
                                {entry.recipe?.name || entry.custom_meal}
                              </span>
                              <button
                                className="meal-plan-remove-btn"
                                onClick={() => handleRemoveEntry(entry.id)}
                                aria-label="Remove meal"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="meal-plan-list-add-btn"
                              onClick={() => openAddModal(dayIndex + 1, meal)}
                              aria-label={`Add ${meal} for ${FULL_DAYS[dayIndex]}`}
                            >
                              <Plus size={14} />
                              <span>Add {meal}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddModal && selectedSlot && (
        <div className="meal-plan-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="meal-plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="meal-plan-modal-header">
              <h3>
                Add {selectedSlot.meal} for {FULL_DAYS[selectedSlot.day - 1]}
              </h3>
              <button onClick={() => setShowAddModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="meal-plan-modal-content">
              <div className="meal-plan-custom-section">
                <label>Custom Meal</label>
                <div className="meal-plan-custom-input">
                  <input
                    type="text"
                    placeholder="e.g., Leftovers, Eating out..."
                    value={customMeal}
                    onChange={(e) => setCustomMeal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCustomMeal();
                    }}
                  />
                  <button
                    onClick={handleAddCustomMeal}
                    disabled={!customMeal.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="meal-plan-divider">or choose a recipe</div>

              <input
                type="text"
                className="meal-plan-recipe-search"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="meal-plan-recipe-list">
                {filteredRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    className="meal-plan-recipe-option"
                    onClick={() => handleAddRecipe(recipe.id)}
                  >
                    {recipe.image_url && (
                      <img src={recipe.image_url} alt="" />
                    )}
                    <span>{recipe.name}</span>
                  </button>
                ))}
                {filteredRecipes.length === 0 && (
                  <p className="meal-plan-no-recipes">No recipes found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shopping List Modal */}
      {showShoppingList && (
        <div className="meal-plan-modal-overlay" onClick={() => setShowShoppingList(false)}>
          <div className="meal-plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="meal-plan-modal-header">
              <h3>
                <ShoppingCart size={20} />
                Shopping List
              </h3>
              <button onClick={() => setShowShoppingList(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="meal-plan-modal-content">
              {shoppingList.length === 0 ? (
                <p className="meal-plan-empty-list">No ingredients needed for this week's meals.</p>
              ) : (
                <ul className="meal-plan-shopping-items">
                  {shoppingList.map((item, index) => (
                    <li key={index}>
                      <span className="meal-plan-item-name">{item.name}</span>
                      {item.quantity && (
                        <span className="meal-plan-item-qty">
                          {item.quantity} {item.unit || ''}
                        </span>
                      )}
                      <span className="meal-plan-item-recipes">
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
  );
}
