import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { authApi } from '../../services/api';
import { SmartInput } from './SmartInput';
import { WeatherWidget } from '../Weather/WeatherWidget';
import { NotificationBell } from '../Notifications';
import './Header.css';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const { isAuthenticated, setAuthenticated } = useCalendarStore();
  const [showInventoryMenu, setShowInventoryMenu] = useState(false);

  const inventoryPages = ['movies', 'games', 'books', 'assets'];
  const isInventoryPage = inventoryPages.includes(currentPage);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authApi.getStatus();
      setAuthenticated(response.data.authenticated);
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setAuthenticated(false);
    }
  };

  const handleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google';
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setAuthenticated(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleInventoryClick = (page: string) => {
    onNavigate(page);
    setShowInventoryMenu(false);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="home-button" onClick={() => onNavigate('home')}>
          Home Management
        </button>
        <nav className="main-nav">
          <button
            className={currentPage === 'calendar' ? 'active' : ''}
            onClick={() => onNavigate('calendar')}
          >
            Calendar
          </button>
          <button
            className={currentPage === 'contacts' ? 'active' : ''}
            onClick={() => onNavigate('contacts')}
          >
            Contacts
          </button>
          <button
            className={currentPage === 'tasks' ? 'active' : ''}
            onClick={() => onNavigate('tasks')}
          >
            Tasks
          </button>
          <button
            className={currentPage === 'shopping' ? 'active' : ''}
            onClick={() => onNavigate('shopping')}
          >
            Shopping
          </button>
          <button
            className={currentPage === 'recipes' ? 'active' : ''}
            onClick={() => onNavigate('recipes')}
          >
            Recipes
          </button>
          <button
            className={currentPage === 'kids' ? 'active' : ''}
            onClick={() => onNavigate('kids')}
          >
            Kids
          </button>
          <button
            className={currentPage === 'mood' ? 'active' : ''}
            onClick={() => onNavigate('mood')}
          >
            Mood
          </button>
          <button
            className={currentPage === 'travel' ? 'active' : ''}
            onClick={() => onNavigate('travel')}
          >
            Travel
          </button>
          <div
            className="nav-dropdown"
            onMouseEnter={() => setShowInventoryMenu(true)}
            onMouseLeave={() => setShowInventoryMenu(false)}
          >
            <button className={`dropdown-trigger ${isInventoryPage ? 'active' : ''}`}>
              Inventory <ChevronDown size={14} />
            </button>
            {showInventoryMenu && (
              <div className="dropdown-menu">
                <button
                  className={currentPage === 'movies' ? 'active' : ''}
                  onClick={() => handleInventoryClick('movies')}
                >
                  Movies
                </button>
                <button
                  className={currentPage === 'games' ? 'active' : ''}
                  onClick={() => handleInventoryClick('games')}
                >
                  Games
                </button>
                <button
                  className={currentPage === 'books' ? 'active' : ''}
                  onClick={() => handleInventoryClick('books')}
                >
                  Books
                </button>
                <button
                  className={currentPage === 'assets' ? 'active' : ''}
                  onClick={() => handleInventoryClick('assets')}
                >
                  Home Assets
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      <SmartInput />

      <WeatherWidget compact />

      <NotificationBell />

      {isAuthenticated ? (
        <button className="logout-button outline" onClick={handleLogout}>
          Logout
        </button>
      ) : (
        <button className="login-button primary" onClick={handleLogin}>
          Login with Google
        </button>
      )}
    </header>
  );
}
