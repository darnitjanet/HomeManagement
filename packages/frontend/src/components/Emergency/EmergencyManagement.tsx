import { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, X, Check, Phone, Mail, MapPin, User, FileText, Heart, Shield, Home } from 'lucide-react';
import { emergencyApi } from '../../services/api';
import './EmergencyManagement.css';

interface EmergencyContact {
  id: number;
  name: string;
  relationship: string | null;
  phone: string | null;
  phone_secondary: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  priority: number;
}

interface EmergencyInfoItem {
  id: number;
  category: string;
  label: string;
  value: string;
  notes: string | null;
  priority: number;
}

const INFO_CATEGORIES = [
  { value: 'medical', label: 'Medical', icon: Heart },
  { value: 'home', label: 'Home', icon: Home },
  { value: 'insurance', label: 'Insurance', icon: Shield },
  { value: 'other', label: 'Other', icon: FileText },
];

const CATEGORY_COLORS: Record<string, string> = {
  medical: '#ef4444',
  home: '#5b768a',
  insurance: '#dc9e33',
  other: '#6b7280',
};

export function EmergencyManagement() {
  const [activeTab, setActiveTab] = useState<'contacts' | 'info'>('contacts');
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [info, setInfo] = useState<EmergencyInfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    relationship: '',
    phone: '',
    phone_secondary: '',
    email: '',
    address: '',
    notes: '',
  });

  // Info form
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [editingInfo, setEditingInfo] = useState<EmergencyInfoItem | null>(null);
  const [infoForm, setInfoForm] = useState({
    category: 'medical',
    label: '',
    value: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [contactsRes, infoRes] = await Promise.all([
        emergencyApi.getAllContacts(),
        emergencyApi.getAllInfo(),
      ]);

      if (contactsRes.data.success) {
        setContacts(contactsRes.data.data);
      }
      if (infoRes.data.success) {
        setInfo(infoRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Contact handlers
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim()) return;

    try {
      if (editingContact) {
        await emergencyApi.updateContact(editingContact.id, contactForm);
      } else {
        await emergencyApi.createContact(contactForm);
      }
      closeContactForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save contact');
    }
  };

  const handleEditContact = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      relationship: contact.relationship || '',
      phone: contact.phone || '',
      phone_secondary: contact.phone_secondary || '',
      email: contact.email || '',
      address: contact.address || '',
      notes: contact.notes || '',
    });
    setShowContactForm(true);
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await emergencyApi.deleteContact(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete contact');
    }
  };

  const closeContactForm = () => {
    setShowContactForm(false);
    setEditingContact(null);
    setContactForm({
      name: '',
      relationship: '',
      phone: '',
      phone_secondary: '',
      email: '',
      address: '',
      notes: '',
    });
  };

  // Info handlers
  const handleInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!infoForm.label.trim() || !infoForm.value.trim()) return;

    try {
      if (editingInfo) {
        await emergencyApi.updateInfo(editingInfo.id, infoForm);
      } else {
        await emergencyApi.createInfo(infoForm);
      }
      closeInfoForm();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save info');
    }
  };

  const handleEditInfo = (item: EmergencyInfoItem) => {
    setEditingInfo(item);
    setInfoForm({
      category: item.category,
      label: item.label,
      value: item.value,
      notes: item.notes || '',
    });
    setShowInfoForm(true);
  };

  const handleDeleteInfo = async (id: number) => {
    if (!confirm('Are you sure you want to delete this info?')) return;

    try {
      await emergencyApi.deleteInfo(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete info');
    }
  };

  const closeInfoForm = () => {
    setShowInfoForm(false);
    setEditingInfo(null);
    setInfoForm({
      category: 'medical',
      label: '',
      value: '',
      notes: '',
    });
  };

  const groupedInfo = info.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, EmergencyInfoItem[]>);

  if (loading) {
    return (
      <div className="emergency-management">
        <div className="loading-state">Loading emergency info...</div>
      </div>
    );
  }

  return (
    <div className="emergency-management">
      <div className="em-banner">
        <img src="/EmergencyInformation.png" alt="Emergency Information" />
      </div>

      <div className="em-tabs">
        <button
          className={`em-tab ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
        >
          <User size={20} />
          Emergency Contacts
        </button>
        <button
          className={`em-tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <FileText size={20} />
          Important Info
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {activeTab === 'contacts' && (
        <div className="em-section">
          <div className="section-header">
            <h2>Emergency Contacts</h2>
            <button className="add-btn" onClick={() => setShowContactForm(true)}>
              <Plus size={20} />
              Add Contact
            </button>
          </div>

          <div className="contacts-grid">
            {contacts.length === 0 ? (
              <div className="no-data">
                <User size={48} />
                <p>No emergency contacts added yet</p>
              </div>
            ) : (
              contacts.map((contact) => (
                <div key={contact.id} className="contact-card">
                  <div className="contact-card-header">
                    <div className="contact-name-section">
                      <h3>{contact.name}</h3>
                      {contact.relationship && (
                        <span className="relationship-badge">{contact.relationship}</span>
                      )}
                    </div>
                    <div className="card-actions">
                      <button
                        className="action-btn edit"
                        onClick={() => handleEditContact(contact)}
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="contact-details">
                    {contact.phone && (
                      <div className="detail-row">
                        <Phone size={16} />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.phone_secondary && (
                      <div className="detail-row secondary">
                        <Phone size={16} />
                        <span>{contact.phone_secondary}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="detail-row">
                        <Mail size={16} />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.address && (
                      <div className="detail-row">
                        <MapPin size={16} />
                        <span>{contact.address}</span>
                      </div>
                    )}
                  </div>

                  {contact.notes && (
                    <div className="contact-notes">{contact.notes}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'info' && (
        <div className="em-section">
          <div className="section-header">
            <h2>Important Information</h2>
            <button className="add-btn" onClick={() => setShowInfoForm(true)}>
              <Plus size={20} />
              Add Info
            </button>
          </div>

          {Object.keys(groupedInfo).length === 0 ? (
            <div className="no-data">
              <FileText size={48} />
              <p>No emergency info added yet</p>
            </div>
          ) : (
            <div className="info-categories">
              {Object.entries(groupedInfo).map(([category, items]) => {
                const catInfo = INFO_CATEGORIES.find((c) => c.value === category);
                const CategoryIcon = catInfo?.icon || FileText;
                const categoryColor = CATEGORY_COLORS[category] || '#6b7280';

                return (
                  <div key={category} className="info-category-section">
                    <div
                      className="category-title"
                      style={{ borderLeftColor: categoryColor }}
                    >
                      <CategoryIcon size={20} style={{ color: categoryColor }} />
                      <h3>{catInfo?.label || category}</h3>
                    </div>

                    <div className="info-items-grid">
                      {items.map((item) => (
                        <div key={item.id} className="info-card">
                          <div className="info-card-content">
                            <div className="info-label">{item.label}</div>
                            <div className="info-value">{item.value}</div>
                            {item.notes && (
                              <div className="info-notes">{item.notes}</div>
                            )}
                          </div>
                          <div className="card-actions">
                            <button
                              className="action-btn edit"
                              onClick={() => handleEditInfo(item)}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => handleDeleteInfo(item.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="form-overlay" onClick={closeContactForm}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingContact ? 'Edit Contact' : 'Add Emergency Contact'}</h2>
              <button className="close-btn" onClick={closeContactForm}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleContactSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  placeholder="Contact name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Relationship</label>
                  <input
                    type="text"
                    value={contactForm.relationship}
                    onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
                    placeholder="e.g., Parent, Doctor, Neighbor"
                  />
                </div>
                <div className="form-group">
                  <label>Primary Phone</label>
                  <input
                    type="tel"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Secondary Phone</label>
                  <input
                    type="tel"
                    value={contactForm.phone_secondary}
                    onChange={(e) => setContactForm({ ...contactForm, phone_secondary: e.target.value })}
                    placeholder="(555) 987-6543"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={contactForm.address}
                  onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  placeholder="Full address"
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeContactForm}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  <Check size={18} />
                  {editingContact ? 'Update' : 'Add'} Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Info Form Modal */}
      {showInfoForm && (
        <div className="form-overlay" onClick={closeInfoForm}>
          <div className="form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>{editingInfo ? 'Edit Info' : 'Add Emergency Info'}</h2>
              <button className="close-btn" onClick={closeInfoForm}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleInfoSubmit}>
              <div className="form-group">
                <label>Category *</label>
                <select
                  value={infoForm.category}
                  onChange={(e) => setInfoForm({ ...infoForm, category: e.target.value })}
                >
                  {INFO_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Label *</label>
                <input
                  type="text"
                  value={infoForm.label}
                  onChange={(e) => setInfoForm({ ...infoForm, label: e.target.value })}
                  placeholder="e.g., Home Address, Insurance Policy #"
                  required
                />
              </div>

              <div className="form-group">
                <label>Value *</label>
                <textarea
                  value={infoForm.value}
                  onChange={(e) => setInfoForm({ ...infoForm, value: e.target.value })}
                  placeholder="The actual information"
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  value={infoForm.notes}
                  onChange={(e) => setInfoForm({ ...infoForm, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={closeInfoForm}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  <Check size={18} />
                  {editingInfo ? 'Update' : 'Add'} Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
