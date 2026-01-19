import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Archive, ExternalLink, Package, Truck, X, Check, Mail, Loader2 } from 'lucide-react';
import { packagesApi, gmailApi } from '../../services/api';
import './Packages.css';

interface PackageItem {
  id: number;
  name: string;
  tracking_number: string | null;
  carrier: string | null;
  carrier_url: string | null;
  status: string;
  order_date: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  order_number: string | null;
  vendor: string | null;
  cost: number | null;
  notes: string | null;
  notify_on_delivery: boolean;
  is_archived: boolean;
  tracking_url: string | null;
}

interface PackageStats {
  total: number;
  active: number;
  arriving_soon: number;
  delivered_this_month: number;
  by_status: Record<string, number>;
}

const CARRIERS = [
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'usps', label: 'USPS' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'dhl', label: 'DHL' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: 'ordered', label: 'Ordered' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'exception', label: 'Exception' },
];

const STATUS_COLORS: Record<string, string> = {
  ordered: '#dc9e33',
  shipped: '#5b768a',
  in_transit: '#5b768a',
  out_for_delivery: '#da6b34',
  delivered: '#5b768a',
  exception: '#dc2626',
};

export function PackagesList() {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [stats, setStats] = useState<PackageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'active' | 'delivered' | 'all'>('active');
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ imported: number; skipped: number } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    tracking_number: '',
    carrier: '',
    status: 'ordered',
    order_date: '',
    expected_delivery: '',
    order_number: '',
    vendor: '',
    cost: '',
    notes: '',
    notify_on_delivery: true,
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      let packagesRes;
      if (filter === 'active') {
        packagesRes = await packagesApi.getActive();
      } else if (filter === 'delivered') {
        packagesRes = await packagesApi.getArchived();
      } else {
        packagesRes = await packagesApi.getAll(true);
      }

      const statsRes = await packagesApi.getStats();

      if (packagesRes.data.success) {
        setPackages(packagesRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const data = {
        name: formData.name,
        tracking_number: formData.tracking_number || undefined,
        carrier: formData.carrier || undefined,
        status: formData.status,
        order_date: formData.order_date || undefined,
        expected_delivery: formData.expected_delivery || undefined,
        order_number: formData.order_number || undefined,
        vendor: formData.vendor || undefined,
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        notes: formData.notes || undefined,
        notify_on_delivery: formData.notify_on_delivery,
      };

      if (editingPackage) {
        await packagesApi.update(editingPackage.id, data);
      } else {
        await packagesApi.create(data);
      }

      closeForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save package');
    }
  };

  const handleEdit = (pkg: PackageItem) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      tracking_number: pkg.tracking_number || '',
      carrier: pkg.carrier || '',
      status: pkg.status,
      order_date: pkg.order_date || '',
      expected_delivery: pkg.expected_delivery || '',
      order_number: pkg.order_number || '',
      vendor: pkg.vendor || '',
      cost: pkg.cost?.toString() || '',
      notes: pkg.notes || '',
      notify_on_delivery: pkg.notify_on_delivery,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      await packagesApi.delete(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete package');
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await packagesApi.archive(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to archive package');
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await packagesApi.updateStatus(id, status);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSyncFromEmail = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError('');
    try {
      const res = await gmailApi.syncFromEmail(30);
      if (res.data.success) {
        setSyncResult({
          imported: res.data.data.imported,
          skipped: res.data.data.skipped,
        });
        loadData();
      } else {
        setError(res.data.message || 'Sync failed');
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Please connect your Google account to sync emails (Settings > Google Account)');
      } else {
        setError(err.response?.data?.message || 'Failed to sync from email');
      }
    } finally {
      setSyncing(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPackage(null);
    setFormData({
      name: '',
      tracking_number: '',
      carrier: '',
      status: 'ordered',
      order_date: '',
      expected_delivery: '',
      order_number: '',
      vendor: '',
      cost: '',
      notes: '',
      notify_on_delivery: true,
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  const getCarrierLabel = (carrier: string | null) => {
    if (!carrier) return null;
    return CARRIERS.find(c => c.value === carrier)?.label || carrier;
  };

  const getStatusLabel = (status: string) => {
    return STATUSES.find(s => s.value === status)?.label || status;
  };

  if (loading) {
    return (
      <div className="packages-list">
        <div className="loading-state">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="packages-list">
      <div className="pkg-banner">
        <img src="/PackageTracking.png" alt="Package Tracking" />
      </div>

      {stats && (
        <div className="pkg-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.arriving_soon}</div>
            <div className="stat-label">Arriving Soon</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.delivered_this_month}</div>
            <div className="stat-label">Delivered This Month</div>
          </div>
        </div>
      )}

      <div className="pkg-header">
        <div className="pkg-filters">
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active
          </button>
          <button
            className={`filter-btn ${filter === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilter('delivered')}
          >
            Delivered
          </button>
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
        </div>
        <div className="pkg-actions">
          <button
            className="sync-btn"
            onClick={handleSyncFromEmail}
            disabled={syncing}
          >
            {syncing ? (
              <>
                <Loader2 size={18} className="spinning" />
                Syncing...
              </>
            ) : (
              <>
                <Mail size={18} />
                Sync from Email
              </>
            )}
          </button>
          <button className="add-btn" onClick={() => setShowForm(true)}>
            <Plus size={20} />
            Add Package
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="sync-result">
          Imported {syncResult.imported} package{syncResult.imported !== 1 ? 's' : ''} from email
          {syncResult.skipped > 0 && ` (${syncResult.skipped} already tracked)`}
          <button onClick={() => setSyncResult(null)} className="dismiss-btn">
            <X size={16} />
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {packages.length === 0 ? (
        <div className="no-packages">
          <Package size={48} />
          <p>No packages to display</p>
          <span>Add a package to start tracking deliveries</span>
        </div>
      ) : (
        <div className="packages-grid">
          {packages.map(pkg => (
            <div key={pkg.id} className={`package-card ${pkg.is_archived ? 'archived' : ''}`}>
              <div className="package-header">
                <div className="package-info">
                  <h3>{pkg.name}</h3>
                  {pkg.vendor && <span className="vendor">{pkg.vendor}</span>}
                </div>
                <span
                  className="status-badge"
                  style={{ backgroundColor: STATUS_COLORS[pkg.status] || '#6b7280' }}
                >
                  {getStatusLabel(pkg.status)}
                </span>
              </div>

              <div className="package-details">
                {pkg.carrier && (
                  <div className="detail-row">
                    <Truck size={16} />
                    <span>{getCarrierLabel(pkg.carrier)}</span>
                  </div>
                )}
                {pkg.tracking_number && (
                  <div className="detail-row tracking">
                    <span className="tracking-number">{pkg.tracking_number}</span>
                    {pkg.tracking_url && (
                      <a
                        href={pkg.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="track-link"
                      >
                        <ExternalLink size={16} />
                        Track
                      </a>
                    )}
                  </div>
                )}
                {pkg.expected_delivery && (
                  <div className="detail-row">
                    <span className="label">Expected:</span>
                    <span>{formatDate(pkg.expected_delivery)}</span>
                  </div>
                )}
                {pkg.actual_delivery && (
                  <div className="detail-row">
                    <span className="label">Delivered:</span>
                    <span>{formatDate(pkg.actual_delivery)}</span>
                  </div>
                )}
                {pkg.cost && (
                  <div className="detail-row">
                    <span className="label">Cost:</span>
                    <span>${pkg.cost.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {pkg.notes && <div className="package-notes">{pkg.notes}</div>}

              {!pkg.is_archived && pkg.status !== 'delivered' && (
                <div className="status-select">
                  <select
                    value={pkg.status}
                    onChange={(e) => handleStatusChange(pkg.id, e.target.value)}
                  >
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="package-actions">
                <button
                  className="action-btn edit"
                  onClick={() => handleEdit(pkg)}
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                {!pkg.is_archived && pkg.status === 'delivered' && (
                  <button
                    className="action-btn archive"
                    onClick={() => handleArchive(pkg.id)}
                    title="Archive"
                  >
                    <Archive size={18} />
                  </button>
                )}
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(pkg.id)}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="form-overlay" onClick={closeForm}>
          <div className="form-modal" onClick={e => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingPackage ? 'Edit Package' : 'Add Package'}</h2>
              <button className="close-btn" onClick={closeForm}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Package Description *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="What's in the package?"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Carrier</label>
                  <select
                    value={formData.carrier}
                    onChange={e => setFormData({ ...formData, carrier: e.target.value })}
                  >
                    <option value="">Select carrier...</option>
                    {CARRIERS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUSES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Tracking Number</label>
                <input
                  type="text"
                  value={formData.tracking_number}
                  onChange={e => setFormData({ ...formData, tracking_number: e.target.value })}
                  placeholder="Enter tracking number"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Order Date</label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={e => setFormData({ ...formData, order_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Expected Delivery</label>
                  <input
                    type="date"
                    value={formData.expected_delivery}
                    onChange={e => setFormData({ ...formData, expected_delivery: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Vendor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="e.g., Amazon, Target"
                  />
                </div>
                <div className="form-group">
                  <label>Order Number</label>
                  <input
                    type="text"
                    value={formData.order_number}
                    onChange={e => setFormData({ ...formData, order_number: e.target.value })}
                    placeholder="Store order #"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Cost</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.notify_on_delivery}
                    onChange={e => setFormData({ ...formData, notify_on_delivery: e.target.checked })}
                  />
                  Notify me when package is arriving
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={!formData.name.trim()}>
                  <Check size={18} />
                  {editingPackage ? 'Update' : 'Add'} Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
