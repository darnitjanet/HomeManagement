import { useState, useEffect } from 'react';
import { moviesApi } from '../../services/api';
import './MovieForm.css';

interface Movie {
  id: number;
  title: string;
  type: string;
  format?: string;
  watchedStatus: string;
  myRating?: number;
  mpaaRating?: string;
  genre?: string;
  releaseYear?: string;
  director?: string;
  actors?: string;
  plot?: string;
  personalNotes?: string;
  runtime?: string;
  languages?: string;
  country?: string;
}

interface MovieFormProps {
  onClose: () => void;
  onMovieAdded: () => void;
  movie?: Movie | null;
}

export function MovieForm({ onClose, onMovieAdded, movie }: MovieFormProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Movie');
  const [format, setFormat] = useState('');
  const [watchedStatus, setWatchedStatus] = useState('Not Watched');
  const [myRating, setMyRating] = useState<number>(0);
  const [mpaaRating, setMpaaRating] = useState('');
  const [genre, setGenre] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [director, setDirector] = useState('');
  const [actors, setActors] = useState('');
  const [plot, setPlot] = useState('');
  const [personalNotes, setPersonalNotes] = useState('');
  const [runtime, setRuntime] = useState('');
  const [languages, setLanguages] = useState('');
  const [country, setCountry] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!movie;

  // Populate form when editing
  useEffect(() => {
    if (movie) {
      setTitle(movie.title || '');
      setType(movie.type || 'Movie');
      setFormat(movie.format || '');
      setWatchedStatus(movie.watchedStatus || 'Not Watched');
      setMyRating(movie.myRating || 0);
      setMpaaRating(movie.mpaaRating || '');
      setGenre(movie.genre || '');
      setReleaseYear(movie.releaseYear || '');
      setDirector(movie.director || '');
      setActors(movie.actors || '');
      setPlot(movie.plot || '');
      setPersonalNotes(movie.personalNotes || '');
      setRuntime(movie.runtime || '');
      setLanguages(movie.languages || '');
      setCountry(movie.country || '');
    }
  }, [movie]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const movieData = {
        title,
        type,
        format: format || undefined,
        watchedStatus,
        myRating: myRating > 0 ? myRating : undefined,
        mpaaRating: mpaaRating || undefined,
        genre: genre || undefined,
        releaseYear: releaseYear || undefined,
        director: director || undefined,
        actors: actors || undefined,
        plot: plot || undefined,
        personalNotes: personalNotes || undefined,
        runtime: runtime || undefined,
        languages: languages || undefined,
        country: country || undefined,
      };

      if (isEditing && movie) {
        await moviesApi.updateMovie(movie.id, movieData);
      } else {
        await moviesApi.createMovie(movieData);
      }

      onMovieAdded();
      onClose();
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'add'} movie`);
    } finally {
      setSaving(false);
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

  const mpaaOptions = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'NR'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content movie-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Movie' : 'Add Movie Manually'}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-grid">
              <label className="required">
                Title:
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter movie title"
                  required
                />
              </label>

              <label>
                Release Year:
                <input
                  type="text"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  placeholder="e.g., 2024"
                />
              </label>

              <label>
                Type:
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="Movie">Movie</option>
                  <option value="Series">Series</option>
                  <option value="Episode">Episode</option>
                  <option value="All">All</option>
                </select>
              </label>

              <label>
                Runtime:
                <input
                  type="text"
                  value={runtime}
                  onChange={(e) => setRuntime(e.target.value)}
                  placeholder="e.g., 120 min"
                />
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Format & Status</h3>
            <div className="form-grid">
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

              <label>
                MPAA Rating:
                <select value={mpaaRating} onChange={(e) => setMpaaRating(e.target.value)}>
                  <option value="">Select rating...</option>
                  {mpaaOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>

              <label>
                My Rating:
                <div className="rating-selector">
                  {[1, 2, 3, 4, 5].map(r => (
                    <span
                      key={r}
                      className={`heart ${myRating >= r ? 'filled' : ''}`}
                      onClick={() => setMyRating(r)}
                    >
                      ♥
                    </span>
                  ))}
                  {myRating > 0 && (
                    <button type="button" onClick={() => setMyRating(0)} className="clear-rating">
                      Clear
                    </button>
                  )}
                </div>
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Details</h3>
            <div className="form-grid">
              <label className="full-width">
                Genre:
                <input
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g., Action, Comedy, Drama"
                />
              </label>

              <label>
                Director:
                <input
                  type="text"
                  value={director}
                  onChange={(e) => setDirector(e.target.value)}
                  placeholder="Director name"
                />
              </label>

              <label>
                Languages:
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="e.g., English, Spanish"
                />
              </label>

              <label className="full-width">
                Actors:
                <input
                  type="text"
                  value={actors}
                  onChange={(e) => setActors(e.target.value)}
                  placeholder="Main actors (comma-separated)"
                />
              </label>

              <label>
                Country:
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g., USA, UK"
                />
              </label>

              <label className="full-width">
                Plot:
                <textarea
                  value={plot}
                  onChange={(e) => setPlot(e.target.value)}
                  placeholder="Movie plot/description"
                  rows={3}
                />
              </label>

              <label className="full-width">
                Personal Notes:
                <textarea
                  value={personalNotes}
                  onChange={(e) => setPersonalNotes(e.target.value)}
                  placeholder="Your personal notes about this movie"
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
              {saving ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Movie')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
