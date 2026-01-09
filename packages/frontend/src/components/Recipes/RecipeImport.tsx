import { useState } from 'react';
import { X, Link, Loader2, ExternalLink } from 'lucide-react';
import { recipesApi } from '../../services/api';
import { RecipeForm } from './RecipeForm';
import './RecipeImport.css';

interface RecipeTag {
  id: number;
  name: string;
  color: string;
  priority: number;
}

interface ImportedRecipe {
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

interface RecipeImportProps {
  onClose: () => void;
  onRecipeCreated: () => void;
  tags: RecipeTag[];
}

export function RecipeImport({ onClose, onRecipeCreated, tags }: RecipeImportProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importedRecipe, setImportedRecipe] = useState<ImportedRecipe | null>(null);

  const handleImport = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await recipesApi.importFromUrl(url.trim());
      if (response.data.success) {
        setImportedRecipe(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to import recipe from URL');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleImport();
    }
  };

  // Show the recipe form pre-filled with imported data
  if (importedRecipe) {
    return (
      <RecipeForm
        onClose={onClose}
        onSave={onRecipeCreated}
        tags={tags}
        initialData={{
          name: importedRecipe.name,
          instructions: importedRecipe.instructions,
          prepTimeMinutes: importedRecipe.prepTimeMinutes,
          cookTimeMinutes: importedRecipe.cookTimeMinutes,
          servings: importedRecipe.servings,
          cuisine: importedRecipe.cuisine,
          difficulty: importedRecipe.difficulty,
          sourceUrl: importedRecipe.sourceUrl,
          imageUrl: importedRecipe.imageUrl,
          ingredients: importedRecipe.ingredients.map((ing, idx) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            preparation: ing.preparation,
            optional: false,
            sortOrder: idx,
          })),
        }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Link size={20} /> Import Recipe from URL
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="import-content">
          <p className="import-description">
            Paste a recipe URL from sites like AllRecipes, Food Network, Tasty, or any site with
            recipe structured data. The recipe will be automatically extracted.
          </p>

          {error && <div className="error-message">{error}</div>}

          <div className="url-input-group">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://www.allrecipes.com/recipe/..."
              disabled={loading}
              autoFocus
            />
            <button
              className="import-btn"
              onClick={handleImport}
              disabled={loading || !url.trim()}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" /> Importing...
                </>
              ) : (
                'Import'
              )}
            </button>
          </div>

          <div className="supported-sites">
            <h4>Works with most recipe sites including:</h4>
            <ul>
              <li>AllRecipes</li>
              <li>Food Network</li>
              <li>Tasty / BuzzFeed</li>
              <li>Serious Eats</li>
              <li>NYT Cooking</li>
              <li>BBC Good Food</li>
              <li>And many more...</li>
            </ul>
          </div>

          <div className="import-tip">
            <ExternalLink size={14} />
            <span>
              Tip: Copy the URL from your browser's address bar while viewing the recipe page.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
