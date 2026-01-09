import { useState, useEffect, useRef } from 'react';
import { X, Check, Package, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { travelApi } from '../../services/api';

interface PackingItem {
  id: number;
  tripId: number;
  name: string;
  category: string | null;
  quantity: number;
  packed: boolean;
  sortOrder: number;
  assignee: string | null;
}

interface Trip {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
}

interface PackingListProps {
  trip: Trip;
  onClose: () => void;
}

// Default packing list template
const DEFAULT_PACKING_ITEMS = [
  // Clothing
  { name: 'Underwear', category: 'Clothing' },
  { name: 'Socks', category: 'Clothing' },
  { name: 'T-shirts', category: 'Clothing' },
  { name: 'Pants/Shorts', category: 'Clothing' },
  { name: 'Pajamas', category: 'Clothing' },
  { name: 'Swimsuit', category: 'Clothing' },
  { name: 'Light jacket', category: 'Clothing' },
  { name: 'Dress clothes', category: 'Clothing' },
  { name: 'Comfortable shoes', category: 'Clothing' },
  { name: 'Sandals/flip-flops', category: 'Clothing' },

  // Toiletries
  { name: 'Toothbrush', category: 'Toiletries' },
  { name: 'Toothpaste', category: 'Toiletries' },
  { name: 'Deodorant', category: 'Toiletries' },
  { name: 'Shampoo', category: 'Toiletries' },
  { name: 'Conditioner', category: 'Toiletries' },
  { name: 'Body wash', category: 'Toiletries' },
  { name: 'Razor', category: 'Toiletries' },
  { name: 'Sunscreen', category: 'Toiletries' },
  { name: 'Lip balm', category: 'Toiletries' },
  { name: 'Hair brush/comb', category: 'Toiletries' },
  { name: 'Makeup', category: 'Toiletries' },

  // Electronics
  { name: 'Phone charger', category: 'Electronics' },
  { name: 'Camera', category: 'Electronics' },
  { name: 'Headphones', category: 'Electronics' },
  { name: 'Power bank', category: 'Electronics' },
  { name: 'Laptop/tablet', category: 'Electronics' },
  { name: 'Adapters/converters', category: 'Electronics' },

  // Documents
  { name: 'Passport', category: 'Documents' },
  { name: 'ID/Driver\'s license', category: 'Documents' },
  { name: 'Travel insurance', category: 'Documents' },
  { name: 'Flight tickets', category: 'Documents' },
  { name: 'Hotel confirmations', category: 'Documents' },
  { name: 'Credit cards', category: 'Documents' },
  { name: 'Cash', category: 'Documents' },

  // Medicine/Health
  { name: 'Prescription medications', category: 'Medicine' },
  { name: 'Pain reliever', category: 'Medicine' },
  { name: 'Allergy medicine', category: 'Medicine' },
  { name: 'Band-aids', category: 'Medicine' },
  { name: 'Hand sanitizer', category: 'Medicine' },
  { name: 'Vitamins', category: 'Medicine' },

  // Miscellaneous
  { name: 'Travel pillow', category: 'Miscellaneous' },
  { name: 'Earplugs', category: 'Miscellaneous' },
  { name: 'Snacks', category: 'Miscellaneous' },
  { name: 'Water bottle', category: 'Miscellaneous' },
  { name: 'Books/entertainment', category: 'Miscellaneous' },
  { name: 'Umbrella', category: 'Miscellaneous' },
];

const CATEGORY_ORDER = ['Clothing', 'Toiletries', 'Electronics', 'Documents', 'Medicine', 'Miscellaneous'];

export function PackingList({ trip, onClose }: PackingListProps) {
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));
  const [progress, setProgress] = useState({ total: 0, packed: 0 });
  const isPopulating = useRef(false);

  useEffect(() => {
    loadItems();
  }, [trip.id]);

  const loadItems = async () => {
    try {
      const response = await travelApi.getPackingItems(trip.id);
      if (response.data.success) {
        const loadedItems = response.data.data;
        if (loadedItems.length === 0 && !isPopulating.current) {
          // Auto-populate with default items (only once)
          await populateDefaultItems();
        } else {
          setItems(loadedItems);
          updateProgress(loadedItems);
        }
      }
    } catch (error) {
      console.error('Failed to load packing items:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateDefaultItems = async () => {
    if (isPopulating.current) return; // Prevent duplicate calls
    isPopulating.current = true;
    try {
      await travelApi.createPackingItems(trip.id, DEFAULT_PACKING_ITEMS);
      const response = await travelApi.getPackingItems(trip.id);
      if (response.data.success) {
        setItems(response.data.data);
        updateProgress(response.data.data);
      }
    } catch (error) {
      console.error('Failed to populate default items:', error);
    }
  };

  const updateProgress = (itemList: PackingItem[]) => {
    const total = itemList.length;
    const packed = itemList.filter(i => i.packed).length;
    setProgress({ total, packed });
  };

  const handleToggleItem = async (id: number) => {
    try {
      await travelApi.togglePackingItem(id);
      // Optimistically update UI
      setItems(prev => {
        const updated = prev.map(item =>
          item.id === id ? { ...item, packed: !item.packed } : item
        );
        updateProgress(updated);
        return updated;
      });
    } catch (error) {
      console.error('Failed to toggle item:', error);
      loadItems(); // Reload on error
    }
  };

  const handleResetList = async () => {
    if (!confirm('Reset all items to unpacked?')) return;
    try {
      // Unpack all items
      for (const item of items) {
        if (item.packed) {
          await travelApi.updatePackingItem(item.id, { packed: false });
        }
      }
      loadItems();
    } catch (error) {
      console.error('Failed to reset list:', error);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Group items by category in order
  const itemsByCategory: Record<string, PackingItem[]> = {};
  CATEGORY_ORDER.forEach(cat => {
    itemsByCategory[cat] = [];
  });
  items.forEach(item => {
    const category = item.category || 'Miscellaneous';
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = [];
    }
    itemsByCategory[category].push(item);
  });

  const progressPercent = progress.total > 0 ? Math.round((progress.packed / progress.total) * 100) : 0;

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="packing-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-loading">Loading packing list...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="packing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="packing-header-info">
            <h2>
              <Package size={24} />
              Packing List
            </h2>
            <span className="trip-name">{trip.name}</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="packing-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="progress-row">
            <span className="progress-text">
              {progress.packed} / {progress.total} packed ({progressPercent}%)
            </span>
            {progress.packed > 0 && (
              <button className="reset-btn" onClick={handleResetList}>
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Items List by Category */}
        <div className="packing-items">
          {CATEGORY_ORDER.map((category) => {
            const categoryItems = itemsByCategory[category] || [];
            if (categoryItems.length === 0) return null;

            const packedCount = categoryItems.filter(i => i.packed).length;
            const allPacked = packedCount === categoryItems.length;

            return (
              <div key={category} className="category-section">
                <button
                  className={`category-header ${allPacked ? 'all-packed' : ''}`}
                  onClick={() => toggleCategory(category)}
                >
                  {expandedCategories.has(category) ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronRight size={18} />
                  )}
                  <span className="category-name">{category}</span>
                  <span className="category-count">
                    {packedCount}/{categoryItems.length}
                  </span>
                </button>

                {expandedCategories.has(category) && (
                  <div className="category-items">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={`packing-item ${item.packed ? 'packed' : ''}`}
                        onClick={() => handleToggleItem(item.id)}
                      >
                        <div className="check-box">
                          {item.packed && <Check size={16} />}
                        </div>
                        <span className="item-name">{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
