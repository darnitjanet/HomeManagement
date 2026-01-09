import { useState, useEffect } from 'react';
import { gamesApi } from '../../services/api';
import './GameForm.css';

interface GameTag {
  id: number;
  name: string;
  color: string;
  priority: number;
}

interface Game {
  id: number;
  name: string;
  type: string;
  playerCountMin?: number;
  playerCountMax?: number;
  condition?: string;
  platform?: string;
  notes?: string;
  tags?: GameTag[];
}

interface GameFormProps {
  onClose: () => void;
  onGameAdded: () => void;
  tags: GameTag[];
  game?: Game | null;
}

const GAME_TYPES = ['Board Game', 'Puzzle', 'Card Game', 'Party Game', 'Video Game'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];
const PLATFORMS = ['PlayStation 5', 'PlayStation 4', 'Xbox Series X/S', 'Xbox One', 'Nintendo Switch', 'PC', 'Steam Deck', 'Other'];

export function GameForm({ onClose, onGameAdded, tags, game }: GameFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Board Game');
  const [playerCountMin, setPlayerCountMin] = useState<string>('');
  const [playerCountMax, setPlayerCountMax] = useState<string>('');
  const [condition, setCondition] = useState('');
  const [platform, setPlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!game;

  // Populate form when editing
  useEffect(() => {
    if (game) {
      setName(game.name || '');
      setType(game.type || 'Board Game');
      setPlayerCountMin(game.playerCountMin?.toString() || '');
      setPlayerCountMax(game.playerCountMax?.toString() || '');
      setCondition(game.condition || '');
      setPlatform(game.platform || '');
      setNotes(game.notes || '');
      setSelectedTags(game.tags?.map(t => t.id) || []);
    }
  }, [game]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const gameData = {
        name: name.trim(),
        type,
        playerCountMin: playerCountMin ? parseInt(playerCountMin) : undefined,
        playerCountMax: playerCountMax ? parseInt(playerCountMax) : undefined,
        condition: condition || undefined,
        platform: type === 'Video Game' ? platform || undefined : undefined,
        notes: notes.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      if (isEditing && game) {
        await gamesApi.updateGame(game.id, gameData);
      } else {
        await gamesApi.createGame(gameData);
      }

      onGameAdded();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} game`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content game-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Game' : 'Add New Game'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter game name"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Type *</label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={submitting}
              >
                {GAME_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="condition">Condition</label>
              <select
                id="condition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select condition...</option>
                {CONDITIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {type === 'Video Game' && (
            <div className="form-group">
              <label htmlFor="platform">Platform</label>
              <select
                id="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                disabled={submitting}
              >
                <option value="">Select platform...</option>
                {PLATFORMS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="playerMin">Min Players</label>
              <input
                id="playerMin"
                type="number"
                min="1"
                value={playerCountMin}
                onChange={(e) => setPlayerCountMin(e.target.value)}
                placeholder="1"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="playerMax">Max Players</label>
              <input
                id="playerMax"
                type="number"
                min="1"
                value={playerCountMax}
                onChange={(e) => setPlayerCountMax(e.target.value)}
                placeholder="4"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              disabled={submitting}
            />
          </div>

          {tags.length > 0 && (
            <div className="form-group">
              <label>Tags</label>
              <div className="tag-checkboxes">
                {tags.map(tag => (
                  <label key={tag.id} className="tag-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag.id]);
                        } else {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id));
                        }
                      }}
                      disabled={submitting}
                    />
                    <span className="tag-badge" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={submitting || !name.trim()}>
              {submitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Game')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
