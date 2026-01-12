import { useState, useEffect } from 'react';
import { ShoppingCart, X, ExternalLink, ChevronRight, Check } from 'lucide-react';
import { shoppingApi } from '../../services/api';
import './ShoppingList.css';

type ListType = 'grocery' | 'other';
type GroceryCategory =
  | 'Produce'
  | 'Dairy'
  | 'Meat & Seafood'
  | 'Bakery'
  | 'Frozen'
  | 'Pantry'
  | 'Beverages'
  | 'Snacks'
  | 'Household'
  | 'Personal Care'
  | 'Other';

interface ShoppingItem {
  id: number;
  listType: ListType;
  name: string;
  quantity: number;
  category?: GroceryCategory;
  createdAt: string;
}

interface FavoriteItem {
  id: number;
  listType: ListType;
  name: string;
  category?: GroceryCategory;
  defaultQuantity: number;
  createdAt: string;
}

const GROCERY_CATEGORIES: GroceryCategory[] = [
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

export function ShoppingList() {
  const [activeTab, setActiveTab] = useState<ListType>('grocery');
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showWalmartModal, setShowWalmartModal] = useState(false);
  const [walmartItemIndex, setWalmartItemIndex] = useState(0);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, favoritesRes] = await Promise.all([
        shoppingApi.getItems(activeTab),
        shoppingApi.getFavorites(activeTab),
      ]);
      if (itemsRes.data.success) setItems(itemsRes.data.data);
      if (favoritesRes.data.success) setFavorites(favoritesRes.data.data);
    } catch (err) {
      console.error('Failed to load shopping data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || adding) return;

    try {
      setAdding(true);
      await shoppingApi.addItem(activeTab, {
        name: newItemName.trim(),
        quantity: newItemQuantity,
        // AI will auto-categorize on backend
      });
      setNewItemName('');
      setNewItemQuantity(1);
      loadData();
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleCheckItem = async (id: number) => {
    try {
      await shoppingApi.removeItem(activeTab, id);
      loadData();
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  };

  const handleUpdateQuantity = async (id: number, quantity: number) => {
    if (quantity < 1) return;
    try {
      await shoppingApi.updateItemQuantity(activeTab, id, quantity);
      loadData();
    } catch (err) {
      console.error('Failed to update quantity:', err);
    }
  };

  const handleAddFavorite = async () => {
    if (!newItemName.trim() || adding) return;
    try {
      setAdding(true);
      await shoppingApi.addFavorite(activeTab, {
        name: newItemName.trim(),
        // AI will auto-categorize on backend
        defaultQuantity: newItemQuantity,
      });
      setNewItemName('');
      setNewItemQuantity(1);
      loadData();
    } catch (err) {
      console.error('Failed to add favorite:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleAddFavoriteToList = async (favoriteId: number) => {
    try {
      await shoppingApi.addFavoriteToList(activeTab, favoriteId);
      loadData();
    } catch (err) {
      console.error('Failed to add favorite to list:', err);
    }
  };

  const handleRemoveFavorite = async (id: number) => {
    try {
      await shoppingApi.removeFavorite(activeTab, id);
      loadData();
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const handleSaveItemAsFavorite = async (item: ShoppingItem) => {
    try {
      await shoppingApi.addFavorite(activeTab, {
        name: item.name,
        category: item.category,
        defaultQuantity: item.quantity,
      });
      loadData();
    } catch (err) {
      console.error('Failed to save as favorite:', err);
    }
  };

  const isItemFavorite = (itemName: string) => {
    return favorites.some(f => f.name.toLowerCase() === itemName.toLowerCase());
  };

  const handleClearList = async () => {
    if (!confirm('Clear all items from this list?')) return;
    try {
      await shoppingApi.clearList(activeTab);
      loadData();
    } catch (err) {
      console.error('Failed to clear list:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const openWalmartShopping = () => {
    if (items.length === 0) return;
    setWalmartItemIndex(0);
    setShowWalmartModal(true);
  };

  const openWalmartSearch = (itemName: string) => {
    const searchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(itemName)}`;
    window.open(searchUrl, '_blank');
  };

  const nextWalmartItem = () => {
    if (walmartItemIndex < items.length - 1) {
      setWalmartItemIndex(walmartItemIndex + 1);
    } else {
      setShowWalmartModal(false);
    }
  };

  const closeWalmartModal = () => {
    setShowWalmartModal(false);
    setWalmartItemIndex(0);
  };

  // Group items by category for grocery list
  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, ShoppingItem[]>);

  if (loading) {
    return (
      <div className="shopping-loading">
        <div className="loading-spinner"></div>
        <p>Loading list...</p>
      </div>
    );
  }

  return (
    <div className="shopping-page">
      <div className="shopping-banner">
        <img src="/Shopping.png" alt="Shopping List" />
      </div>

      {/* Tabs */}
      <div className="shopping-tabs no-print">
        <button
          className={`tab-btn ${activeTab === 'grocery' ? 'active' : ''}`}
          onClick={() => setActiveTab('grocery')}
        >
          Grocery
        </button>
        <button
          className={`tab-btn ${activeTab === 'other' ? 'active' : ''}`}
          onClick={() => setActiveTab('other')}
        >
          Other
        </button>
      </div>

      {/* Action bar */}
      <div className="shopping-actions no-print">
        <button
          className={`action-btn ${showFavorites ? 'active' : ''}`}
          onClick={() => setShowFavorites(!showFavorites)}
        >
          ♥ Favorites
        </button>
        {items.length > 0 && (
          <button className="action-btn walmart" onClick={openWalmartShopping}>
            🛒 Send to Walmart
          </button>
        )}
        <button className="action-btn" onClick={handlePrint}>
          🖨 Print
        </button>
        {items.length > 0 && (
          <button className="action-btn danger" onClick={handleClearList}>
            🗑 Clear
          </button>
        )}
      </div>

      {/* Favorites panel */}
      {showFavorites && (
        <div className="favorites-panel no-print">
          <h3>Quick Add from Favorites</h3>
          {favorites.length === 0 ? (
            <p className="no-favorites">No favorites yet. Add items below!</p>
          ) : (
            <div className="favorites-grid">
              {favorites.map((fav) => (
                <div key={fav.id} className="favorite-chip">
                  <button
                    className="favorite-add"
                    onClick={() => handleAddFavoriteToList(fav.id)}
                  >
                    + {fav.name}
                    {fav.defaultQuantity > 1 && (
                      <span className="fav-qty">({fav.defaultQuantity})</span>
                    )}
                  </button>
                  <button
                    className="favorite-remove"
                    onClick={() => handleRemoveFavorite(fav.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add item form */}
      <form className="add-item-form no-print" onSubmit={handleAddItem}>
        <input
          type="text"
          placeholder={activeTab === 'grocery' ? "Add item (AI auto-sorts)..." : "Add item..."}
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          className="item-input"
          disabled={adding}
        />
        <div className="quantity-input">
          <button
            type="button"
            onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
            disabled={adding}
          >
            −
          </button>
          <span>{newItemQuantity}</span>
          <button
            type="button"
            onClick={() => setNewItemQuantity(newItemQuantity + 1)}
            disabled={adding}
          >
            +
          </button>
        </div>
        <button type="submit" className="add-btn primary" disabled={adding}>
          {adding ? (
            <>
              ✨ Adding...
            </>
          ) : (
            <>
              + Add
            </>
          )}
        </button>
        <button
          type="button"
          className="add-btn secondary"
          onClick={handleAddFavorite}
          title="Save as favorite"
          disabled={adding}
        >
          ♡
        </button>
      </form>

      {/* Shopping list */}
      <div className="shopping-list">
        <h2 className="print-title">
          {activeTab === 'grocery' ? 'Grocery List' : 'Shopping List'}
        </h2>

        {items.length === 0 ? (
          <div className="empty-list no-print">
            <p>Your list is empty</p>
            <p className="empty-hint">Add items above to get started!</p>
          </div>
        ) : activeTab === 'grocery' ? (
          // Grouped by category
          GROCERY_CATEGORIES.filter((cat) => groupedItems[cat]?.length > 0).map(
            (category) => (
              <div key={category} className="category-group">
                <h3 className="category-header">{category}</h3>
                <ul className="items-list">
                  {groupedItems[category].map((item) => (
                    <li key={item.id} className="shopping-item">
                      <button
                        className="check-btn no-print"
                        onClick={() => handleCheckItem(item.id)}
                        title="Check off item"
                      >
                        ✓
                      </button>
                      <span className="print-checkbox"></span>
                      <span className="item-name">{item.name}</span>
                      <span className="item-category-tag">{item.category || 'Other'}</span>
                      <div className="item-quantity no-print">
                        <button
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          −
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                      {!isItemFavorite(item.name) && (
                        <button
                          className="save-favorite-btn no-print"
                          onClick={() => handleSaveItemAsFavorite(item)}
                          title="Save as favorite"
                        >
                          ♡
                        </button>
                      )}
                      {isItemFavorite(item.name) && (
                        <span className="is-favorite no-print" title="Already a favorite">
                          ♥
                        </span>
                      )}
                      <span className="print-quantity">x{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )
        ) : (
          // Simple list for "other"
          <ul className="items-list">
            {items.map((item) => (
              <li key={item.id} className="shopping-item">
                <button
                  className="check-btn no-print"
                  onClick={() => handleCheckItem(item.id)}
                  title="Check off item"
                >
                  ✓
                </button>
                <span className="print-checkbox"></span>
                <span className="item-name">{item.name}</span>
                <div className="item-quantity no-print">
                  <button
                    onClick={() =>
                      handleUpdateQuantity(item.id, item.quantity - 1)
                    }
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() =>
                      handleUpdateQuantity(item.id, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>
                {!isItemFavorite(item.name) && (
                  <button
                    className="save-favorite-btn no-print"
                    onClick={() => handleSaveItemAsFavorite(item)}
                    title="Save as favorite"
                  >
                    ♡
                  </button>
                )}
                {isItemFavorite(item.name) && (
                  <span className="is-favorite no-print" title="Already a favorite">
                    ♥
                  </span>
                )}
                <span className="print-quantity">x{item.quantity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Walmart Shopping Modal */}
      {showWalmartModal && items.length > 0 && (
        <div className="walmart-modal-overlay" onClick={closeWalmartModal}>
          <div className="walmart-modal" onClick={(e) => e.stopPropagation()}>
            <div className="walmart-modal-header">
              <h2>🛒 Send to Walmart</h2>
              <button className="close-btn" onClick={closeWalmartModal}>
                <X size={24} />
              </button>
            </div>

            <div className="walmart-modal-progress">
              Item {walmartItemIndex + 1} of {items.length}
            </div>

            <div className="walmart-item-card">
              <div className="walmart-item-name">
                {items[walmartItemIndex].name}
              </div>
              <div className="walmart-item-qty">
                Quantity: {items[walmartItemIndex].quantity}
              </div>
              {items[walmartItemIndex].category && (
                <div className="walmart-item-category">
                  {items[walmartItemIndex].category}
                </div>
              )}
            </div>

            <div className="walmart-modal-actions">
              <button
                className="walmart-search-btn"
                onClick={() => openWalmartSearch(items[walmartItemIndex].name)}
              >
                <ExternalLink size={20} />
                Search on Walmart
              </button>

              <button
                className="walmart-next-btn"
                onClick={nextWalmartItem}
              >
                {walmartItemIndex < items.length - 1 ? (
                  <>
                    Next Item
                    <ChevronRight size={20} />
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Done
                  </>
                )}
              </button>
            </div>

            <div className="walmart-item-list">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`walmart-list-item ${index === walmartItemIndex ? 'current' : ''} ${index < walmartItemIndex ? 'completed' : ''}`}
                  onClick={() => setWalmartItemIndex(index)}
                >
                  <span className="walmart-list-check">
                    {index < walmartItemIndex ? '✓' : index === walmartItemIndex ? '→' : '○'}
                  </span>
                  <span className="walmart-list-name">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
