import { useState } from 'react';
import { kidsApi } from '../../services/api';
import './AddKidModal.css';

interface AddKidModalProps {
  onClose: () => void;
  onKidAdded: () => void;
}

const AVATAR_COLORS = [
  '#5b768a', // Slate blue-gray
  '#da6b34', // Burnt orange
  '#dc9e33', // Golden/amber
  '#8a5b6b', // Dusty rose
  '#5b8a76', // Sage green
  '#6b5b8a', // Muted purple
  '#5b7a8a', // Ocean blue
  '#8a6b5b', // Warm brown
  '#7a8a5b', // Olive
  '#5b8a8a', // Teal
];

export function AddKidModal({ onClose, onKidAdded }: AddKidModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await kidsApi.createKid({
        name: name.trim(),
        avatarColor: selectedColor,
      });
      onKidAdded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add child');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-kid-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add a Child</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="kid-avatar-preview">
            <div
              className="kid-avatar-circle"
              style={{ backgroundColor: selectedColor }}
            >
              {name ? name.charAt(0).toUpperCase() : '?'}
            </div>
            <p className="kid-preview-name">{name || 'Child Name'}</p>
          </div>

          <div className="form-group">
            <label htmlFor="name">Child's Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Pick a Color</label>
            <div className="color-picker">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  disabled={submitting}
                />
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={submitting || !name.trim()}>
              {submitting ? 'Adding...' : 'Add Child'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
