import { useState } from 'react';
import { Heart } from 'lucide-react';
import { moviesApi } from '../../services/api';
import './OMDbSearchModal.css';

interface OMDbSearchModalProps {
  onClose: () => void;
  onMovieAdded: () => void;
}

interface SearchResult {
  Title: string;
  Year: string;
  imdbID: string;
  Type: string;
  Poster: string;
}

export function OMDbSearchModal({ onClose, onMovieAdded }: OMDbSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [addingMovie, setAddingMovie] = useState(false);

  // Form state for adding movie
  const [format, setFormat] = useState('');
  const [watchedStatus, setWatchedStatus] = useState('Not Watched');
  const [myRating, setMyRating] = useState<number>(0);
  const [personalNotes, setPersonalNotes] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setSearchResults([]);

    try {
      const response = await moviesApi.searchOMDb(searchQuery);
      if (response.data.success && response.data.data.Search) {
        setSearchResults(response.data.data.Search);
      } else {
        setError('No movies found. Try a different search term.');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to search OMDb');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMovie = async (imdbId: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await moviesApi.getOMDbDetails(imdbId);
      if (response.data.success) {
        setSelectedMovie(response.data.data);
        setShowDetails(true);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to get movie details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovie = async () => {
    if (!selectedMovie) return;

    setAddingMovie(true);
    setError('');

    try {
      await moviesApi.createMovieFromOMDb({
        imdbId: selectedMovie.tmdbID, // Use TMDB ID for lookup
        format: format || undefined,
        watchedStatus,
        myRating: myRating > 0 ? myRating : undefined,
        personalNotes: personalNotes || undefined,
      });

      onMovieAdded();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to add movie');
    } finally {
      setAddingMovie(false);
    }
  };

  const formatOptions = [
    'Blu-ray',
    'Blu-ray and Digital',
    'Blu-ray and DVD',
    'Digital',
    'DVD',
    'DVD and Digital',
    'DVD, Blu-ray, Digital',
    'VHS',
    'Unknown',
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content omdb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Search TMDB</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {!showDetails ? (
            <>
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  placeholder="Search for a movie..."
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
                  {searchResults.map((result) => (
                    <div
                      key={result.imdbID}
                      className="search-result-card"
                      onClick={() => handleSelectMovie(result.imdbID)}
                    >
                      {result.Poster && result.Poster !== 'N/A' ? (
                        <img src={result.Poster} alt={result.Title} />
                      ) : (
                        <div className="no-poster">No Image</div>
                      )}
                      <div className="result-info">
                        <h3>{result.Title}</h3>
                        <p>{result.Year} • {result.Type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="movie-details">
              <button className="back-button" onClick={() => setShowDetails(false)}>
                ← Back to search
              </button>

              <div className="details-content">
                {selectedMovie.Poster && selectedMovie.Poster !== 'N/A' && (
                  <img src={selectedMovie.Poster} alt={selectedMovie.Title} className="detail-poster" />
                )}

                <div className="detail-info">
                  <h3>{selectedMovie.Title}</h3>
                  <p className="metadata">
                    {selectedMovie.Year} • {selectedMovie.Rated} • {selectedMovie.Runtime}
                  </p>
                  <p className="genres">{selectedMovie.Genre}</p>
                  <p className="plot">{selectedMovie.Plot}</p>

                  <div className="credits">
                    <p><strong>Director:</strong> {selectedMovie.Director}</p>
                    <p><strong>Actors:</strong> {selectedMovie.Actors}</p>
                    {selectedMovie.Production && selectedMovie.Production !== 'N/A' && (
                      <p><strong>Studio:</strong> {selectedMovie.Production}</p>
                    )}
                    <p><strong>TMDB Rating:</strong> ⭐ {selectedMovie.imdbRating}/10</p>
                  </div>

                  <div className="add-form">
                    <h4>Add to Your Collection</h4>

                    <div className="form-row">
                      <label>
                        Format:
                        <select value={format} onChange={(e) => setFormat(e.target.value)}>
                          <option value="">Select format...</option>
                          {formatOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Watched Status:
                        <select value={watchedStatus} onChange={(e) => setWatchedStatus(e.target.value)}>
                          <option value="Not Watched">Not Watched</option>
                          <option value="Watched">Watched</option>
                        </select>
                      </label>
                    </div>

                    <div className="rating-field">
                      <span className="rating-label">My Rating:</span>
                      <div className="rating-selector">
                        {[1, 2, 3, 4, 5].map(r => (
                          <button
                            key={r}
                            type="button"
                            className={`heart ${myRating >= r ? 'filled' : ''}`}
                            onClick={() => setMyRating(r)}
                          >
                            <Heart size={24} fill={myRating >= r ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                        {myRating > 0 && (
                          <button type="button" onClick={() => setMyRating(0)} className="clear-rating">
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

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
                  onClick={handleAddMovie}
                  disabled={addingMovie}
                >
                  {addingMovie ? 'Adding...' : 'Add to Catalog'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
