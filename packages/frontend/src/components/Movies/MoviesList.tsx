import { useState, useEffect } from 'react';
import { Trash2, Edit } from 'lucide-react';
import { moviesApi } from '../../services/api';
import { OMDbSearchModal } from './OMDbSearchModal';
import { MovieForm } from './MovieForm';
import './MoviesList.css';

interface Movie {
  id: number;
  title: string;
  type: string;
  watchedStatus: string;
  imdbId?: string;
  tmdbId?: number;
  starRating?: number;
  myRating?: number;
  mpaaRating?: string;
  format?: string;
  genre?: string;
  plot?: string;
  releaseYear?: string;
  runtime?: string;
  languages?: string;
  country?: string;
  director?: string;
  actors?: string;
  productionCompany?: string;
  posterUrl?: string;
  personalNotes?: string;
  tags?: MovieTag[];
}

interface MovieTag {
  id: number;
  name: string;
  color: string;
  priority: number;
}

export function MoviesList() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [_tags, setTags] = useState<MovieTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showOMDbModal, setShowOMDbModal] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedWatchedStatus, setSelectedWatchedStatus] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [selectedMpaaRating, setSelectedMpaaRating] = useState<string>('');

  useEffect(() => {
    loadMovies();
    loadTags();
  }, []);

  const loadMovies = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await moviesApi.getAllMovies();
      if (response.data.success) {
        setMovies(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load movies');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await moviesApi.getAllTags();
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
      loadMovies();
      return;
    }

    setLoading(true);
    try {
      const response = await moviesApi.searchMovies(query);
      if (response.data.success) {
        setMovies(response.data.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    const filters: any = {};
    if (selectedGenre) filters.genre = selectedGenre;
    if (selectedRating !== null) filters.myRating = selectedRating;
    if (selectedWatchedStatus) filters.watchedStatus = selectedWatchedStatus;
    if (selectedFormat) filters.format = selectedFormat;
    if (selectedMpaaRating) filters.mpaaRating = selectedMpaaRating;

    setLoading(true);
    try {
      const response = await moviesApi.filterMovies(filters);
      if (response.data.success) {
        setMovies(response.data.data);
      }
    } catch (error) {
      console.error('Filter failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
    setSelectedRating(null);
    setSelectedWatchedStatus('');
    setSelectedFormat('');
    setSelectedMpaaRating('');
    loadMovies();
  };

  const handleDeleteMovie = async (id: number) => {
    if (!confirm('Are you sure you want to delete this movie?')) return;

    try {
      await moviesApi.deleteMovie(id);
      loadMovies();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleUpdateRating = async (id: number, rating: number) => {
    try {
      await moviesApi.updateMyRating(id, rating);
      loadMovies();
    } catch (error) {
      console.error('Update rating failed:', error);
    }
  };

  const uniqueGenres = Array.from(new Set(
    movies
      .map(m => m.genre?.split(',').map(g => g.trim()))
      .flat()
      .filter(Boolean)
  )).sort();

  const uniqueFormats = Array.from(new Set(
    movies.map(m => m.format).filter(Boolean)
  )).sort();

  const uniqueMpaaRatings = Array.from(new Set(
    movies.map(m => m.mpaaRating).filter(Boolean)
  )).sort();

  useEffect(() => {
    if (selectedGenre || selectedRating !== null || selectedWatchedStatus || selectedFormat || selectedMpaaRating) {
      handleFilter();
    }
  }, [selectedGenre, selectedRating, selectedWatchedStatus, selectedFormat, selectedMpaaRating]);

  if (loading && movies.length === 0) {
    return (
      <div className="movies-loading">
        <div className="loading-spinner"></div>
        <p>Loading movies...</p>
      </div>
    );
  }

  return (
    <div className="movies-page">
      <div className="movies-banner">
        <img src="/Movies.png" alt="Movie Catalog" />
      </div>

      <div className="movies-header">
        <div className="header-actions">
          <button className="primary" onClick={() => setShowOMDbModal(true)}>
            + Add from TMDB
          </button>
          <button className="secondary" onClick={() => setShowManualForm(true)}>
            + Add Manually
          </button>
        </div>
      </div>

      <div className="movies-filters">
        <input
          type="text"
          placeholder="Search by title..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />

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
            <option key={r} value={r}>{r} ♥</option>
          ))}
        </select>

        <select
          value={selectedWatchedStatus}
          onChange={(e) => setSelectedWatchedStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="Watched">Watched</option>
          <option value="Not Watched">Not Watched</option>
        </select>

        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value)}
        >
          <option value="">All Formats</option>
          {uniqueFormats.map(format => (
            <option key={format} value={format}>{format}</option>
          ))}
        </select>

        <select
          value={selectedMpaaRating}
          onChange={(e) => setSelectedMpaaRating(e.target.value)}
        >
          <option value="">All Ratings</option>
          {uniqueMpaaRatings.map(rating => (
            <option key={rating} value={rating}>{rating}</option>
          ))}
        </select>

        <button onClick={handleClearFilters} className="clear-filters">
          Clear All Filters
        </button>
      </div>

      <div className="results-count">
        {movies.length} result{movies.length !== 1 ? 's' : ''}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="movies-table-container">
        <table className="movies-table">
          <thead>
            <tr>
              <th>Poster</th>
              <th>Title</th>
              <th>Format</th>
              <th>Rating</th>
              <th>My Rating</th>
              <th>TMDB</th>
              <th>Genre</th>
              <th>Year</th>
              <th>Director</th>
              <th>Studio</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {movies.map((movie) => (
              <tr key={movie.id}>
                <td>
                  {movie.posterUrl && movie.posterUrl !== 'N/A' ? (
                    <img src={movie.posterUrl} alt={movie.title} className="poster-thumb" />
                  ) : (
                    <div className="poster-placeholder">No Image</div>
                  )}
                </td>
                <td className="title-cell">{movie.title}</td>
                <td>
                  {movie.format && (
                    <span className="badge format-badge">{movie.format}</span>
                  )}
                </td>
                <td>
                  {movie.mpaaRating && (
                    <span className="badge mpaa-badge">{movie.mpaaRating}</span>
                  )}
                </td>
                <td>
                  <div className="rating-hearts">
                    {[1, 2, 3, 4, 5].map(r => (
                      <span
                        key={r}
                        className={`heart ${movie.myRating && r <= movie.myRating ? 'filled' : ''}`}
                        onClick={() => handleUpdateRating(movie.id, r)}
                      >
                        ♥
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  {movie.starRating ? (
                    <span className="star-rating">★ {movie.starRating.toFixed(1)}</span>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  {movie.genre && movie.genre.split(',').slice(0, 2).map((g, i) => (
                    <span key={i} className="badge genre-badge">{g.trim()}</span>
                  ))}
                </td>
                <td>{movie.releaseYear || '-'}</td>
                <td>{movie.director || '-'}</td>
                <td>{movie.productionCompany?.split(',')[0] || '-'}</td>
                <td>
                  <span className={`badge status-badge ${movie.watchedStatus === 'Watched' ? 'watched' : 'not-watched'}`}>
                    {movie.watchedStatus}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => {
                      setEditingMovie(movie);
                      setShowManualForm(true);
                    }}
                    className="edit-btn"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteMovie(movie.id)}
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

        {movies.length === 0 && !loading && (
          <div className="no-movies">
            <p>No movies found. Add your first movie to get started!</p>
          </div>
        )}
      </div>

      {showOMDbModal && (
        <OMDbSearchModal
          onClose={() => setShowOMDbModal(false)}
          onMovieAdded={loadMovies}
        />
      )}

      {showManualForm && (
        <MovieForm
          onClose={() => {
            setShowManualForm(false);
            setEditingMovie(null);
          }}
          onMovieAdded={loadMovies}
          movie={editingMovie}
        />
      )}
    </div>
  );
}
