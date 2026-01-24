import { Calendar, Users, Film, Gamepad2, Star, ShoppingCart, ChefHat, Package, Box, Monitor, ClipboardCheck, Heart, BookOpen, MapPin, UtensilsCrossed, Flower2, AlertTriangle, Scale, Leaf } from 'lucide-react';
import { WeatherWidget } from '../Weather/WeatherWidget';
import './HomePage.css';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  // All features combined and sorted alphabetically by title
  const allFeatures = [
    { id: 'books', icon: BookOpen, title: 'Books', color: '#dc9e33' },
    { id: 'calendar', icon: Calendar, title: 'Calendar', color: '#5b768a' },
    { id: 'chores', icon: ClipboardCheck, title: 'Chores', color: '#5b768a' },
    { id: 'contacts', icon: Users, title: 'Contacts', color: '#da6b34' },
    { id: 'emergency', icon: AlertTriangle, title: 'Emergency', color: '#da6b34' },
    { id: 'family-rules', icon: Scale, title: 'Family Rules', color: '#5b768a' },
    { id: 'games', icon: Gamepad2, title: 'Games', color: '#5b768a' },
    { id: 'assets', icon: Box, title: 'Home Assets', color: '#5b768a' },
    { id: 'kids', icon: Star, title: 'Kids Rewards', color: '#dc9e33' },
    { id: 'mood', icon: Heart, title: 'Mood', color: '#da6b34' },
    { id: 'movies', icon: Film, title: 'Movies', color: '#dc9e33' },
    { id: 'packages', icon: Package, title: 'Packages', color: '#da6b34' },
    { id: 'pantry', icon: UtensilsCrossed, title: 'Pantry', color: '#dc9e33' },
    { id: 'plants', icon: Flower2, title: 'Plants', color: '#dc9e33' },
    { id: 'recipes', icon: ChefHat, title: 'Recipes', color: '#da6b34' },
    { id: 'seasonal-tasks', icon: Leaf, title: 'Seasonal', color: '#5b768a' },
    { id: 'shopping', icon: ShoppingCart, title: 'Shopping', color: '#dc9e33' },
    { id: 'travel', icon: MapPin, title: 'Travel', color: '#5b768a' },
  ];

  return (
    <div className="home-page">
      <div className="home-banner">
        <img src="/HomeHub.png" alt="Home Hub" />
      </div>

      <div className="weather-section">
        <WeatherWidget />
        <button className="kiosk-mode-btn" onClick={() => onNavigate('kiosk')}>
          <Monitor size={18} />
          <span>Kiosk Mode</span>
        </button>
      </div>

      <div className="features-grid">
        {allFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              className="feature-card"
              onClick={() => onNavigate(feature.id)}
              style={{ borderColor: feature.color }}
            >
              <div className="feature-icon" style={{ backgroundColor: `${feature.color}20` }}>
                <Icon size={26} color={feature.color} strokeWidth={1.5} />
              </div>
              <h2>{feature.title}</h2>
            </button>
          );
        })}
      </div>
    </div>
  );
}
