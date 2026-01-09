import { useState, useEffect } from 'react';
import { contactsApi } from '../../services/api';
import { ContactCard } from './ContactCard';
import type { Contact, ContactTag } from './ContactCard';
import { TagFilter } from './TagFilter';
import { SyncContactsButton } from './SyncContactsButton';
import { AlphabetNav } from './AlphabetNav';
import './ContactsList.css';

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContactFirstName, setNewContactFirstName] = useState('');
  const [newContactLastName, setNewContactLastName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactNotes, setNewContactNotes] = useState('');
  const [newContactTags, setNewContactTags] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadTags();
    loadContacts();
  }, []);

  useEffect(() => {
    loadContacts();
  }, [selectedTagId]);

  const loadTags = async () => {
    try {
      const response = await contactsApi.getAllTags();
      if (response.data.success) {
        setTags(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    setError('');

    try {
      let response;

      if (selectedTagId === -1) {
        // Favorites
        response = await contactsApi.getFavoriteContacts();
      } else if (selectedTagId !== null) {
        // Specific tag
        response = await contactsApi.getContactsByTag(selectedTagId);
      } else {
        // All contacts
        response = await contactsApi.getAllContacts();
      }

      if (response.data.success) {
        setContacts(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to load contacts:', error);
      setError(error.response?.data?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      loadContacts();
      return;
    }

    setLoading(true);
    try {
      const response = await contactsApi.searchContacts(query);
      if (response.data.success) {
        setContacts(response.data.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncComplete = () => {
    loadContacts();
    loadTags();
  };

  const handleContactUpdate = () => {
    loadContacts();
  };

  const handleTagSelect = (tagId: number | null) => {
    setSelectedTagId(tagId);
    setSearchQuery('');
  };

  const handleCreateContact = async () => {
    if (!newContactFirstName.trim() && !newContactLastName.trim()) {
      alert('Please enter at least a first or last name');
      return;
    }

    setIsCreating(true);
    try {
      const emails = newContactEmail.trim() ? [{ value: newContactEmail.trim() }] : [];
      const phones = newContactPhone.trim() ? [{ value: newContactPhone.trim() }] : [];

      // Build display name from first and last name
      const displayName = [newContactFirstName.trim(), newContactLastName.trim()]
        .filter(Boolean)
        .join(' ');

      const response = await contactsApi.createContact({
        displayName,
        givenName: newContactFirstName.trim() || undefined,
        familyName: newContactLastName.trim() || undefined,
        emails,
        phones,
        notes: newContactNotes.trim() || undefined,
      });

      // Add tags to the newly created contact
      if (response.data.success && newContactTags.length > 0) {
        const contactId = response.data.data.id;
        for (const tagId of newContactTags) {
          await contactsApi.addTagToContact(contactId, tagId);
        }
      }

      // Reset form
      setNewContactFirstName('');
      setNewContactLastName('');
      setNewContactEmail('');
      setNewContactPhone('');
      setNewContactNotes('');
      setNewContactTags([]);
      setShowAddForm(false);

      // Reload contacts
      loadContacts();
    } catch (error) {
      console.error('Failed to create contact:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLetterClick = (letter: string) => {
    const element = document.querySelector(`[data-letter="${letter}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="contacts-page">
      <div className="contacts-banner">
        <img src="/Contacts.png" alt="Contacts" />
      </div>

      <div className="contacts-header">
        <div className="header-actions">
          <button className="add-contact-button" onClick={() => setShowAddForm(!showAddForm)}>
            + Add Contact
          </button>
          <SyncContactsButton onSyncComplete={handleSyncComplete} />
        </div>
      </div>

      {showAddForm && (
        <div className="add-contact-form">
          <h3>New Contact</h3>
          <div className="name-fields-row">
            <input
              type="text"
              placeholder="First Name *"
              value={newContactFirstName}
              onChange={(e) => setNewContactFirstName(e.target.value)}
              disabled={isCreating}
            />
            <input
              type="text"
              placeholder="Last Name"
              value={newContactLastName}
              onChange={(e) => setNewContactLastName(e.target.value)}
              disabled={isCreating}
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={newContactEmail}
            onChange={(e) => setNewContactEmail(e.target.value)}
            disabled={isCreating}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={newContactPhone}
            onChange={(e) => setNewContactPhone(e.target.value)}
            disabled={isCreating}
          />
          <textarea
            placeholder="Notes"
            value={newContactNotes}
            onChange={(e) => setNewContactNotes(e.target.value)}
            disabled={isCreating}
            rows={3}
          />
          {tags.length > 0 && (
            <div className="tag-selection">
              <label>Tags:</label>
              <div className="tag-checkboxes">
                {tags.map((tag) => (
                  <label key={tag.id} className="tag-checkbox">
                    <input
                      type="checkbox"
                      checked={newContactTags.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewContactTags([...newContactTags, tag.id]);
                        } else {
                          setNewContactTags(newContactTags.filter((id) => id !== tag.id));
                        }
                      }}
                      disabled={isCreating}
                    />
                    <span className="tag-badge" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="form-actions">
            <button
              className="save-button"
              onClick={handleCreateContact}
              disabled={isCreating || (!newContactFirstName.trim() && !newContactLastName.trim())}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
            <button
              className="cancel-button"
              onClick={() => {
                setShowAddForm(false);
                setNewContactFirstName('');
                setNewContactLastName('');
                setNewContactEmail('');
                setNewContactPhone('');
                setNewContactNotes('');
                setNewContactTags([]);
              }}
              disabled={isCreating}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="contacts-sticky-header">
        <div className="contacts-search">
          <input
            type="text"
            className="search-input"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {searchQuery && (
            <button
              className="search-clear-button"
              onClick={() => handleSearch('')}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {!loading && !error && contacts.length > 0 && (
          <AlphabetNav contacts={contacts} onLetterClick={handleLetterClick} />
        )}
      </div>

      <div className="contacts-layout">
        <aside className="contacts-sidebar">
          <TagFilter
            tags={tags}
            selectedTagId={selectedTagId}
            onSelectTag={handleTagSelect}
            onTagsChange={loadTags}
          />
        </aside>

        <main className="contacts-main">
          {loading && (
            <div className="contacts-loading">
              <div className="loading-spinner"></div>
              <p>Loading contacts...</p>
            </div>
          )}

          {error && (
            <div className="contacts-error">
              <p>{error}</p>
              <button onClick={loadContacts}>Try Again</button>
            </div>
          )}

          {!loading && !error && contacts.length === 0 && (
            <div className="contacts-empty">
              <p>No contacts found</p>
              {selectedTagId === null && (
                <p className="empty-hint">
                  Click "Sync Contacts" to import your Google contacts
                </p>
              )}
            </div>
          )}

          {!loading && !error && contacts.length > 0 && (
            <>
              <div className="contacts-count">
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
                {selectedTagId !== null && ' in this filter'}
              </div>

              <div className="contacts-grid">
                {contacts.map((contact) => {
                  const firstLetter = contact.displayName.charAt(0).toUpperCase();
                  return (
                    <div key={contact.id} data-letter={firstLetter}>
                      <ContactCard
                        contact={contact}
                        availableTags={tags}
                        onUpdate={handleContactUpdate}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
