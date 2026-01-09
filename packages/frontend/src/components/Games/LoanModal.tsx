import { useState } from 'react';
import { gamesApi } from '../../services/api';
import './LoanModal.css';

interface Game {
  id: number;
  name: string;
}

interface LoanModalProps {
  game: Game;
  onClose: () => void;
  onLoanCreated: () => void;
}

export function LoanModal({ game, onClose, onLoanCreated }: LoanModalProps) {
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!borrowerName.trim()) {
      setError('Borrower name is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await gamesApi.loanGame(game.id, {
        borrowerName: borrowerName.trim(),
        borrowerContact: borrowerContact.trim() || undefined,
        expectedReturnDate: expectedReturnDate || undefined,
        notes: notes.trim() || undefined,
      });

      onLoanCreated();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create loan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content loan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Loan Out Game</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="game-info-banner">
            <span>Loaning:</span>
            <strong>{game.name}</strong>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="borrowerName">Borrower Name *</label>
            <input
              id="borrowerName"
              type="text"
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              placeholder="Who is borrowing this?"
              disabled={submitting}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="borrowerContact">Contact Info</label>
            <input
              id="borrowerContact"
              type="text"
              value={borrowerContact}
              onChange={(e) => setBorrowerContact(e.target.value)}
              placeholder="Phone or email (optional)"
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="expectedReturnDate">Expected Return Date</label>
            <input
              id="expectedReturnDate"
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              disabled={submitting}
            />
            <span className="field-hint">
              You'll receive a reminder after 30 days if not returned
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the loan..."
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={submitting || !borrowerName.trim()}>
              {submitting ? 'Creating Loan...' : 'Confirm Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
