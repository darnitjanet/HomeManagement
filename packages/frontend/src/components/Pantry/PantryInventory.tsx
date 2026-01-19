import { useState, useEffect } from 'react';
import { Plus, Search, AlertTriangle, ChefHat, Package, Barcode, Undo2, ShoppingCart } from 'lucide-react';
import { pantryApi, recipesApi, shoppingApi } from '../../services/api';
import { PantryItemForm } from './PantryItemForm';
import { QuickScanModal } from './QuickScanModal';
import './Pantry.css';

interface PantryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string | null;
  category: string | null;
  location: string | null;
  expirationDate: string | null;
  purchaseDate: string | null;
  lowStockThreshold: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Constants {
  categories: string[];
  locations: string[];
  units: string[];
}

const LOCATION_ICONS: Record<string, string> = {
  'Refrigerator': '🧊',
  'Freezer': '❄️',
  'Pantry': '🏠',
  'Counter': '🍎',
  'Spice Rack': '🧂',
};

function getExpirationStatus(expirationDate: string | null): 'good' | 'warning' | 'urgent' | 'expired' | null {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 2) return 'urgent';
  if (daysUntil <= 7) return 'warning';
  return 'good';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function PantryInventory() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<PantryItem[]>([]);
  const [constants, setConstants] = useState<Constants | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'location'>('grid');
  const [showForm, setShowForm] = useState(false);
  const [showQuickScan, setShowQuickScan] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [suggestingRecipes, setSuggestingRecipes] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info'; action?: () => void; actionLabel?: string } | null>(null);

  // Undo state for deleted items
  const [deletedItem, setDeletedItem] = useState<PantryItem | null>(null);
  const [undoTimeout, setUndoTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadData();
    loadConstants();
  }, []);

  const loadConstants = async () => {
    try {
      const res = await pantryApi.getConstants();
      if (res.data.success) {
        setConstants(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load constants:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, expiringRes, lowStockRes] = await Promise.all([
        pantryApi.getAllItems(),
        pantryApi.getExpiring(7),
        pantryApi.getLowStock(),
      ]);
      if (itemsRes.data.success) setItems(itemsRes.data.data);
      if (expiringRes.data.success) setExpiringItems(expiringRes.data.data);
      if (lowStockRes.data.success) setLowStockItems(lowStockRes.data.data);
    } catch (err) {
      console.error('Failed to load pantry data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }
    try {
      const res = await pantryApi.search(searchQuery);
      if (res.data.success) setItems(res.data.data);
    } catch (err) {
      console.error('Failed to search:', err);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item: PantryItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDeleteItem = async (id: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Clear any existing undo timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    try {
      // Delete from pantry
      await pantryApi.deleteItem(id);

      // Add to shopping list automatically
      await shoppingApi.addItem('grocery', {
        name: item.name,
        quantity: 1,
        category: item.category || undefined,
      });

      // Store deleted item for potential undo
      setDeletedItem(item);

      // Show toast with undo option
      setToast({
        message: `"${item.name}" added to shopping list`,
        type: 'success',
        action: () => handleUndoDelete(item),
        actionLabel: 'Undo',
      });

      // Auto-hide toast after 5 seconds
      const timeout = setTimeout(() => {
        setToast(null);
        setDeletedItem(null);
      }, 5000);
      setUndoTimeout(timeout);

      loadData();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleUndoDelete = async (item: PantryItem) => {
    try {
      // Re-add to pantry
      await pantryApi.createItem({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || undefined,
        category: item.category || undefined,
        location: item.location || undefined,
        expirationDate: item.expirationDate || undefined,
        lowStockThreshold: item.lowStockThreshold || undefined,
        notes: item.notes || undefined,
      });

      // Remove from shopping list (find and remove by name)
      const shoppingRes = await shoppingApi.getItems('grocery');
      if (shoppingRes.data.success) {
        const shoppingItem = shoppingRes.data.data.find(
          (si: any) => si.name.toLowerCase() === item.name.toLowerCase()
        );
        if (shoppingItem) {
          await shoppingApi.removeItem('grocery', shoppingItem.id);
        }
      }

      setToast({ message: `"${item.name}" restored to pantry`, type: 'info' });
      setTimeout(() => setToast(null), 3000);

      setDeletedItem(null);
      if (undoTimeout) {
        clearTimeout(undoTimeout);
        setUndoTimeout(null);
      }

      loadData();
    } catch (err) {
      console.error('Failed to undo delete:', err);
    }
  };

  const handleQuantityChange = async (id: number, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQuantity = Math.max(0, item.quantity + delta);
    try {
      await pantryApi.updateQuantity(id, newQuantity);
      loadData();
    } catch (err) {
      console.error('Failed to update quantity:', err);
    }
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingItem(null);
    loadData();
  };

  const handleSuggestRecipes = async () => {
    setSuggestingRecipes(true);
    try {
      const ingredientsRes = await pantryApi.getIngredients();
      if (ingredientsRes.data.success && ingredientsRes.data.data.length > 0) {
        const res = await recipesApi.suggestFromIngredients(ingredientsRes.data.data);
        if (res.data.success) {
          alert(`Recipe suggestions based on your pantry:\n\n${res.data.data.map((r: any) => `- ${r.name}: ${r.description}`).join('\n')}`);
        }
      } else {
        alert('Add some items to your pantry first!');
      }
    } catch (err) {
      console.error('Failed to suggest recipes:', err);
      alert('Failed to get recipe suggestions. Make sure AI is enabled.');
    } finally {
      setSuggestingRecipes(false);
    }
  };

  // Filter items
  let filteredItems = items;
  if (filterCategory) {
    filteredItems = filteredItems.filter(i => i.category === filterCategory);
  }
  if (filterLocation) {
    filteredItems = filteredItems.filter(i => i.location === filterLocation);
  }

  // Group items by category or location
  const groupedItems = filteredItems.reduce((acc, item) => {
    const key = viewMode === 'location'
      ? (item.location || 'Unknown')
      : (item.category || 'Other');
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, PantryItem[]>);

  if (loading) {
    return (
      <div className="pantry-loading">
        <div className="loading-spinner"></div>
        <p>Loading pantry...</p>
      </div>
    );
  }

  return (
    <div className="pantry-page">
      <div className="pantry-header">
        <h1><Package size={32} /> Pantry Inventory</h1>
      </div>

      {/* Alerts section */}
      {(expiringItems.length > 0 || lowStockItems.length > 0) && (
        <div className="pantry-alerts">
          {expiringItems.length > 0 && (
            <div className="alert alert-warning">
              <AlertTriangle size={20} />
              <span>{expiringItems.length} item{expiringItems.length > 1 ? 's' : ''} expiring soon</span>
            </div>
          )}
          {lowStockItems.length > 0 && (
            <div className="alert alert-info">
              <Package size={20} />
              <span>{lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low</span>
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="pantry-actions">
        <button className="action-btn primary" onClick={handleAddItem}>
          <Plus size={18} /> Add Item
        </button>
        <button className="action-btn" onClick={() => setShowQuickScan(true)}>
          <Barcode size={18} /> Quick Scan
        </button>
        <button
          className="action-btn"
          onClick={handleSuggestRecipes}
          disabled={suggestingRecipes || items.length === 0}
        >
          <ChefHat size={18} /> {suggestingRecipes ? 'Thinking...' : 'What Can I Make?'}
        </button>
      </div>

      {/* Search and filters */}
      <div className="pantry-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search pantry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => { setSearchQuery(''); loadData(); }}>
              &times;
            </button>
          )}
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {constants?.categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
        >
          <option value="">All Locations</option>
          {constants?.locations.map((loc) => (
            <option key={loc} value={loc}>{LOCATION_ICONS[loc] || ''} {loc}</option>
          ))}
        </select>
      </div>

      {/* View toggle */}
      <div className="view-toggle">
        <button
          className={viewMode === 'grid' ? 'active' : ''}
          onClick={() => setViewMode('grid')}
        >
          Grid
        </button>
        <button
          className={viewMode === 'list' ? 'active' : ''}
          onClick={() => setViewMode('list')}
        >
          List
        </button>
        <button
          className={viewMode === 'location' ? 'active' : ''}
          onClick={() => setViewMode('location')}
        >
          By Location
        </button>
      </div>

      {/* Items display */}
      {filteredItems.length === 0 ? (
        <div className="empty-pantry">
          <Package size={48} />
          <p>Your pantry is empty</p>
          <p className="empty-hint">Add items to start tracking your inventory!</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="pantry-list">
          {filteredItems.map((item) => (
            <PantryListItem
              key={item.id}
              item={item}
              onEdit={() => handleEditItem(item)}
              onDelete={() => handleDeleteItem(item.id)}
              onQuantityChange={(delta) => handleQuantityChange(item.id, delta)}
            />
          ))}
        </div>
      ) : (
        <div className="pantry-grouped">
          {Object.entries(groupedItems)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([group, groupItems]) => (
              <div key={group} className="pantry-group">
                <h3 className="group-header">
                  {viewMode === 'location' && LOCATION_ICONS[group] && (
                    <span className="location-icon">{LOCATION_ICONS[group]}</span>
                  )}
                  {group}
                  <span className="group-count">{groupItems.length}</span>
                </h3>
                <div className={viewMode === 'grid' ? 'pantry-grid' : 'pantry-list'}>
                  {groupItems.map((item) => (
                    viewMode === 'grid' ? (
                      <PantryGridItem
                        key={item.id}
                        item={item}
                        onEdit={() => handleEditItem(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                        onQuantityChange={(delta) => handleQuantityChange(item.id, delta)}
                      />
                    ) : (
                      <PantryListItem
                        key={item.id}
                        item={item}
                        onEdit={() => handleEditItem(item)}
                        onDelete={() => handleDeleteItem(item.id)}
                        onQuantityChange={(delta) => handleQuantityChange(item.id, delta)}
                      />
                    )
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <PantryItemForm
          item={editingItem}
          constants={constants}
          onClose={() => { setShowForm(false); setEditingItem(null); }}
          onSave={handleFormSave}
        />
      )}

      {/* Quick scan modal */}
      {showQuickScan && (
        <QuickScanModal
          onClose={() => setShowQuickScan(false)}
          onComplete={loadData}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`pantry-toast ${toast.type}`}>
          <ShoppingCart size={18} />
          <span>{toast.message}</span>
          {toast.action && toast.actionLabel && (
            <button className="toast-action" onClick={toast.action}>
              <Undo2 size={16} />
              {toast.actionLabel}
            </button>
          )}
          <button className="toast-dismiss" onClick={() => setToast(null)}>
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

// Grid item component
function PantryGridItem({
  item,
  onEdit,
  onDelete,
  onQuantityChange,
}: {
  item: PantryItem;
  onEdit: () => void;
  onDelete: () => void;
  onQuantityChange: (delta: number) => void;
}) {
  const expirationStatus = getExpirationStatus(item.expirationDate);
  const isLowStock = item.lowStockThreshold && item.quantity <= item.lowStockThreshold;

  return (
    <div className={`pantry-card ${expirationStatus || ''} ${isLowStock ? 'low-stock' : ''}`}>
      <div className="card-header">
        <span className="item-name">{item.name}</span>
        {item.location && (
          <span className="location-badge" title={item.location}>
            {LOCATION_ICONS[item.location] || '📦'}
          </span>
        )}
      </div>

      <div className="card-body">
        <div className="quantity-display">
          <button className="qty-btn" onClick={() => onQuantityChange(-1)}>−</button>
          <span className="quantity">{item.quantity}</span>
          {item.unit && <span className="unit">{item.unit}</span>}
          <button className="qty-btn" onClick={() => onQuantityChange(1)}>+</button>
        </div>

        {item.expirationDate && (
          <div className={`expiration expiration-${expirationStatus}`}>
            {expirationStatus === 'expired' ? 'Expired' : `Exp: ${formatDate(item.expirationDate)}`}
          </div>
        )}

        {isLowStock && (
          <div className="low-stock-badge">Low Stock</div>
        )}
      </div>

      <div className="card-actions">
        <button className="edit-btn" onClick={onEdit}>Edit</button>
        <button className="delete-btn" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}

// List item component
function PantryListItem({
  item,
  onEdit,
  onDelete,
  onQuantityChange,
}: {
  item: PantryItem;
  onEdit: () => void;
  onDelete: () => void;
  onQuantityChange: (delta: number) => void;
}) {
  const expirationStatus = getExpirationStatus(item.expirationDate);
  const isLowStock = item.lowStockThreshold && item.quantity <= item.lowStockThreshold;

  return (
    <div className={`pantry-list-item ${expirationStatus || ''} ${isLowStock ? 'low-stock' : ''}`}>
      <div className="list-item-main">
        <span className="item-name">{item.name}</span>
        {item.category && <span className="category-tag">{item.category}</span>}
        {item.location && (
          <span className="location-tag">
            {LOCATION_ICONS[item.location] || '📦'} {item.location}
          </span>
        )}
      </div>

      <div className="list-item-details">
        <div className="quantity-controls">
          <button onClick={() => onQuantityChange(-1)}>−</button>
          <span>{item.quantity} {item.unit || ''}</span>
          <button onClick={() => onQuantityChange(1)}>+</button>
        </div>

        {item.expirationDate && (
          <span className={`expiration-tag expiration-${expirationStatus}`}>
            {expirationStatus === 'expired' ? 'Expired' : formatDate(item.expirationDate)}
          </span>
        )}

        {isLowStock && <span className="low-stock-tag">Low</span>}
      </div>

      <div className="list-item-actions">
        <button onClick={onEdit}>Edit</button>
        <button onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
