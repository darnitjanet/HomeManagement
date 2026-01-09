import { useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { contactsApi } from '../../services/api';
import type { ContactTag } from './ContactCard';
import './TagFilter.css';

interface TagFilterProps {
  tags: ContactTag[];
  selectedTagId: number | null;
  onSelectTag: (tagId: number | null) => void;
  onTagsChange: () => void;
}

export function TagFilter({ tags, selectedTagId, onSelectTag, onTagsChange }: TagFilterProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#a8b896');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    try {
      await contactsApi.createTag({
        name: newTagName.trim(),
        color: newTagColor,
        priority: 5,
      });

      // Reset form
      setNewTagName('');
      setNewTagColor('#a8b896');
      setShowAddForm(false);

      // Reload tags
      onTagsChange();
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTag = async (tagId: number, tagName: string) => {
    if (!window.confirm(`Are you sure you want to delete the tag "${tagName}"? This will remove it from all contacts.`)) {
      return;
    }

    try {
      await contactsApi.deleteTag(tagId);
      onTagsChange();
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  };

  // Sort tags by priority (descending) then name
  const sortedTags = [...tags].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.name.localeCompare(b.name);
  });

  // Preset colors from our retro palette
  const presetColors = [
    '#5dade2', // Turquoise
    '#a8b896', // Sage green
    '#d4a574', // Golden
    '#8b7355', // Warm brown
    '#c5d5a8', // Pale mint
    '#c9934a', // Deep golden
    '#4a9cd6', // Deep turquoise
    '#8fa37d', // Sage variant
  ];

  return (
    <div className="tag-filter">
      <button
        className={`tag-filter-button ${selectedTagId === null ? 'active' : ''}`}
        onClick={() => onSelectTag(null)}
      >
        All Contacts
      </button>

      <button
        className={`tag-filter-button ${selectedTagId === -1 ? 'active' : ''}`}
        onClick={() => onSelectTag(-1)}
      >
        <Star size={16} fill={selectedTagId === -1 ? 'currentColor' : 'none'} /> Favorites
      </button>

      {sortedTags.map((tag) => (
        <div key={tag.id} className="tag-filter-item">
          <button
            className={`tag-filter-button ${selectedTagId === tag.id ? 'active' : ''}`}
            style={{
              borderLeft: selectedTagId === tag.id
                ? `4px solid ${tag.color}`
                : `4px solid transparent`,
            }}
            onClick={() => onSelectTag(tag.id)}
          >
            <span
              className="tag-color-dot"
              style={{ backgroundColor: tag.color }}
            />
            {tag.name}
            {tag.priority >= 8 && <span className="priority-badge">★</span>}
          </button>
          <button
            className="tag-delete-button"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTag(tag.id, tag.name);
            }}
            title="Delete tag"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <div className="tag-filter-divider"></div>

      {!showAddForm ? (
        <button
          className="add-tag-button"
          onClick={() => setShowAddForm(true)}
        >
          + New Tag
        </button>
      ) : (
        <div className="add-tag-form">
          <input
            type="text"
            placeholder="Tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            disabled={isCreating}
          />
          <div className="color-picker">
            <label>Color:</label>
            <div className="color-presets">
              {presetColors.map((color) => (
                <button
                  key={color}
                  className={`color-preset ${newTagColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewTagColor(color)}
                  disabled={isCreating}
                  type="button"
                />
              ))}
            </div>
          </div>
          <div className="add-tag-actions">
            <button
              className="create-button"
              onClick={handleCreateTag}
              disabled={isCreating || !newTagName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </button>
            <button
              className="cancel-button"
              onClick={() => {
                setShowAddForm(false);
                setNewTagName('');
                setNewTagColor('#a8b896');
              }}
              disabled={isCreating}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
