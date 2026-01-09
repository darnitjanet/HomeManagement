import { useState, useEffect } from 'react';
import { Trash2, Edit, DollarSign, MapPin, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { assetsApi } from '../../services/api';
import { AssetForm } from './AssetForm';
import './AssetsList.css';

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
  createdAt: string;
  updatedAt: string;
  tags?: AssetTag[];
}

interface Summary {
  totals: {
    totalPurchaseValue: number;
    totalCurrentValue: number;
    assetCount: number;
  };
  byCategory: Array<{ category: string; totalValue: number; count: number }>;
  byLocation: Array<{ location: string; totalValue: number; count: number }>;
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

function getWarrantyStatus(warrantyExpirationDate?: string): { status: 'active' | 'expiring' | 'expired' | null; daysRemaining: number | null } {
  if (!warrantyExpirationDate) return { status: null, daysRemaining: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiration = new Date(warrantyExpirationDate);
  expiration.setHours(0, 0, 0, 0);

  const diffTime = expiration.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return { status: 'expired', daysRemaining };
  if (daysRemaining <= 30) return { status: 'expiring', daysRemaining };
  return { status: 'active', daysRemaining };
}

export function AssetsList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tags, setTags] = useState<AssetTag[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');

  useEffect(() => {
    loadAssets();
    loadTags();
    loadSummary();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await assetsApi.getAllAssets();
      if (response.data.success) {
        setAssets(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await assetsApi.getAllTags();
      if (response.data.success) {
        setTags(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await assetsApi.getSummary();
      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      loadAssets();
      return;
    }

    setLoading(true);
    try {
      const response = await assetsApi.searchAssets(query);
      if (response.data.success) {
        setAssets(response.data.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    const filters: any = {};
    if (selectedCategory) filters.category = selectedCategory;
    if (selectedLocation) filters.location = selectedLocation;
    if (selectedCondition) filters.condition = selectedCondition;

    setLoading(true);
    try {
      const response = await assetsApi.filterAssets(filters);
      if (response.data.success) {
        setAssets(response.data.data);
      }
    } catch (error) {
      console.error('Filter failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLocation('');
    setSelectedCondition('');
    loadAssets();
  };

  const handleDeleteAsset = async (id: number) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      await assetsApi.deleteAsset(id);
      loadAssets();
      loadSummary();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const formatCurrency = (value?: number): string => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  useEffect(() => {
    if (selectedCategory || selectedLocation || selectedCondition) {
      handleFilter();
    }
  }, [selectedCategory, selectedLocation, selectedCondition]);

  if (loading && assets.length === 0) {
    return (
      <div className="assets-loading">
        <div className="loading-spinner"></div>
        <p>Loading assets...</p>
      </div>
    );
  }

  return (
    <div className="assets-page">
      <div className="assets-banner">
        <img src="/HomeAssets.png" alt="Home Assets" />
      </div>

      <div className="assets-header">
        <h1>Home Inventory</h1>
        <button className="primary" onClick={() => setShowAddForm(true)}>
          + Add Asset
        </button>
      </div>

      {summary && (
        <div className="assets-summary">
          <div className="summary-card">
            <div className="summary-label">Total Items</div>
            <div className="summary-value">{summary.totals.assetCount}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Purchase Value</div>
            <div className="summary-value">{formatCurrency(summary.totals.totalPurchaseValue)}</div>
          </div>
          <div className="summary-card highlight">
            <div className="summary-label">Current Value</div>
            <div className="summary-value">{formatCurrency(summary.totals.totalCurrentValue)}</div>
          </div>
        </div>
      )}

      <div className="assets-filters">
        <input
          type="text"
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />

        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
          <option value="">All Locations</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>

        <select value={selectedCondition} onChange={(e) => setSelectedCondition(e.target.value)}>
          <option value="">All Conditions</option>
          {CONDITIONS.map((cond) => (
            <option key={cond} value={cond}>
              {cond}
            </option>
          ))}
        </select>

        <button onClick={handleClearFilters} className="clear-filters">
          Clear Filters
        </button>
      </div>

      <div className="results-count">{assets.length} item{assets.length !== 1 ? 's' : ''}</div>

      {error && <div className="error-message">{error}</div>}

      <div className="assets-grid">
        {assets.map((asset) => (
          <div key={asset.id} className="asset-card">
            <div className="asset-card-header">
              <h3 className="asset-name">{asset.name}</h3>
              <div className="asset-actions">
                <button
                  onClick={() => {
                    setEditingAsset(asset);
                    setShowAddForm(true);
                  }}
                  className="icon-btn edit-btn"
                  title="Edit"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="icon-btn delete-btn"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {(asset.brand || asset.model) && (
              <div className="asset-subtitle">
                {asset.brand}
                {asset.brand && asset.model && ' '}
                {asset.model}
              </div>
            )}

            <div className="asset-badges">
              {asset.category && <span className="badge category-badge">{asset.category}</span>}
              {asset.condition && (
                <span className={`badge condition-badge ${asset.condition.toLowerCase()}`}>
                  {asset.condition}
                </span>
              )}
              {(() => {
                const warranty = getWarrantyStatus(asset.warrantyExpirationDate);
                if (!warranty.status) return null;
                return (
                  <span className={`badge warranty-badge warranty-${warranty.status}`}>
                    {warranty.status === 'active' && <ShieldCheck size={12} />}
                    {warranty.status === 'expiring' && <ShieldAlert size={12} />}
                    {warranty.status === 'expired' && <ShieldX size={12} />}
                    {warranty.status === 'active' && 'Warranty Active'}
                    {warranty.status === 'expiring' && `Expires in ${warranty.daysRemaining}d`}
                    {warranty.status === 'expired' && 'Warranty Expired'}
                  </span>
                );
              })()}
            </div>

            <div className="asset-meta">
              {asset.location && (
                <div className="meta-item">
                  <MapPin size={14} />
                  <span>{asset.location}</span>
                </div>
              )}
              {asset.currentValue && (
                <div className="meta-item value">
                  <DollarSign size={14} />
                  <span>{formatCurrency(asset.currentValue)}</span>
                </div>
              )}
            </div>

            {asset.tags && asset.tags.length > 0 && (
              <div className="asset-tags">
                {asset.tags.map((tag) => (
                  <span key={tag.id} className="tag-badge" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {assets.length === 0 && !loading && (
        <div className="no-assets">
          <p>No assets found. Add your first item to start tracking your home inventory!</p>
        </div>
      )}

      {showAddForm && (
        <AssetForm
          onClose={() => {
            setShowAddForm(false);
            setEditingAsset(null);
          }}
          onSave={() => {
            setShowAddForm(false);
            setEditingAsset(null);
            loadAssets();
            loadSummary();
          }}
          asset={editingAsset}
          tags={tags}
        />
      )}
    </div>
  );
}
