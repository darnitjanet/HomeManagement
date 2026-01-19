import { useState } from 'react';
import { Pencil, Star, Trash2, Cake } from 'lucide-react';
import { contactsApi } from '../../services/api';
import './ContactCard.css';

export interface Contact {
  id: number;
  googleContactId: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  emails?: Array<{ value: string; type?: string }>;
  phones?: Array<{ value: string; type?: string }>;
  photoUrl?: string;
  notes?: string;
  birthday?: string;
  isFavorite: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags?: ContactTag[];
}

export interface ContactTag {
  id: number;
  name: string;
  color: string;
  priority: number;
  createdAt: string;
}

interface ContactCardProps {
  contact: Contact;
  availableTags: ContactTag[];
  onUpdate: () => void;
}

export function ContactCard({ contact, availableTags, onUpdate }: ContactCardProps) {
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [notesValue, setNotesValue] = useState(contact.notes || '');

  // Edit form state
  const [editDisplayName, setEditDisplayName] = useState(contact.displayName);
  const [editGivenName, setEditGivenName] = useState(contact.givenName || '');
  const [editFamilyName, setEditFamilyName] = useState(contact.familyName || '');
  const [editEmail, setEditEmail] = useState(contact.emails?.[0]?.value || '');
  const [editPhone, setEditPhone] = useState(contact.phones?.[0]?.value || '');
  const [editNotes, setEditNotes] = useState(contact.notes || '');
  const [editBirthday, setEditBirthday] = useState(contact.birthday || '');

  const handleToggleFavorite = async () => {
    setIsUpdating(true);
    try {
      await contactsApi.toggleFavorite(contact.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddTag = async (tagId: number) => {
    setIsUpdating(true);
    try {
      await contactsApi.addTagToContact(contact.id, tagId);
      setShowTagMenu(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to add tag:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    setIsUpdating(true);
    try {
      await contactsApi.removeTagFromContact(contact.id, tagId);
      onUpdate();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsUpdating(true);
    try {
      await contactsApi.updateNotes(contact.id, notesValue);
      setIsEditingNotes(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update notes:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelNotes = () => {
    setNotesValue(contact.notes || '');
    setIsEditingNotes(false);
  };

  const handleDeleteContact = async () => {
    if (!window.confirm(`Are you sure you want to delete ${contact.displayName}?`)) {
      return;
    }

    setIsUpdating(true);
    try {
      await contactsApi.deleteContact(contact.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete contact:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveContact = async () => {
    if (!editDisplayName.trim()) {
      alert('Display name is required');
      return;
    }

    // Validate birthday format if provided
    if (editBirthday.trim() && !/^\d{2}-\d{2}$/.test(editBirthday.trim())) {
      alert('Birthday must be in MM-DD format (e.g., 03-15)');
      return;
    }

    setIsUpdating(true);
    try {
      const emails = editEmail.trim() ? [{ value: editEmail.trim() }] : [];
      const phones = editPhone.trim() ? [{ value: editPhone.trim() }] : [];

      await contactsApi.updateContact(contact.id, {
        displayName: editDisplayName.trim(),
        givenName: editGivenName.trim() || undefined,
        familyName: editFamilyName.trim() || undefined,
        emails,
        phones,
        notes: editNotes.trim() || undefined,
      });

      // Update birthday separately (it syncs to Google)
      if (editBirthday.trim() !== (contact.birthday || '')) {
        await contactsApi.updateBirthday(contact.id, editBirthday.trim() || null);
      }

      setIsEditingContact(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to update contact:', error);
      alert('Failed to update contact');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setEditDisplayName(contact.displayName);
    setEditGivenName(contact.givenName || '');
    setEditFamilyName(contact.familyName || '');
    setEditEmail(contact.emails?.[0]?.value || '');
    setEditPhone(contact.phones?.[0]?.value || '');
    setEditNotes(contact.notes || '');
    setEditBirthday(contact.birthday || '');
    setIsEditingContact(false);
  };

  // Filter out tags already on the contact
  const contactTagIds = contact.tags?.map(t => t.id) || [];
  const unassignedTags = availableTags.filter(t => !contactTagIds.includes(t.id));

  return (
    <div className="contact-card">
      <div className="contact-header">
        <div className="contact-photo">
          {contact.photoUrl ? (
            <img src={contact.photoUrl} alt={contact.displayName} />
          ) : (
            <div className="contact-initials">
              {contact.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="contact-info">
          <h3 className="contact-name">{contact.displayName}</h3>
          {contact.emails && contact.emails.length > 0 && (
            <div className="contact-email">{contact.emails[0].value}</div>
          )}
          {contact.phones && contact.phones.length > 0 && (
            <div className="contact-phone">{contact.phones[0].value}</div>
          )}
          {contact.birthday && (
            <div className="contact-birthday">
              <Cake size={14} />
              <span>{contact.birthday}</span>
            </div>
          )}
        </div>
      </div>

      {isEditingContact && (
        <div className="contact-edit-form">
          <h4>Edit Contact</h4>
          <input
            type="text"
            placeholder="Display Name *"
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
            disabled={isUpdating}
          />
          <div className="edit-name-row">
            <input
              type="text"
              placeholder="First Name"
              value={editGivenName}
              onChange={(e) => setEditGivenName(e.target.value)}
              disabled={isUpdating}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={editFamilyName}
              onChange={(e) => setEditFamilyName(e.target.value)}
              disabled={isUpdating}
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            disabled={isUpdating}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            disabled={isUpdating}
          />
          <input
            type="text"
            placeholder="Birthday (MM-DD)"
            value={editBirthday}
            onChange={(e) => setEditBirthday(e.target.value)}
            disabled={isUpdating}
          />
          <textarea
            placeholder="Notes"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            disabled={isUpdating}
            rows={3}
          />
          <div className="edit-actions">
            <button
              className="save-button"
              onClick={handleSaveContact}
              disabled={isUpdating || !editDisplayName.trim()}
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
            <button
              className="cancel-button"
              onClick={handleCancelEdit}
              disabled={isUpdating}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="contact-tags">
        {contact.tags && contact.tags.length > 0 && (
          <div className="tag-list">
            {contact.tags.map((tag) => (
              <span
                key={tag.id}
                className="tag"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
                <button
                  className="tag-remove"
                  onClick={() => handleRemoveTag(tag.id)}
                  disabled={isUpdating}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {unassignedTags.length > 0 && (
          <div className="tag-add-container">
            <button
              className="tag-add-button"
              onClick={() => setShowTagMenu(!showTagMenu)}
              disabled={isUpdating}
            >
              + Add Tag
            </button>

            {showTagMenu && (
              <div className="tag-menu">
                {unassignedTags.map((tag) => (
                  <button
                    key={tag.id}
                    className="tag-menu-item"
                    style={{ borderLeft: `4px solid ${tag.color}` }}
                    onClick={() => handleAddTag(tag.id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="contact-notes">
        <div className="notes-header">
          <span className="notes-label">Notes</span>
          {!isEditingNotes && (
            <button
              className="notes-edit-button"
              onClick={() => setIsEditingNotes(true)}
              disabled={isUpdating}
            >
              <Pencil size={14} /> Edit
            </button>
          )}
        </div>

        {isEditingNotes ? (
          <div className="notes-edit">
            <textarea
              className="notes-textarea"
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Add notes..."
              rows={3}
              disabled={isUpdating}
            />
            <div className="notes-actions">
              <button
                className="notes-save-button"
                onClick={handleSaveNotes}
                disabled={isUpdating}
              >
                Save
              </button>
              <button
                className="notes-cancel-button"
                onClick={handleCancelNotes}
                disabled={isUpdating}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="notes-display">
            {contact.notes ? (
              <p>{contact.notes}</p>
            ) : (
              <p className="notes-empty">No notes yet</p>
            )}
          </div>
        )}
      </div>

      <div className="contact-actions">
        <button
          className="action-btn edit"
          onClick={() => setIsEditingContact(true)}
          disabled={isUpdating}
          title="Edit contact"
        >
          <Pencil size={18} />
        </button>
        <button
          className={`action-btn favorite ${contact.isFavorite ? 'active' : ''}`}
          onClick={handleToggleFavorite}
          disabled={isUpdating}
          title="Toggle favorite"
        >
          <Star size={18} fill={contact.isFavorite ? 'currentColor' : 'none'} />
        </button>
        <button
          className="action-btn delete"
          onClick={handleDeleteContact}
          disabled={isUpdating}
          title="Delete contact"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
