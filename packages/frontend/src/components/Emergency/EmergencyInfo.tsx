import { useState, useEffect } from 'react';
import { X, Phone, Mail, MapPin, AlertTriangle, User, FileText, Heart, Shield, Home } from 'lucide-react';
import { emergencyApi } from '../../services/api';
import './EmergencyInfo.css';

interface EmergencyInfoProps {
  onClose: () => void;
}

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

const CATEGORY_ICONS: Record<string, any> = {
  medical: Heart,
  home: Home,
  insurance: Shield,
  other: FileText,
};

const CATEGORY_COLORS: Record<string, string> = {
  medical: '#ef4444',
  home: '#5b768a',
  insurance: '#dc9e33',
  other: '#6b7280',
};

export function EmergencyInfo({ onClose }: EmergencyInfoProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [info, setInfo] = useState<EmergencyInfoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contacts' | 'info'>('contacts');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
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
    } catch (error) {
      console.error('Failed to load emergency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupedInfo = info.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, EmergencyInfoItem[]>);

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/[^0-9+]/g, '')}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  if (loading) {
    return (
      <div className="emergency-modal-overlay" onClick={onClose}>
        <div className="emergency-modal" onClick={(e) => e.stopPropagation()}>
          <div className="emergency-loading">Loading emergency info...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="emergency-modal-overlay" onClick={onClose}>
      <div className="emergency-modal" onClick={(e) => e.stopPropagation()}>
        <div className="emergency-header">
          <div className="emergency-title">
            <AlertTriangle size={28} />
            <h2>Emergency Information</h2>
          </div>
          <button className="emergency-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="emergency-tabs">
          <button
            className={`emergency-tab ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            <User size={20} />
            Contacts
          </button>
          <button
            className={`emergency-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <FileText size={20} />
            Important Info
          </button>
        </div>

        <div className="emergency-content">
          {activeTab === 'contacts' && (
            <div className="emergency-contacts">
              {contacts.length === 0 ? (
                <div className="no-data">No emergency contacts added yet.</div>
              ) : (
                contacts.map((contact) => (
                  <div key={contact.id} className="contact-card">
                    <div className="contact-header">
                      <h3>{contact.name}</h3>
                      {contact.relationship && (
                        <span className="contact-relationship">{contact.relationship}</span>
                      )}
                    </div>

                    <div className="contact-actions">
                      {contact.phone && (
                        <button
                          className="contact-action-btn primary"
                          onClick={() => handleCall(contact.phone!)}
                        >
                          <Phone size={20} />
                          <span>{contact.phone}</span>
                        </button>
                      )}
                      {contact.phone_secondary && (
                        <button
                          className="contact-action-btn secondary"
                          onClick={() => handleCall(contact.phone_secondary!)}
                        >
                          <Phone size={18} />
                          <span>{contact.phone_secondary}</span>
                        </button>
                      )}
                      {contact.email && (
                        <button
                          className="contact-action-btn email"
                          onClick={() => handleEmail(contact.email!)}
                        >
                          <Mail size={18} />
                          <span>{contact.email}</span>
                        </button>
                      )}
                    </div>

                    {contact.address && (
                      <div className="contact-address">
                        <MapPin size={16} />
                        <span>{contact.address}</span>
                      </div>
                    )}

                    {contact.notes && (
                      <div className="contact-notes">{contact.notes}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="emergency-info-list">
              {Object.keys(groupedInfo).length === 0 ? (
                <div className="no-data">No emergency info added yet.</div>
              ) : (
                Object.entries(groupedInfo).map(([category, items]) => {
                  const CategoryIcon = CATEGORY_ICONS[category] || FileText;
                  const categoryColor = CATEGORY_COLORS[category] || '#6b7280';

                  return (
                    <div key={category} className="info-category">
                      <div
                        className="category-header"
                        style={{ borderLeftColor: categoryColor }}
                      >
                        <CategoryIcon size={20} style={{ color: categoryColor }} />
                        <h3>{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                      </div>

                      <div className="info-items">
                        {items.map((item) => (
                          <div key={item.id} className="info-item">
                            <div className="info-label">{item.label}</div>
                            <div className="info-value">{item.value}</div>
                            {item.notes && (
                              <div className="info-notes">{item.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="emergency-footer">
          <div className="emergency-911">
            <AlertTriangle size={20} />
            <span>For life-threatening emergencies, always call <strong>911</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
