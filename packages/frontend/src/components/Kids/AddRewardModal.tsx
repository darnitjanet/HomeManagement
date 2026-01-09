import { useState } from 'react';
import { kidsApi } from '../../services/api';
import './AddRewardModal.css';

interface AddRewardModalProps {
  kidId: number;
  nextRewardStickers: number;
  onClose: () => void;
  onRewardAdded: () => void;
}

export function AddRewardModal({ kidId, nextRewardStickers, onClose, onRewardAdded }: AddRewardModalProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a reward name');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await kidsApi.createReward(kidId, {
        name: name.trim(),
        stickersRequired: nextRewardStickers,
      });
      onRewardAdded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add reward');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content add-reward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add a Reward</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <p className="reward-info">
            This reward will be earned at <strong>{nextRewardStickers} stickers</strong>
          </p>

          <div className="form-group">
            <label htmlFor="rewardName">What's the reward?</label>
            <input
              id="rewardName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Ice Cream, Movie Night, New Toy..."
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary"
              disabled={submitting || !name.trim()}
            >
              {submitting ? 'Adding...' : 'Add Reward'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
