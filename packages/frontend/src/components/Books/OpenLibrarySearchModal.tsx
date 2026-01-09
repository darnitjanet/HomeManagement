import { useState, useEffect } from 'react';
import { Star, BookOpen, ScanBarcode } from 'lucide-react';
import { booksApi } from '../../services/api';
import { BarcodeScanner } from '../shared/BarcodeScanner';
import './OpenLibrarySearchModal.css';

interface OpenLibrarySearchModalProps {
  onClose: () => void;
  onBookAdded: () => void;
}

interface SearchResult {
  title: string;
  author?: string;
  olid?: string;
  isbn?: string;
  isbn13?: string;
  publisher?: string;
  publishYear?: string;
  pages?: number;
  genre?: string;
  subject?: string;
  language?: string;
  coverUrl?: string;
  description?: string;
  _raw: any;
}

interface BookTag {
  id: number;
  name: string;
  color: string;
}

export function OpenLibrarySearchModal({ onClose, onBookAdded }: OpenLibrarySearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBook, setSelectedBook] = useState<SearchResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [addingBook, setAddingBook] = useState(false);
  const [tags, setTags] = useState<BookTag[]>([]);
  const [showScanner, setShowScanner] = useState(false);

  // Form state for adding book
  const [readStatus, setReadStatus] = useState('Wishlist');
  const [myRating, setMyRating] = useState<number>(0);
  const [personalNotes, setPersonalNotes] = useState('');
  const [location, setLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  // Editable book data fields
  const [editGenre, setEditGenre] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [editPages, setEditPages] = useState('');

  useEffect(() => {
    loadTags();
  }, []);

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

  const handleBarcodeScanned = async (barcode: string) => {
    setShowScanner(false);
    setSearchQuery(barcode);
    // Trigger search with the barcode
    setLoading(true);
    setError('');
    setSearchResults([]);

    try {
      const response = await booksApi.searchOpenLibrary(barcode);
      if (response.data.success && response.data.data.results.length > 0) {
        setSearchResults(response.data.data.results);
      } else {
        setError('No books found for this ISBN. Try a different search term.');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to search Open Library');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setSearchResults([]);

    try {
      const response = await booksApi.searchOpenLibrary(searchQuery);
      if (response.data.success && response.data.data.results.length > 0) {
        setSearchResults(response.data.data.results);
      } else {
        setError('No books found. Try a different search term.');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to search Open Library');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBook = async (book: SearchResult) => {
    setSelectedBook(book);
    setShowDetails(true);

    // Populate editable fields from book data
    setEditGenre(book.genre || '');
    setEditLanguage(book.language || '');
    setEditPages(book.pages?.toString() || '');

    // Fetch work details to get description
    if (book.olid) {
      try {
        const response = await booksApi.getOpenLibraryDetails(book.olid);
        if (response.data.success && response.data.data.description) {
          setSelectedBook({
            ...book,
            description: response.data.data.description,
          });
        }
      } catch (error) {
        // Silently fail - description is optional
        console.error('Failed to fetch book details:', error);
      }
    }
  };

  const handleAddBook = async () => {
    if (!selectedBook) return;

    setAddingBook(true);
    setError('');

    try {
      await booksApi.createBookFromOpenLibrary({
        title: selectedBook.title,
        author: selectedBook.author,
        isbn: selectedBook.isbn,
        isbn13: selectedBook.isbn13,
        olid: selectedBook.olid,
        publisher: selectedBook.publisher,
        publishYear: selectedBook.publishYear,
        pages: editPages ? parseInt(editPages) : selectedBook.pages,
        genre: editGenre || selectedBook.genre,
        subject: selectedBook.subject,
        description: selectedBook.description,
        coverUrl: selectedBook.coverUrl,
        language: editLanguage || selectedBook.language,
        readStatus,
        myRating: myRating > 0 ? myRating : undefined,
        personalNotes: personalNotes || undefined,
        location: location || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      onBookAdded();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add book');
    } finally {
      setAddingBook(false);
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content openlibrary-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <BookOpen size={24} />
            Search Open Library
          </h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!showDetails ? (
            <>
              <button
                className="scan-isbn-btn"
                onClick={() => setShowScanner(true)}
              >
                <ScanBarcode size={18} /> Scan ISBN Barcode
              </button>

              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Search by title, author, or ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  autoFocus
                />
                <button type="submit" className="primary" disabled={loading}>
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {error && <div className="error-message">{error}</div>}

              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((result, index) => (
                    <div
                      key={result.olid || index}
                      className="search-result-card"
                      onClick={() => handleSelectBook(result)}
                    >
                      {result.coverUrl ? (
                        <img src={result.coverUrl} alt={result.title} />
                      ) : (
                        <div className="no-cover">
                          <BookOpen size={32} />
                        </div>
                      )}
                      <div className="result-info">
                        <h3>{result.title}</h3>
                        <p className="author">{result.author || 'Unknown Author'}</p>
                        {result.publishYear && <p className="year">{result.publishYear}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="book-details">
              <button className="back-button" onClick={() => {
                setShowDetails(false);
                setSelectedBook(null);
                setEditGenre('');
                setEditLanguage('');
                setEditPages('');
                setReadStatus('Wishlist');
                setMyRating(0);
                setPersonalNotes('');
                setLocation('');
                setSelectedTags([]);
              }}>
                ← Back to search
              </button>

              <div className="details-content">
                {selectedBook?.coverUrl ? (
                  <img src={selectedBook.coverUrl} alt={selectedBook.title} className="detail-cover" />
                ) : (
                  <div className="detail-cover-placeholder">
                    <BookOpen size={48} />
                  </div>
                )}

                <div className="detail-info">
                  <h3>{selectedBook?.title}</h3>
                  {selectedBook?.author && (
                    <p className="author">by {selectedBook.author}</p>
                  )}
                  <div className="metadata">
                    {selectedBook?.publishYear && <span>{selectedBook.publishYear}</span>}
                    {selectedBook?.publisher && <span>• {selectedBook.publisher}</span>}
                    {selectedBook?.pages && <span>• {selectedBook.pages} pages</span>}
                  </div>
                  {selectedBook?.subject && (
                    <p className="subjects">{selectedBook.subject}</p>
                  )}
                  {selectedBook?.description && (
                    <p className="description">{selectedBook.description}</p>
                  )}
                  {selectedBook?.isbn && (
                    <p className="isbn">ISBN: {selectedBook.isbn}</p>
                  )}

                  <div className="add-form">
                    <h4>Add to Your Library</h4>

                    <div className="form-row">
                      <label>
                        Genre:
                        <input
                          type="text"
                          value={editGenre}
                          onChange={(e) => setEditGenre(e.target.value)}
                          placeholder="e.g., Fiction, Mystery"
                        />
                      </label>

                      <label>
                        Language:
                        <input
                          type="text"
                          value={editLanguage}
                          onChange={(e) => setEditLanguage(e.target.value)}
                          placeholder="e.g., English"
                        />
                      </label>

                      <label>
                        Pages:
                        <input
                          type="number"
                          value={editPages}
                          onChange={(e) => setEditPages(e.target.value)}
                          placeholder="Number of pages"
                        />
                      </label>
                    </div>

                    <div className="form-row">
                      <label>
                        Read Status:
                        <select value={readStatus} onChange={(e) => setReadStatus(e.target.value)}>
                          <option value="Wishlist">Wishlist</option>
                          <option value="Not Started">Not Started</option>
                          <option value="Reading">Reading</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </label>

                      <label>
                        Location:
                        <input
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          placeholder="e.g., Living Room Shelf"
                        />
                      </label>
                    </div>

                    <div className="rating-field">
                      <span className="rating-label">My Rating:</span>
                      <div className="rating-selector">
                        {[1, 2, 3, 4, 5].map(r => (
                          <button
                            key={r}
                            type="button"
                            className={`star-btn ${myRating >= r ? 'filled' : ''}`}
                            onClick={() => setMyRating(r)}
                          >
                            <Star size={24} fill={myRating >= r ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                        {myRating > 0 && (
                          <button type="button" onClick={() => setMyRating(0)} className="clear-rating">
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {tags.length > 0 && (
                      <div className="tags-field">
                        <span className="tags-label">Tags:</span>
                        <div className="tags-selector">
                          {tags.map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              className={`tag-btn ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                              style={{
                                backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent',
                                borderColor: tag.color,
                                color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                              }}
                              onClick={() => toggleTag(tag.id)}
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <label>
                      Personal Notes:
                      <textarea
                        value={personalNotes}
                        onChange={(e) => setPersonalNotes(e.target.value)}
                        placeholder="Add your personal notes..."
                        rows={3}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-footer">
                <button className="outline" onClick={() => setShowDetails(false)}>
                  Cancel
                </button>
                <button
                  className="primary"
                  onClick={handleAddBook}
                  disabled={addingBook}
                >
                  {addingBook ? 'Adding...' : 'Add to Library'}
                </button>
              </div>
            </div>
          )}
        </div>

        {showScanner && (
          <BarcodeScanner
            title="Scan ISBN Barcode"
            placeholder="Enter ISBN number..."
            onScan={handleBarcodeScanned}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </div>
  );
}
