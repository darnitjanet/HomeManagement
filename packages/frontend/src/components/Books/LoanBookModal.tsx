import { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { booksApi } from '../../services/api';
import './LoanBookModal.css';

interface Book {
  id: number;
  title: string;
  author?: string;
  coverUrl?: string;
}

interface LoanBookModalProps {
  book: Book;
  onClose: () => void;
  onLoanCreated: () => void;
}

export function LoanBookModal({ book, onClose, onLoanCreated }: LoanBookModalProps) {
  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!borrowerName.trim()) {
      setError('Borrower name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await booksApi.loanBook(book.id, {
        borrowerName,
        borrowerContact: borrowerContact || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
      });

      onLoanCreated();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create loan');
    } finally {
      setSaving(false);
    }
  };

  // Set default due date to 2 weeks from now
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content loan-book-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <UserCheck size={24} />
            Loan Book
          </h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="book-info">
            {book.coverUrl && (
              <img src={book.coverUrl} alt={book.title} className="book-cover" />
            )}
            <div className="book-details">
              <h3>{book.title}</h3>
              {book.author && <p className="author">by {book.author}</p>}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <label className="required">
              Borrower Name:
              <input
                type="text"
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="Who are you lending this to?"
                required
                autoFocus
              />
            </label>

            <label>
              Contact Info:
              <input
                type="text"
                value={borrowerContact}
                onChange={(e) => setBorrowerContact(e.target.value)}
                placeholder="Phone number or email (optional)"
              />
            </label>

            <label>
              Due Date:
              <input
                type="date"
                value={dueDate || getDefaultDueDate()}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>

            <label>
              Notes:
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this loan..."
                rows={2}
              />
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? 'Creating Loan...' : 'Loan Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
