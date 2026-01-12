import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, X, ExternalLink, ChevronRight, Check, ScanBarcode } from 'lucide-react';
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
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [storeItemIndex, setStoreItemIndex] = useState(0);
  const [activeStore, setActiveStore] = useState<'walmart' | 'dillons'>('walmart');

  // Barcode scanner state
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanStatus, setScanStatus] = useState<'ready' | 'scanning' | 'success' | 'error'>('ready');
  const [scanResult, setScanResult] = useState<string>('');
  const scanInputRef = useRef<HTMLInputElement>(null);

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

  const openStoreShopping = (store: 'walmart' | 'dillons') => {
    if (items.length === 0) return;
    setActiveStore(store);
    setStoreItemIndex(0);
    setShowStoreModal(true);
  };

  const openStoreSearch = (itemName: string) => {
    const searchUrls = {
      walmart: `https://www.walmart.com/search?q=${encodeURIComponent(itemName)}`,
      dillons: `https://www.dillons.com/search?query=${encodeURIComponent(itemName)}&searchType=default_search`,
    };
    window.open(searchUrls[activeStore], '_blank');
  };

  const nextStoreItem = () => {
    if (storeItemIndex < items.length - 1) {
      setStoreItemIndex(storeItemIndex + 1);
    } else {
      setShowStoreModal(false);
    }
  };

  const closeStoreModal = () => {
    setShowStoreModal(false);
    setStoreItemIndex(0);
  };

  const storeInfo = {
    walmart: { name: 'Walmart', color: '#0071ce', emoji: '🛒' },
    dillons: { name: 'Dillons', color: '#e31837', emoji: '🛒' },
  };

  // Barcode scanner functions
  const openScanModal = () => {
    setShowScanModal(true);
    setScanInput('');
    setScanStatus('ready');
    setScanResult('');
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const closeScanModal = () => {
    setShowScanModal(false);
    setScanInput('');
    setScanStatus('ready');
    setScanResult('');
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setScanStatus('scanning');
    try {
      const response = await shoppingApi.lookupBarcode(scanInput.trim());
      if (response.data.success && response.data.data.found) {
        const product = response.data.data;
        // Add the product to the shopping list
        await shoppingApi.addItem('grocery', {
          name: product.name,
          quantity: 1,
          category: product.category,
        });
        setScanStatus('success');
        setScanResult(`Added: ${product.name}`);
        loadData();
        // Reset for next scan
        setTimeout(() => {
          setScanInput('');
          setScanStatus('ready');
          setScanResult('');
          scanInputRef.current?.focus();
        }, 1500);
      } else {
        setScanStatus('error');
        setScanResult(`Product not found for barcode: ${scanInput}`);
        setTimeout(() => {
          setScanInput('');
          setScanStatus('ready');
          scanInputRef.current?.focus();
        }, 2000);
      }
    } catch (err) {
      console.error('Barcode lookup failed:', err);
      setScanStatus('error');
      setScanResult('Failed to lookup barcode');
      setTimeout(() => {
        setScanInput('');
        setScanStatus('ready');
        scanInputRef.current?.focus();
      }, 2000);
    }
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
        <button className="action-btn scan" onClick={openScanModal}>
          <ScanBarcode size={18} />
          Scan
        </button>
        {items.length > 0 && (
          <>
            <button className="action-btn dillons" onClick={() => openStoreShopping('dillons')}>
              🛒 Dillons
            </button>
            <button className="action-btn walmart" onClick={() => openStoreShopping('walmart')}>
              🛒 Walmart
            </button>
          </>
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
        <button type="submit" className="add-btn primary" disabled={adding}>
          {adding ? '✨ Adding...' : '+ Add'}
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

      {/* Barcode Scanner Modal */}
      {showScanModal && (
        <div className="scan-modal-overlay" onClick={closeScanModal}>
          <div className="scan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="scan-modal-header">
              <h2><ScanBarcode size={24} /> Scan Barcode</h2>
              <button className="close-btn" onClick={closeScanModal}>
                <X size={24} />
              </button>
            </div>

            <div className="scan-modal-content">
              <p className="scan-instructions">
                Point your barcode scanner at a product, or type the barcode manually
              </p>

              <form onSubmit={handleScanSubmit} className="scan-form">
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  placeholder="Scan or enter barcode..."
                  className="scan-input"
                  autoFocus
                  disabled={scanStatus === 'scanning'}
                />
                <button
                  type="submit"
                  className="scan-submit-btn"
                  disabled={!scanInput.trim() || scanStatus === 'scanning'}
                >
                  {scanStatus === 'scanning' ? 'Looking up...' : 'Add Item'}
                </button>
              </form>

              {scanResult && (
                <div className={`scan-result ${scanStatus}`}>
                  {scanStatus === 'success' && <Check size={20} />}
                  {scanStatus === 'error' && <X size={20} />}
                  {scanResult}
                </div>
              )}

              <div className="scan-tip">
                <strong>Tip:</strong> After scanning, the product will be automatically added to your grocery list.
                Works best with food products.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store Shopping Modal */}
      {showStoreModal && items.length > 0 && (
        <div className="store-modal-overlay" onClick={closeStoreModal}>
          <div className="store-modal" onClick={(e) => e.stopPropagation()}>
            <div
              className="store-modal-header"
              style={{ background: storeInfo[activeStore].color }}
            >
              <h2>{storeInfo[activeStore].emoji} Send to {storeInfo[activeStore].name}</h2>
              <button className="close-btn" onClick={closeStoreModal}>
                <X size={24} />
              </button>
            </div>

            <div className="store-modal-progress">
              Item {storeItemIndex + 1} of {items.length}
            </div>

            <div className="store-item-card">
              <div className="store-item-name">
                {items[storeItemIndex].name}
              </div>
              <div className="store-item-qty">
                Quantity: {items[storeItemIndex].quantity}
              </div>
              {items[storeItemIndex].category && (
                <div className="store-item-category">
                  {items[storeItemIndex].category}
                </div>
              )}
            </div>

            <div className="store-modal-actions">
              <button
                className="store-search-btn"
                style={{ background: storeInfo[activeStore].color }}
                onClick={() => openStoreSearch(items[storeItemIndex].name)}
              >
                <ExternalLink size={20} />
                Search on {storeInfo[activeStore].name}
              </button>

              <button
                className="store-next-btn"
                onClick={nextStoreItem}
              >
                {storeItemIndex < items.length - 1 ? (
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

            <div className="store-item-list">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`store-list-item ${index === storeItemIndex ? 'current' : ''} ${index < storeItemIndex ? 'completed' : ''}`}
                  onClick={() => setStoreItemIndex(index)}
                >
                  <span className="store-list-check">
                    {index < storeItemIndex ? '✓' : index === storeItemIndex ? '→' : '○'}
                  </span>
                  <span className="store-list-name">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
