import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { assetsApi } from '../../services/api';
import './AssetForm.css';

interface AssetTag {
  id: number;
  name: string;
  color: string;
  priority: number;
}

interface Asset {
  id: number;
  name: string;
  description?: string;
  category?: string;
  location?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  condition?: string;
  imageUrl?: string;
  receiptUrl?: string;
  notes?: string;
  warrantyExpirationDate?: string;
  warrantyProvider?: string;
  warrantyType?: string;
  warrantyDocumentUrl?: string;
  tags?: AssetTag[];
}

interface AssetFormProps {
  onClose: () => void;
  onSave: () => void;
  asset?: Asset | null;
  tags: AssetTag[];
}

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Appliances',
  'Jewelry',
  'Art',
  'Tools',
  'Sports & Outdoor',
  'Musical Instruments',
  'Collectibles',
  'Clothing',
  'Other',
];

const LOCATIONS = [
  'Living Room',
  'Kitchen',
  'Bedroom',
  'Bathroom',
  'Office',
  'Garage',
  'Basement',
  'Attic',
  'Outdoor',
  'Storage',
  'Other',
];

const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

const WARRANTY_TYPES = ['Manufacturer', 'Extended', 'Store Protection', 'Other'];

export function AssetForm({ onClose, onSave, asset, tags }: AssetFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [currentValue, setCurrentValue] = useState<number | ''>('');
  const [condition, setCondition] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [warrantyExpirationDate, setWarrantyExpirationDate] = useState('');
  const [warrantyProvider, setWarrantyProvider] = useState('');
  const [warrantyType, setWarrantyType] = useState('');
  const [warrantyDocumentUrl, setWarrantyDocumentUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (asset) {
      setName(asset.name);
      setDescription(asset.description || '');
      setCategory(asset.category || '');
      setLocation(asset.location || '');
      setBrand(asset.brand || '');
      setModel(asset.model || '');
      setSerialNumber(asset.serialNumber || '');
      setPurchasePrice(asset.purchasePrice || '');
      setPurchaseDate(asset.purchaseDate || '');
      setCurrentValue(asset.currentValue || '');
      setCondition(asset.condition || '');
      setImageUrl(asset.imageUrl || '');
      setReceiptUrl(asset.receiptUrl || '');
      setNotes(asset.notes || '');
      setWarrantyExpirationDate(asset.warrantyExpirationDate || '');
      setWarrantyProvider(asset.warrantyProvider || '');
      setWarrantyType(asset.warrantyType || '');
      setWarrantyDocumentUrl(asset.warrantyDocumentUrl || '');
      setSelectedTags(asset.tags?.map((t) => t.id) || []);
    }
  }, [asset]);

  const handleToggleTag = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((id) => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Asset name is required');
      return;
    }

    setSaving(true);

    try {
      const assetData = {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
        location: location || undefined,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        purchasePrice: purchasePrice || undefined,
        purchaseDate: purchaseDate || undefined,
        currentValue: currentValue || undefined,
        condition: condition || undefined,
        imageUrl: imageUrl.trim() || undefined,
        receiptUrl: receiptUrl.trim() || undefined,
        notes: notes.trim() || undefined,
        warrantyExpirationDate: warrantyExpirationDate || undefined,
        warrantyProvider: warrantyProvider.trim() || undefined,
        warrantyType: warrantyType || undefined,
        warrantyDocumentUrl: warrantyDocumentUrl.trim() || undefined,
        tags: selectedTags,
      };

      if (asset) {
        await assetsApi.updateAsset(asset.id, assetData);
      } else {
        await assetsApi.createAsset(assetData);
      }

      onSave();
    } catch (error: any) {
      console.error('Save asset error:', error);
      setError(error.response?.data?.message || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="asset-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{asset ? 'Edit Asset' : 'Add Asset'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-content">
            {error && <div className="form-error">{error}</div>}

            <div className="form-section">
              <h3>Basic Info</h3>

              <div className="form-group">
                <label htmlFor="name">Item Name *</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Samsung 65&quot; TV"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the item"
                  rows={2}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="location">Location</label>
                  <select id="location" value={location} onChange={(e) => setLocation(e.target.value)}>
                    <option value="">Select location</option>
                    {LOCATIONS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="condition">Condition</label>
                  <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
                    <option value="">Select condition</option>
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="brand">Brand</label>
                  <input
                    id="brand"
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g., Samsung"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="model">Model</label>
                  <input
                    id="model"
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g., QN65Q80T"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="serialNumber">Serial Number</label>
                <input
                  id="serialNumber"
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="For warranty/insurance claims"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Value & Purchase Info</h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="purchasePrice">Purchase Price ($)</label>
                  <input
                    id="purchasePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="currentValue">Current Value ($)</label>
                  <input
                    id="currentValue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="purchaseDate">Purchase Date</label>
                  <input
                    id="purchaseDate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Warranty Info</h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="warrantyExpirationDate">Warranty Expiration</label>
                  <input
                    id="warrantyExpirationDate"
                    type="date"
                    value={warrantyExpirationDate}
                    onChange={(e) => setWarrantyExpirationDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="warrantyType">Warranty Type</label>
                  <select
                    id="warrantyType"
                    value={warrantyType}
                    onChange={(e) => setWarrantyType(e.target.value)}
                  >
                    <option value="">Select type</option>
                    {WARRANTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="warrantyProvider">Warranty Provider</label>
                  <input
                    id="warrantyProvider"
                    type="text"
                    value={warrantyProvider}
                    onChange={(e) => setWarrantyProvider(e.target.value)}
                    placeholder="e.g., Samsung, Best Buy"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="warrantyDocumentUrl">Warranty Document URL</label>
                <input
                  id="warrantyDocumentUrl"
                  type="url"
                  value={warrantyDocumentUrl}
                  onChange={(e) => setWarrantyDocumentUrl(e.target.value)}
                  placeholder="https://... (link to warranty card/receipt)"
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Additional Info</h3>

              <div className="form-group">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="imageUrl">Image URL</label>
                  <input
                    id="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="receiptUrl">Receipt URL</label>
                  <input
                    id="receiptUrl"
                    type="url"
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {tags.length > 0 && (
              <div className="form-section">
                <h3>Tags</h3>
                <div className="tags-select">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`tag-option ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                      style={{
                        backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                        borderColor: tag.color,
                        color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                      }}
                      onClick={() => handleToggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saving...' : asset ? 'Update Asset' : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
