import { useState } from 'react';
import { X } from 'lucide-react';
import { moodApi } from '../../services/api';
import './FamilyMemberForm.css';

interface FamilyMember {
  id: number;
  name: string;
  avatarColor: string;
  dateOfBirth?: string;
  isActive: boolean;
}

interface FamilyMemberFormProps {
  member?: FamilyMember | null;
  onClose: () => void;
  onSave: () => void;
}

const COLORS = [
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

export function FamilyMemberForm({ member, onClose, onSave }: FamilyMemberFormProps) {
  const [name, setName] = useState(member?.name || '');
  const [avatarColor, setAvatarColor] = useState(member?.avatarColor || COLORS[0]);
  const [dateOfBirth, setDateOfBirth] = useState(member?.dateOfBirth || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);
      const data = {
        name: name.trim(),
        avatarColor,
        dateOfBirth: dateOfBirth || undefined,
      };

      if (member) {
        await moodApi.updateFamilyMember(member.id, data);
      } else {
        await moodApi.createFamilyMember(data);
      }
      onSave();
    } catch (err) {
      console.error('Failed to save family member:', err);
      setError('Failed to save family member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="family-member-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{member ? 'Edit Family Member' : 'Add Family Member'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          {/* Preview */}
          <div className="avatar-preview">
            <span className="preview-avatar" style={{ backgroundColor: avatarColor }}>
              {name.charAt(0).toUpperCase() || '?'}
            </span>
          </div>

          {/* Name */}
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dad, Mom, Alex"
              autoFocus
            />
          </div>

          {/* Color */}
          <div className="form-group">
            <label>Avatar Color</label>
            <div className="color-grid">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${avatarColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setAvatarColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Date of Birth */}
          <div className="form-group">
            <label>Date of Birth (optional)</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Saving...' : member ? 'Update' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
