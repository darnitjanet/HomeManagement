import { useState } from 'react';
import { X, ScanBarcode } from 'lucide-react';
import { pantryApi } from '../../services/api';
import { BarcodeScanner } from './BarcodeScanner';

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
}

interface Constants {
  categories: string[];
  locations: string[];
  units: string[];
}

interface PantryItemFormProps {
  item: PantryItem | null;
  constants: Constants | null;
  onClose: () => void;
  onSave: () => void;
}

export function PantryItemForm({ item, constants, onClose, onSave }: PantryItemFormProps) {
  const [name, setName] = useState(item?.name || '');
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '1');
  const [unit, setUnit] = useState(item?.unit || '');
  const [category, setCategory] = useState(item?.category || '');
  const [location, setLocation] = useState(item?.location || '');
  const [expirationDate, setExpirationDate] = useState(item?.expirationDate || '');
  const [purchaseDate, setPurchaseDate] = useState(item?.purchaseDate || '');
  const [lowStockThreshold, setLowStockThreshold] = useState(item?.lowStockThreshold?.toString() || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleProductFound = (product: {
    name: string;
    brand: string | null;
    category: string | null;
    quantity: string | null;
  }) => {
    // Build name with brand if available
    const productName = product.brand
      ? `${product.brand} ${product.name}`
      : product.name;
    setName(productName);

    if (product.category) {
      setCategory(product.category);
    }

    // Try to extract quantity info
    if (product.quantity) {
      setNotes(prev => prev ? `${prev}\nSize: ${product.quantity}` : `Size: ${product.quantity}`);
    }

    setShowScanner(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const data = {
        name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit: unit || undefined,
        category: category || undefined,
        location: location || undefined,
        expirationDate: expirationDate || undefined,
        purchaseDate: purchaseDate || undefined,
        lowStockThreshold: lowStockThreshold ? parseFloat(lowStockThreshold) : undefined,
        notes: notes || undefined,
      };

      if (item) {
        await pantryApi.updateItem(item.id, data);
      } else {
        await pantryApi.createItem(data);
      }

      onSave();
    } catch (err) {
      console.error('Failed to save item:', err);
      setError('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pantry-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{item ? 'Edit Item' : 'Add Pantry Item'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          {/* Barcode scanner button - only show when adding new items */}
          {!item && (
            <button
              type="button"
              className="scan-barcode-btn"
              onClick={() => setShowScanner(true)}
            >
              <ScanBarcode size={18} /> Scan Barcode
            </button>
          )}

          <div className="form-group">
            <label>Item Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Milk, Eggs, Rice..."
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Unit</label>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="">Select unit</option>
                {constants?.units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Auto-detect</option>
                {constants?.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Storage Location</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="">Select location</option>
                {constants?.locations.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Expiration Date</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Purchase Date</label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Low Stock Alert (notify when below this amount)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Brand, variety, or other details..."
              rows={2}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving...' : item ? 'Update' : 'Add Item'}
            </button>
          </div>
        </form>

        {showScanner && (
          <BarcodeScanner
            onProductFound={handleProductFound}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </div>
  );
}
