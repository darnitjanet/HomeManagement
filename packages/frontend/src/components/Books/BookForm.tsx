import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { booksApi } from '../../services/api';
import './BookForm.css';

interface Book {
  id: number;
  title: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  publishYear?: string;
  pages?: number;
  genre?: string;
  language?: string;
  readStatus: string;
  myRating?: number;
  location?: string;
  description?: string;
  personalNotes?: string;
  coverUrl?: string;
  tags?: { id: number; name: string; color: string }[];
}

interface BookFormProps {
  onClose: () => void;
  onBookAdded: () => void;
  book?: Book | null;
}

interface BookTag {
  id: number;
  name: string;
  color: string;
}

export function BookForm({ onClose, onBookAdded, book }: BookFormProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishYear, setPublishYear] = useState('');
  const [pages, setPages] = useState('');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [readStatus, setReadStatus] = useState('Wishlist');
  const [myRating, setMyRating] = useState<number>(0);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [personalNotes, setPersonalNotes] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  const [tags, setTags] = useState<BookTag[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!book;

  useEffect(() => {
    loadTags();
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (book) {
      setTitle(book.title || '');
      setAuthor(book.author || '');
      setIsbn(book.isbn || '');
      setPublisher(book.publisher || '');
      setPublishYear(book.publishYear || '');
      setPages(book.pages?.toString() || '');
      setGenre(book.genre || '');
      setLanguage(book.language || '');
      setReadStatus(book.readStatus || 'Wishlist');
      setMyRating(book.myRating || 0);
      setLocation(book.location || '');
      setDescription(book.description || '');
      setPersonalNotes(book.personalNotes || '');
      setCoverUrl(book.coverUrl || '');
      setSelectedTags(book.tags?.map(t => t.id) || []);
    }
  }, [book]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const bookData = {
        title,
        author: author || undefined,
        isbn: isbn || undefined,
        publisher: publisher || undefined,
        publishYear: publishYear || undefined,
        pages: pages ? parseInt(pages) : undefined,
        genre: genre || undefined,
        language: language || undefined,
        readStatus,
        myRating: myRating > 0 ? myRating : undefined,
        location: location || undefined,
        description: description || undefined,
        personalNotes: personalNotes || undefined,
        coverUrl: coverUrl || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      if (isEditing && book) {
        await booksApi.updateBook(book.id, bookData);
      } else {
        await booksApi.createBook(bookData);
      }

      onBookAdded();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} book`);
    } finally {
      setSaving(false);
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
      <div className="modal-content book-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <BookOpen size={24} />
            {isEditing ? 'Edit Book' : 'Add Book Manually'}
          </h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <label className="required full-width">
                Title:
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter book title"
                  required
                />
              </label>

              <label className="full-width">
                Author:
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author name(s)"
                />
              </label>

              <label>
                ISBN:
                <input
                  type="text"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="ISBN-10 or ISBN-13"
                />
              </label>

              <label>
                Publisher:
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="Publisher name"
                />
              </label>

              <label>
                Publish Year:
                <input
                  type="text"
                  value={publishYear}
                  onChange={(e) => setPublishYear(e.target.value)}
                  placeholder="e.g., 2024"
                />
              </label>

              <label>
                Pages:
                <input
                  type="number"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  placeholder="Number of pages"
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Status & Rating</h3>
            <div className="form-grid">
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

              <div className="rating-field">
                <span className="rating-label">My Rating:</span>
                <div className="rating-selector">
                  {[1, 2, 3, 4, 5].map(r => (
                    <span
                      key={r}
                      className={`star ${myRating >= r ? 'filled' : ''}`}
                      onClick={() => setMyRating(r)}
                    >
                      ★
                    </span>
                  ))}
                  {myRating > 0 && (
                    <button type="button" onClick={() => setMyRating(0)} className="clear-rating">
                      Clear
                    </button>
                  )}
                </div>
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
          </div>

          <div className="form-section">
            <h3>Additional Details</h3>
            <div className="form-grid">
              <label>
                Genre:
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g., Fiction, Mystery"
                />
              </label>

              <label>
                Language:
                <input
                  type="text"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="e.g., English"
                />
              </label>

              <label className="full-width">
                Cover Image URL:
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>

              <label className="full-width">
                Description:
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Book description/summary"
                  rows={3}
                />
              </label>

              <label className="full-width">
                Personal Notes:
                <textarea
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  placeholder="Your personal notes about this book"
                  rows={3}
                />
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary" disabled={saving}>
              {saving ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Book')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
