import { useState, useEffect } from 'react';
import { Trash2, Eye, Heart, Star, Plus, Search, ArrowLeft } from 'lucide-react';
import { watchlistApi, moviesApi } from '../../services/api';
import './Watchlist.css';

interface WatchlistItem {
  id: number;
  tmdbId?: number;
  title: string;
  posterUrl?: string;
  releaseYear?: string;
  genre?: string;
  plot?: string;
  status: 'want_to_watch' | 'watched';
  myRating?: number;
  watchedDate?: string;
  priority: number;
  notes?: string;
  addedAt: string;
}

interface SearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

interface WatchlistProps {
  onBack: () => void;
}

export function Watchlist({ onBack }: WatchlistProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'want_to_watch' | 'watched'>('want_to_watch');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMarkWatchedModal, setShowMarkWatchedModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);

  // Add modal state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [addPriority, setAddPriority] = useState(3);
  const [addNotes, setAddNotes] = useState('');
  const [adding, setAdding] = useState(false);

  // Mark watched modal state
  const [watchedRating, setWatchedRating] = useState(0);
  const [watchedDate, setWatchedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadItems();
  }, [activeTab]);

  const loadItems = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await watchlistApi.getAll(activeTab);
      if (response.data.success) {
        setItems(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load watchlist');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError('');
    setSearchResults([]);
    setSelectedMovie(null);

    try {
      const response = await moviesApi.searchOMDb(searchQuery);
      if (response.data.success && response.data.data.Search) {
        setSearchResults(response.data.data.Search);
      } else {
        setError('No movies found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectMovie = async (imdbId: string) => {
    setSearching(true);
    try {
      const response = await moviesApi.getOMDbDetails(imdbId);
      if (response.data.success) {
        setSelectedMovie(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to get details');
    } finally {
      setSearching(false);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!selectedMovie) return;

    setAdding(true);
    setError('');

    try {
      await watchlistApi.addItem({
        tmdbId: selectedMovie.tmdbID,
        title: selectedMovie.Title,
        posterUrl: selectedMovie.Poster !== 'N/A' ? selectedMovie.Poster : undefined,
        releaseYear: selectedMovie.Year,
        genre: selectedMovie.Genre,
        plot: selectedMovie.Plot,
        priority: addPriority,
        notes: addNotes || undefined,
      });

      setShowAddModal(false);
      resetAddModal();
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add to watchlist');
    } finally {
      setAdding(false);
    }
  };

  const resetAddModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMovie(null);
    setAddPriority(3);
    setAddNotes('');
    setError('');
  };

  const handleMarkAsWatched = async () => {
    if (!selectedItem) return;

    try {
      await watchlistApi.markAsWatched(
        selectedItem.id,
        watchedRating > 0 ? watchedRating : undefined,
        watchedDate
      );
      setShowMarkWatchedModal(false);
      setSelectedItem(null);
      setWatchedRating(0);
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark as watched');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove from watchlist?')) return;

    try {
      await watchlistApi.deleteItem(id);
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  const handleUpdatePriority = async (item: WatchlistItem, newPriority: number) => {
    try {
      await watchlistApi.updateItem(item.id, { priority: newPriority });
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update priority');
    }
  };

  const handleUpdateRating = async (item: WatchlistItem, newRating: number) => {
    try {
      await watchlistApi.updateItem(item.id, { myRating: newRating });
      loadItems();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update rating');
    }
  };

  const openMarkWatchedModal = (item: WatchlistItem) => {
    setSelectedItem(item);
    setWatchedRating(0);
    setWatchedDate(new Date().toISOString().split('T')[0]);
    setShowMarkWatchedModal(true);
  };

  const renderPriorityStars = (item: WatchlistItem) => {
    return (
      <div className="priority-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={`priority-star ${star <= item.priority ? 'filled' : ''}`}
            onClick={() => handleUpdatePriority(item, star)}
          />
        ))}
      </div>
    );
  };

  const renderRatingHearts = (item: WatchlistItem) => {
    return (
      <div className="rating-hearts">
        {[1, 2, 3, 4, 5].map((heart) => (
          <Heart
            key={heart}
            size={16}
            className={`rating-heart ${heart <= (item.myRating || 0) ? 'filled' : ''}`}
            onClick={() => handleUpdateRating(item, heart)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="watchlist-container">
      <div className="watchlist-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Collection
        </button>
        <h1>My Watchlist</h1>
        <button className="add-button" onClick={() => setShowAddModal(true)}>
          <Plus size={20} />
          Add Movie
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="watchlist-tabs">
        <button
          className={`tab ${activeTab === 'want_to_watch' ? 'active' : ''}`}
          onClick={() => setActiveTab('want_to_watch')}
        >
          Want to Watch
        </button>
        <button
          className={`tab ${activeTab === 'watched' ? 'active' : ''}`}
          onClick={() => setActiveTab('watched')}
        >
          Watched
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          {activeTab === 'want_to_watch'
            ? 'No movies in your watchlist yet. Add some!'
            : 'No watched movies yet.'}
        </div>
      ) : (
        <div className="watchlist-grid">
          {items.map((item) => (
            <div key={item.id} className="watchlist-card">
              <div className="card-poster">
                {item.posterUrl ? (
                  <img src={item.posterUrl} alt={item.title} />
                ) : (
                  <div className="no-poster">No Poster</div>
                )}
              </div>
              <div className="card-info">
                <h3 className="card-title">{item.title}</h3>
                <p className="card-year">{item.releaseYear}</p>
                {item.genre && <p className="card-genre">{item.genre}</p>}

                {activeTab === 'want_to_watch' ? (
                  <div className="card-priority">
                    <span className="label">Priority:</span>
                    {renderPriorityStars(item)}
                  </div>
                ) : (
                  <div className="card-rating">
                    <span className="label">Rating:</span>
                    {renderRatingHearts(item)}
                  </div>
                )}

                {item.watchedDate && (
                  <p className="card-watched-date">
                    Watched: {new Date(item.watchedDate).toLocaleDateString()}
                  </p>
                )}

                {item.notes && <p className="card-notes">{item.notes}</p>}
              </div>
              <div className="card-actions">
                {activeTab === 'want_to_watch' && (
                  <button
                    className="action-btn mark-watched"
                    onClick={() => openMarkWatchedModal(item)}
                    title="Mark as Watched"
                  >
                    <Eye size={18} />
                  </button>
                )}
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(item.id)}
                  title="Remove"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Movie Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); resetAddModal(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add to Watchlist</h2>

            {!selectedMovie ? (
              <>
                <form onSubmit={handleSearch} className="search-form">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for a movie..."
                    autoFocus
                  />
                  <button type="submit" disabled={searching}>
                    <Search size={20} />
                  </button>
                </form>

                {searching && <div className="loading">Searching...</div>}

                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((result) => (
                      <div
                        key={result.imdbID}
                        className="search-result"
                        onClick={() => handleSelectMovie(result.imdbID)}
                      >
                        {result.Poster !== 'N/A' ? (
                          <img src={result.Poster} alt={result.Title} />
                        ) : (
                          <div className="no-poster-small">No Poster</div>
                        )}
                        <div className="result-info">
                          <span className="result-title">{result.Title}</span>
                          <span className="result-year">{result.Year}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="selected-movie">
                <div className="movie-preview">
                  {selectedMovie.Poster !== 'N/A' ? (
                    <img src={selectedMovie.Poster} alt={selectedMovie.Title} />
                  ) : (
                    <div className="no-poster">No Poster</div>
                  )}
                  <div className="movie-details">
                    <h3>{selectedMovie.Title}</h3>
                    <p className="year">{selectedMovie.Year}</p>
                    <p className="genre">{selectedMovie.Genre}</p>
                    <p className="plot">{selectedMovie.Plot}</p>
                  </div>
                </div>

                <div className="add-form">
                  <div className="form-group">
                    <label>Priority</label>
                    <div className="priority-selector">
                      {[1, 2, 3, 4, 5].map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`priority-btn ${addPriority === p ? 'selected' : ''}`}
                          onClick={() => setAddPriority(p)}
                        >
                          <Star size={20} className={addPriority >= p ? 'filled' : ''} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Notes (optional)</label>
                    <textarea
                      value={addNotes}
                      onChange={(e) => setAddNotes(e.target.value)}
                      placeholder="Why do you want to watch this?"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => setSelectedMovie(null)}
                  >
                    Back
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleAddToWatchlist}
                    disabled={adding}
                  >
                    {adding ? 'Adding...' : 'Add to Watchlist'}
                  </button>
                </div>
              </div>
            )}

            <button className="close-modal" onClick={() => { setShowAddModal(false); resetAddModal(); }}>
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Mark as Watched Modal */}
      {showMarkWatchedModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowMarkWatchedModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2>Mark as Watched</h2>
            <p className="movie-title">{selectedItem.title}</p>

            <div className="form-group">
              <label>Your Rating</label>
              <div className="rating-selector">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`rating-btn ${watchedRating === r ? 'selected' : ''}`}
                    onClick={() => setWatchedRating(r)}
                  >
                    <Heart size={24} className={watchedRating >= r ? 'filled' : ''} />
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Date Watched</label>
              <input
                type="date"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowMarkWatchedModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleMarkAsWatched}>
                Mark as Watched
              </button>
            </div>

            <button className="close-modal" onClick={() => setShowMarkWatchedModal(false)}>
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
