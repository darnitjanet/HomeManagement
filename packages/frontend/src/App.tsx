import { useEffect, useState } from 'react';
import { enableGlobalTouchScroll } from './hooks/useTouchScroll';
import { CalendarView } from './components/Calendar/CalendarView';
import { ContactsList } from './components/Contacts/ContactsList';
import { MoviesList } from './components/Movies/MoviesList';
import { GamesList } from './components/Games/GamesList';
import { KidsRewards } from './components/Kids/KidsRewards';
import { ShoppingList } from './components/Shopping/ShoppingList';
import { RecipesList } from './components/Recipes/RecipesList';
import { AssetsList } from './components/Assets/AssetsList';
import { TodoList } from './components/Todos/TodoList';
import { ChoresList } from './components/Chores/ChoresList';
import { MoodTracker } from './components/Mood/MoodTracker';
import { BooksList } from './components/Books/BooksList';
import { TravelMap } from './components/Travel/TravelMap';
import { PantryInventory } from './components/Pantry/PantryInventory';
import { PlantsList } from './components/Plants/PlantsList';
import { FamilyRulesPage } from './components/FamilyRules/FamilyRulesPage';
import { EmergencyManagement } from './components/Emergency/EmergencyManagement';
import { SeasonalTasks } from './components/SeasonalTasks/SeasonalTasks';
import { PackagesList } from './components/Packages/PackagesList';
import { HomePage } from './components/HomePage/HomePage';
import { Header } from './components/Navigation/Header';
import { KioskDashboard } from './components/Kiosk/KioskDashboard';
import { ToastContainer } from './components/Notifications';
import { VirtualKeyboard } from './components/shared/VirtualKeyboard';
import { authApi } from './services/api';
import { useCalendarStore } from './stores/useCalendarStore';
import './App.css';

function App() {
  const { isAuthenticated, setAuthenticated } = useCalendarStore();
  const [checking, setChecking] = useState(true);
  // Check URL for kiosk mode on initial load
  const initialPage = window.location.pathname === '/kiosk' ? 'kiosk' : 'home';
  const [currentPage, setCurrentPage] = useState(initialPage);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Enable touch scrolling for Chromium/Wayland on Pi
  useEffect(() => {
    const cleanup = enableGlobalTouchScroll();
    return cleanup;
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await authApi.getStatus();
      setAuthenticated(response.data.authenticated);
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthenticated(false);
    } finally {
      setChecking(false);
    }
  };

  const handleLogin = () => {
    // Direct browser redirect to OAuth endpoint
    window.location.href = '/api/auth/google';
  };

  if (checking) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>🏡 Home Management</h1>
            <p>Manage your calendar, household items, and more</p>
          </div>

          <div className="login-body">
            <p>Sign in with your Google account to get started</p>
            <button className="primary login-button" onClick={handleLogin}>
              <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="login-footer">
            <p>First time using this app?</p>
            <p>Once signed in, you'll be able to view and manage your Google Calendar</p>
          </div>
        </div>
      </div>
    );
  }

  // Kiosk mode is full-screen without header
  if (currentPage === 'kiosk') {
    return (
      <div className="app kiosk-mode">
        <KioskDashboard onExit={() => setCurrentPage('home')} />
      </div>
    );
  }

  return (
    <div className="app">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="app-main">
        {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
        {currentPage === 'calendar' && <CalendarView />}
        {currentPage === 'contacts' && <ContactsList />}
        {currentPage === 'tasks' && <TodoList />}
        {currentPage === 'movies' && <MoviesList />}
        {currentPage === 'games' && <GamesList />}
        {currentPage === 'kids' && <KidsRewards />}
        {currentPage === 'chores' && <ChoresList />}
        {currentPage === 'mood' && <MoodTracker />}
        {currentPage === 'shopping' && <ShoppingList />}
        {currentPage === 'recipes' && <RecipesList />}
        {currentPage === 'assets' && <AssetsList />}
        {currentPage === 'books' && <BooksList />}
        {currentPage === 'travel' && <TravelMap />}
        {currentPage === 'pantry' && <PantryInventory />}
        {currentPage === 'plants' && <PlantsList />}
        {currentPage === 'family-rules' && <FamilyRulesPage />}
        {currentPage === 'emergency' && <EmergencyManagement />}
        {currentPage === 'seasonal-tasks' && <SeasonalTasks />}
        {currentPage === 'packages' && <PackagesList />}
      </main>
      <ToastContainer />
      <VirtualKeyboard />
    </div>
  );
}

export default App;
