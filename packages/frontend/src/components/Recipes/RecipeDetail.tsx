import { Clock, Users, Edit, Trash2, ShoppingCart, ExternalLink, X } from 'lucide-react';
import { decimalToFraction } from '../../utils/fractions';
import './RecipeDetail.css';

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

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
  onAddToShopping: () => void;
  onDelete: () => void;
}

export function RecipeDetail({ recipe, onClose, onEdit, onAddToShopping, onDelete }: RecipeDetailProps) {
  const formatTime = (prepMinutes?: number, cookMinutes?: number): string => {
    const total = (prepMinutes || 0) + (cookMinutes || 0);
    if (total === 0) return '-';
    if (total < 60) return `${total} min`;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatIngredient = (ing: RecipeIngredient): string => {
    let str = '';
    if (ing.quantity) {
      str += decimalToFraction(ing.quantity);
      if (ing.unit) str += ` ${ing.unit}`;
      str += ' ';
    }
    str += ing.name;
    if (ing.preparation) str += `, ${ing.preparation}`;
    if (ing.optional) str += ' (optional)';
    return str;
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this recipe?')) {
      onDelete();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recipe-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div className="header-content">
            <h2>{recipe.name}</h2>
            <div className="recipe-badges">
              {recipe.cuisine && <span className="badge cuisine-badge">{recipe.cuisine}</span>}
              {recipe.mealType && <span className="badge meal-badge">{recipe.mealType}</span>}
              {recipe.difficulty && (
                <span className={`badge difficulty-badge ${recipe.difficulty.toLowerCase()}`}>
                  {recipe.difficulty}
                </span>
              )}
              {recipe.dietary && <span className="badge dietary-badge">{recipe.dietary}</span>}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="detail-content">
          <div className="detail-meta">
            <div className="meta-item">
              <Clock size={18} />
              <div className="meta-text">
                <span className="meta-label">Total Time</span>
                <span className="meta-value">{formatTime(recipe.prepTimeMinutes, recipe.cookTimeMinutes)}</span>
              </div>
            </div>
            {recipe.prepTimeMinutes && (
              <div className="meta-item">
                <span className="meta-text">
                  <span className="meta-label">Prep</span>
                  <span className="meta-value">{recipe.prepTimeMinutes} min</span>
                </span>
              </div>
            )}
            {recipe.cookTimeMinutes && (
              <div className="meta-item">
                <span className="meta-text">
                  <span className="meta-label">Cook</span>
                  <span className="meta-value">{recipe.cookTimeMinutes} min</span>
                </span>
              </div>
            )}
            {recipe.servings && (
              <div className="meta-item">
                <Users size={18} />
                <div className="meta-text">
                  <span className="meta-label">Servings</span>
                  <span className="meta-value">{recipe.servings}</span>
                </div>
              </div>
            )}
          </div>

          {recipe.tags && recipe.tags.length > 0 && (
            <div className="detail-tags">
              {recipe.tags.map((tag) => (
                <span key={tag.id} className="tag-badge" style={{ backgroundColor: tag.color }}>
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <div className="detail-sections">
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="detail-section">
                <div className="section-header">
                  <h3>Ingredients</h3>
                  <button className="shopping-btn" onClick={onAddToShopping}>
                    <ShoppingCart size={16} />
                    Add to Shopping List
                  </button>
                </div>
                <ul className="ingredients-list">
                  {recipe.ingredients
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((ing) => (
                      <li key={ing.id} className={ing.optional ? 'optional' : ''}>
                        {formatIngredient(ing)}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {recipe.instructions && (
              <div className="detail-section">
                <h3>Instructions</h3>
                <div className="instructions-text">{recipe.instructions}</div>
              </div>
            )}

            {recipe.notes && (
              <div className="detail-section">
                <h3>Notes</h3>
                <div className="notes-text">{recipe.notes}</div>
              </div>
            )}

            {recipe.sourceUrl && (
              <div className="detail-section">
                <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="source-link">
                  <ExternalLink size={16} />
                  View Original Recipe
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="detail-actions">
          <button className="action-btn delete" onClick={handleDelete}>
            <Trash2 size={18} />
            Delete
          </button>
          <button className="action-btn edit" onClick={onEdit}>
            <Edit size={18} />
            Edit Recipe
          </button>
        </div>
      </div>
    </div>
  );
}
