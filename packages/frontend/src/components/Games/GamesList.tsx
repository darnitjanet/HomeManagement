import { useState, useEffect } from 'react';
import { Trash2, Users, Clock, Edit } from 'lucide-react';
import { gamesApi } from '../../services/api';
import { GameForm } from './GameForm';
import { LoanModal } from './LoanModal';
import './GamesList.css';

interface GameTag {
  id: number;
  name: string;
  color: string;
  priority: number;
}

interface GameLoan {
  id: number;
  gameId: number;
  borrowerName: string;
  borrowerContact?: string;
  loanedDate: string;
  expectedReturnDate?: string;
  returnedDate?: string;
  reminderSent: boolean;
  notes?: string;
}

interface Game {
  id: number;
  name: string;
  type: string;
  playerCountMin?: number;
  playerCountMax?: number;
  condition?: string;
  platform?: string;
  notes?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  tags?: GameTag[];
  currentLoan?: GameLoan;
}

const GAME_TYPES = ['Board Game', 'Puzzle', 'Card Game', 'Party Game', 'Video Game'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor'];

export function GamesList() {
  const [games, setGames] = useState<Game[]>([]);
  const [tags, setTags] = useState<GameTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('');

  useEffect(() => {
    loadGames();
    loadTags();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await gamesApi.getAllGames();
      if (response.data.success) {
        setGames(response.data.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await gamesApi.getAllTags();
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
      loadGames();
      return;
    }

    setLoading(true);
    try {
      const response = await gamesApi.searchGames(query);
      if (response.data.success) {
        setGames(response.data.data);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    const filters: any = {};
    if (selectedType) filters.type = selectedType;
    if (selectedCondition) filters.condition = selectedCondition;
    if (selectedAvailability === 'available') filters.available = true;
    if (selectedAvailability === 'on-loan') filters.available = false;

    setLoading(true);
    try {
      const response = await gamesApi.filterGames(filters);
      if (response.data.success) {
        setGames(response.data.data);
      }
    } catch (error) {
      console.error('Filter failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedCondition('');
    setSelectedAvailability('');
    loadGames();
  };

  const handleDeleteGame = async (id: number) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
      await gamesApi.deleteGame(id);
      loadGames();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleLoanGame = (game: Game) => {
    setSelectedGame(game);
    setShowLoanModal(true);
  };

  const handleReturnGame = async (id: number) => {
    try {
      await gamesApi.returnGame(id);
      loadGames();
    } catch (error) {
      console.error('Return failed:', error);
    }
  };

  const getDaysSinceLoaned = (loanedDate: string): number => {
    const loaned = new Date(loanedDate);
    const today = new Date();
    const diffTime = today.getTime() - loaned.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatPlayerCount = (min?: number, max?: number): string => {
    if (!min && !max) return '-';
    if (min === max) return `${min}`;
    if (!max) return `${min}+`;
    return `${min}-${max}`;
  };

  useEffect(() => {
    if (selectedType || selectedCondition || selectedAvailability) {
      handleFilter();
    }
  }, [selectedType, selectedCondition, selectedAvailability]);

  if (loading && games.length === 0) {
    return (
      <div className="games-loading">
        <div className="loading-spinner"></div>
        <p>Loading games...</p>
      </div>
    );
  }

  return (
    <div className="games-page">
      <div className="games-banner">
        <img src="/Games.png" alt="Games Library" />
      </div>

      <div className="games-header">
        <div className="header-actions">
          <button className="primary" onClick={() => setShowAddForm(true)}>
            + Add Game
          </button>
        </div>
      </div>

      <div className="games-filters">
        <input
          type="text"
          placeholder="Search games..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          <option value="">All Types</option>
          {GAME_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          value={selectedCondition}
          onChange={(e) => setSelectedCondition(e.target.value)}
        >
          <option value="">All Conditions</option>
          {CONDITIONS.map(condition => (
            <option key={condition} value={condition}>{condition}</option>
          ))}
        </select>

        <select
          value={selectedAvailability}
          onChange={(e) => setSelectedAvailability(e.target.value)}
        >
          <option value="">All Availability</option>
          <option value="available">Available</option>
          <option value="on-loan">On Loan</option>
        </select>

        <button onClick={handleClearFilters} className="clear-filters">
          Clear All Filters
        </button>
      </div>

      <div className="results-count">
        {games.length} game{games.length !== 1 ? 's' : ''}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="games-grid">
        {games.map((game) => {
          const daysSinceLoaned = game.currentLoan
            ? getDaysSinceLoaned(game.currentLoan.loanedDate)
            : 0;
          const isOverdue = daysSinceLoaned >= 30;

          return (
            <div key={game.id} className={`game-card ${game.currentLoan ? 'on-loan' : ''}`}>
              <div className="game-card-header">
                <h3 className="game-name">{game.name}</h3>
                <div className="card-actions">
                  <button
                    onClick={() => {
                      setEditingGame(game);
                      setShowAddForm(true);
                    }}
                    className="edit-btn"
                    title="Edit"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteGame(game.id)}
                    className="delete-btn"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="game-details">
                <span className="badge type-badge">{game.type}</span>
                {game.condition && (
                  <span className={`badge condition-badge ${game.condition.toLowerCase()}`}>
                    {game.condition}
                  </span>
                )}
                {game.platform && (
                  <span className="badge platform-badge">{game.platform}</span>
                )}
              </div>

              <div className="game-info">
                <div className="info-row">
                  <Users size={16} />
                  <span>{formatPlayerCount(game.playerCountMin, game.playerCountMax)} players</span>
                </div>
              </div>

              {game.tags && game.tags.length > 0 && (
                <div className="game-tags">
                  {game.tags.map(tag => (
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

              {game.currentLoan ? (
                <div className={`loan-status ${isOverdue ? 'overdue' : ''}`}>
                  <div className="loan-info">
                    <Clock size={16} />
                    <span>
                      Loaned to <strong>{game.currentLoan.borrowerName}</strong>
                    </span>
                  </div>
                  <div className="loan-days">
                    {daysSinceLoaned} day{daysSinceLoaned !== 1 ? 's' : ''} ago
                    {isOverdue && <span className="overdue-badge">Overdue!</span>}
                  </div>
                  <button
                    className="return-btn"
                    onClick={() => handleReturnGame(game.id)}
                  >
                    Mark Returned
                  </button>
                </div>
              ) : (
                <button
                  className="loan-btn"
                  onClick={() => handleLoanGame(game)}
                >
                  Loan Out
                </button>
              )}
            </div>
          );
        })}
      </div>

      {games.length === 0 && !loading && (
        <div className="no-games">
          <p>No games found. Add your first game to get started!</p>
        </div>
      )}

      {showAddForm && (
        <GameForm
          onClose={() => {
            setShowAddForm(false);
            setEditingGame(null);
          }}
          onGameAdded={loadGames}
          tags={tags}
          game={editingGame}
        />
      )}

      {showLoanModal && selectedGame && (
        <LoanModal
          game={selectedGame}
          onClose={() => {
            setShowLoanModal(false);
            setSelectedGame(null);
          }}
          onLoanCreated={loadGames}
        />
      )}
    </div>
  );
}
