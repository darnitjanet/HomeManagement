import { useState, useEffect } from 'react';
import { Trash2, BookOpen, UserCheck, Edit } from 'lucide-react';
import { booksApi } from '../../services/api';
import { OpenLibrarySearchModal } from './OpenLibrarySearchModal';
import { BookForm } from './BookForm';
import { LoanBookModal } from './LoanBookModal';
import './BooksList.css';

interface BookTag {
  id: number;
  name: string;
  color: string;
  priority: number;
}

interface BookLoan {
  id: number;
  bookId: number;
  borrowerName: string;
  borrowerContact?: string;
  loanedAt: string;
  dueDate?: string;
  returnedAt?: string;
  notes?: string;
}

interface Book {
  id: number;
  title: string;
  author?: string;
  isbn?: string;
  isbn13?: string;
  olid?: string;
  publisher?: string;
  publishYear?: string;
  pages?: number;
  genre?: string;
  subject?: string;
  description?: string;
  coverUrl?: string;
  language?: string;
  readStatus: string;
  myRating?: number;
  personalNotes?: string;
  location?: string;
  tags?: BookTag[];
  currentLoan?: BookLoan;
}

export function BooksList() {
  const [books, setBooks] = useState<Book[]>([]);
  const [_tags, setTags] = useState<BookTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedBookForLoan, setSelectedBookForLoan] = useState<Book | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReadStatus, setSelectedReadStatus] = useState<string>('');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [showOnLoan, setShowOnLoan] = useState<boolean | null>(null);

  useEffect(() => {
    loadBooks();
    loadTags();
  }, []);

  const loadBooks = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await booksApi.getAllBooks();
      if (response.data.success) {
        setBooks(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await booksApi.getAllTags();
      if (response.data.success) {
        setTags(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      loadBooks();
      return;
    }

    setLoading(true);
    try {
      const response = await booksApi.searchBooks(query);
      if (response.data.success) {
        setBooks(response.data.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    const filters: any = {};
    if (selectedReadStatus) filters.readStatus = selectedReadStatus;
    if (selectedAuthor) filters.author = selectedAuthor;
    if (selectedGenre) filters.genre = selectedGenre;
    if (showOnLoan !== null) filters.hasLoan = showOnLoan;

    setLoading(true);
    try {
      const response = await booksApi.filterBooks(filters);
      if (response.data.success) {
        let filteredBooks = response.data.data;
        // Client-side filter for rating since API doesn't support it
        if (selectedRating !== null) {
          filteredBooks = filteredBooks.filter((b: Book) => b.myRating === selectedRating);
        }
        setBooks(filteredBooks);
      }
    } catch (error) {
      console.error('Filter failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedReadStatus('');
    setSelectedAuthor('');
    setSelectedGenre('');
    setSelectedRating(null);
    setShowOnLoan(null);
    loadBooks();
  };

  const handleDeleteBook = async (id: number) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      await booksApi.deleteBook(id);
      loadBooks();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleUpdateRating = async (id: number, rating: number) => {
    try {
      await booksApi.updateMyRating(id, rating);
      loadBooks();
    } catch (error) {
      console.error('Update rating failed:', error);
    }
  };

  const handleUpdateReadStatus = async (id: number, status: string) => {
    try {
      await booksApi.updateReadStatus(id, status);
      loadBooks();
    } catch (error) {
      console.error('Update status failed:', error);
    }
  };

  const handleLoanBook = (book: Book) => {
    setSelectedBookForLoan(book);
    setShowLoanModal(true);
  };

  const handleReturnBook = async (id: number) => {
    try {
      await booksApi.returnBook(id);
      loadBooks();
    } catch (error) {
      console.error('Return failed:', error);
    }
  };

  // Get unique values for filters
  const uniqueAuthors = Array.from(new Set(
    books.map(b => b.author).filter(Boolean)
  )).sort() as string[];

  const uniqueGenres = Array.from(new Set(
    books
      .map(b => b.genre?.split(',').map(g => g.trim()))
      .flat()
      .filter(Boolean)
  )).sort() as string[];

  useEffect(() => {
    if (selectedReadStatus || selectedAuthor || selectedGenre || selectedRating !== null || showOnLoan !== null) {
      handleFilter();
    }
  }, [selectedReadStatus, selectedAuthor, selectedGenre, selectedRating, showOnLoan]);

  if (loading && books.length === 0) {
    return (
      <div className="books-loading">
        <div className="loading-spinner"></div>
        <p>Loading books...</p>
      </div>
    );
  }

  return (
    <div className="books-page">
      <div className="books-banner">
        <img src="/Books.png" alt="Book Inventory" />
      </div>

      <div className="books-header">
        <div className="header-actions">
          <button className="primary" onClick={() => setShowSearchModal(true)}>
            + Add from Open Library
          </button>
          <button className="secondary" onClick={() => setShowManualForm(true)}>
            + Add Manually
          </button>
        </div>
      </div>

      <div className="books-filters">
        <input
          type="text"
          placeholder="Search by title, author, ISBN..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />

        <select
          value={selectedReadStatus}
          onChange={(e) => setSelectedReadStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Wishlist">Wishlist</option>
          <option value="Not Started">Not Started</option>
          <option value="Reading">Reading</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={selectedAuthor}
          onChange={(e) => setSelectedAuthor(e.target.value)}
        >
          <option value="">All Authors</option>
          {uniqueAuthors.map(author => (
            <option key={author} value={author}>{author}</option>
          ))}
        </select>

        <select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
        >
          <option value="">All Genres</option>
          {uniqueGenres.map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>

        <select
          value={selectedRating ?? ''}
          onChange={(e) => setSelectedRating(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All Ratings</option>
          {[1, 2, 3, 4, 5].map(r => (
            <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>
          ))}
        </select>

        <select
          value={showOnLoan === null ? '' : showOnLoan ? 'loaned' : 'available'}
          onChange={(e) => setShowOnLoan(e.target.value === '' ? null : e.target.value === 'loaned')}
        >
          <option value="">All Availability</option>
          <option value="available">Available</option>
          <option value="loaned">On Loan</option>
        </select>

        <button onClick={handleClearFilters} className="clear-filters">
          Clear All
        </button>
      </div>

      <div className="results-count">
        {books.length} book{books.length !== 1 ? 's' : ''}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="books-table-container">
        <table className="books-table">
          <thead>
            <tr>
              <th>Cover</th>
              <th>Title</th>
              <th>Author</th>
              <th>Year</th>
              <th>Pages</th>
              <th>Status</th>
              <th>My Rating</th>
              <th>Location</th>
              <th>Loan</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} className={book.currentLoan ? 'on-loan' : ''}>
                <td>
                  {book.coverUrl ? (
                    <img src={book.coverUrl} alt={book.title} className="cover-thumb" />
                  ) : (
                    <div className="cover-placeholder">
                      <BookOpen size={24} />
                    </div>
                  )}
                </td>
                <td className="title-cell">
                  <div className="book-title">{book.title}</div>
                  {book.tags && book.tags.length > 0 && (
                    <div className="book-tags">
                      {book.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag.id}
                          className="tag-badge"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>{book.author || '-'}</td>
                <td>{book.publishYear || '-'}</td>
                <td>{book.pages || '-'}</td>
                <td>
                  <select
                    className={`status-select ${book.readStatus.toLowerCase().replace(' ', '-')}`}
                    value={book.readStatus}
                    onChange={(e) => handleUpdateReadStatus(book.id, e.target.value)}
                  >
                    <option value="Wishlist">Wishlist</option>
                    <option value="Not Started">Not Started</option>
                    <option value="Reading">Reading</option>
                    <option value="Completed">Completed</option>
                  </select>
                </td>
                <td>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map(r => (
                      <span
                        key={r}
                        className={`star ${book.myRating && r <= book.myRating ? 'filled' : ''}`}
                        onClick={() => handleUpdateRating(book.id, r)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </td>
                <td>{book.location || '-'}</td>
                <td>
                  {book.currentLoan ? (
                    <div className="loan-info">
                      <span className="badge loan-badge">
                        <UserCheck size={14} />
                        {book.currentLoan.borrowerName}
                      </span>
                      <button
                        className="return-btn"
                        onClick={() => handleReturnBook(book.id)}
                        title="Mark as returned"
                      >
                        Return
                      </button>
                    </div>
                  ) : (
                    <button
                      className="loan-btn"
                      onClick={() => handleLoanBook(book)}
                    >
                      Loan Out
                    </button>
                  )}
                </td>
                <td>
                  <button
                    onClick={() => {
                      setEditingBook(book);
                      setShowManualForm(true);
                    }}
                    className="edit-btn"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteBook(book.id)}
                    className="delete-btn"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {books.length === 0 && !loading && (
          <div className="no-books">
            <BookOpen size={48} />
            <p>No books found. Add your first book to get started!</p>
          </div>
        )}
      </div>

      {showSearchModal && (
        <OpenLibrarySearchModal
          onClose={() => setShowSearchModal(false)}
          onBookAdded={loadBooks}
        />
      )}

      {showManualForm && (
        <BookForm
          onClose={() => {
            setShowManualForm(false);
            setEditingBook(null);
          }}
          onBookAdded={loadBooks}
          book={editingBook}
        />
      )}

      {showLoanModal && selectedBookForLoan && (
        <LoanBookModal
          book={selectedBookForLoan}
          onClose={() => {
            setShowLoanModal(false);
            setSelectedBookForLoan(null);
          }}
          onLoanCreated={loadBooks}
        />
      )}
    </div>
  );
}
