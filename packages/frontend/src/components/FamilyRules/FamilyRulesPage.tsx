import { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, GripVertical, X, Check, BookOpen, Shield, Clock, Users } from 'lucide-react';
import { emergencyApi } from '../../services/api';
import './FamilyRulesPage.css';

interface FamilyRule {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  priority: number;
  is_active: boolean;
}

const RULE_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'screen_time', label: 'Screen Time', icon: Clock },
  { value: 'chores', label: 'Chores', icon: Users },
  { value: 'safety', label: 'Safety', icon: Shield },
  { value: 'behavior', label: 'Behavior', icon: BookOpen },
  { value: 'other', label: 'Other', icon: BookOpen },
];

const CATEGORY_COLORS: Record<string, string> = {
  screen_time: '#8b5cf6',
  chores: '#5b768a',
  safety: '#ef4444',
  behavior: '#dc9e33',
  other: '#6b7280',
};

export function FamilyRulesPage() {
  const [rules, setRules] = useState<FamilyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<FamilyRule | null>(null);
  const [filterCategory, setFilterCategory] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'behavior',
  });

  useEffect(() => {
    loadRules();
  }, [filterCategory]);

  const loadRules = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await emergencyApi.getAllRules(filterCategory || undefined);
      if (response.data.success) {
        setRules(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      if (editingRule) {
        await emergencyApi.updateRule(editingRule.id, formData);
      } else {
        await emergencyApi.createRule(formData);
      }
      setShowForm(false);
      setEditingRule(null);
      setFormData({ title: '', description: '', category: 'behavior' });
      loadRules();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save rule');
    }
  };

  const handleEdit = (rule: FamilyRule) => {
    setEditingRule(rule);
    setFormData({
      title: rule.title,
      description: rule.description || '',
      category: rule.category || 'behavior',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await emergencyApi.deleteRule(id);
      loadRules();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete rule');
    }
  };

  const handleReorder = async (dragIndex: number, dropIndex: number) => {
    if (dragIndex === dropIndex) return;

    const reorderedRules = [...rules];
    const [removed] = reorderedRules.splice(dragIndex, 1);
    reorderedRules.splice(dropIndex, 0, removed);

    setRules(reorderedRules);

    try {
      await emergencyApi.reorderRules(reorderedRules.map((r) => r.id));
    } catch (err) {
      console.error('Failed to reorder rules:', err);
      loadRules(); // Reload on error
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({ title: '', description: '', category: 'behavior' });
  };

  const getCategoryInfo = (category: string | null) => {
    const cat = RULE_CATEGORIES.find((c) => c.value === category);
    return cat || RULE_CATEGORIES[RULE_CATEGORIES.length - 1];
  };

  if (loading && rules.length === 0) {
    return (
      <div className="family-rules-page">
        <div className="loading-state">Loading family rules...</div>
      </div>
    );
  }

  return (
    <div className="family-rules-page">
      <div className="rules-banner">
        <img src="/FamilyRules.png" alt="Family Rules" />
      </div>

      <div className="rules-header">
        <button className="add-rule-btn" onClick={() => setShowForm(true)}>
          <Plus size={20} />
          Add Rule
        </button>
      </div>

      <div className="rules-filters">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="category-filter"
        >
          {RULE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="rules-list">
        {rules.length === 0 ? (
          <div className="no-rules">
            <BookOpen size={48} />
            <p>No family rules yet. Add your first rule!</p>
          </div>
        ) : (
          rules.map((rule, index) => {
            const categoryInfo = getCategoryInfo(rule.category);
            const CategoryIcon = categoryInfo.icon || BookOpen;
            const categoryColor = CATEGORY_COLORS[rule.category || 'other'] || '#6b7280';

            return (
              <div
                key={rule.id}
                className="rule-card"
                style={{ borderLeftColor: categoryColor }}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                  handleReorder(dragIndex, index);
                }}
              >
                <div className="rule-drag-handle">
                  <GripVertical size={20} />
                </div>

                <div className="rule-content">
                  <div className="rule-header">
                    <span
                      className="rule-category"
                      style={{ backgroundColor: categoryColor }}
                    >
                      <CategoryIcon size={14} />
                      {categoryInfo.label}
                    </span>
                    <span className="rule-number">#{index + 1}</span>
                  </div>

                  <h3 className="rule-title">{rule.title}</h3>

                  {rule.description && (
                    <p className="rule-description">{rule.description}</p>
                  )}
                </div>

                <div className="rule-actions">
                  <button
                    className="action-btn edit"
                    onClick={() => handleEdit(rule)}
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="action-btn delete"
                    onClick={() => handleDelete(rule.id)}
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="rule-form-overlay" onClick={closeForm}>
          <div className="rule-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingRule ? 'Edit Rule' : 'Add New Rule'}</h2>
              <button className="close-btn" onClick={closeForm}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Rule Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., No screens after 8pm"
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {RULE_CATEGORIES.slice(1).map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add more details about this rule..."
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  <Check size={18} />
                  {editingRule ? 'Update Rule' : 'Add Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
