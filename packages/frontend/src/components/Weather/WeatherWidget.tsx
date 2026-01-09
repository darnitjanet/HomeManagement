import { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, CloudSnow, CloudLightning, Wind } from 'lucide-react';
import { weatherApi } from '../../services/api';
import './WeatherWidget.css';

interface WeatherData {
  location: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  high: number;
  low: number;
}

interface WeatherWidgetProps {
  compact?: boolean;
}

const getWeatherIcon = (iconCode: string, size: number = 20) => {
  // OpenWeatherMap icon codes: https://openweathermap.org/weather-conditions
  const code = iconCode.slice(0, 2);

  switch (code) {
    case '01': // clear sky
      return <Sun size={size} className="weather-icon sun" />;
    case '02': // few clouds
    case '03': // scattered clouds
    case '04': // broken clouds
      return <Cloud size={size} className="weather-icon cloud" />;
    case '09': // shower rain
    case '10': // rain
      return <CloudRain size={size} className="weather-icon rain" />;
    case '11': // thunderstorm
      return <CloudLightning size={size} className="weather-icon storm" />;
    case '13': // snow
      return <CloudSnow size={size} className="weather-icon snow" />;
    case '50': // mist
      return <Wind size={size} className="weather-icon mist" />;
    default:
      return <Cloud size={size} className="weather-icon" />;
  }
};

export function WeatherWidget({ compact = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeather();
    // Refresh weather every 30 minutes
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadWeather = async () => {
    try {
      const response = await weatherApi.getCurrent();
      if (response.data.success) {
        setWeather(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || 'Failed to load weather');
      }
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Weather unavailable';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`weather-widget ${compact ? 'compact' : ''}`}>
        <div className="weather-loading">
          <Cloud size={compact ? 16 : 20} className="loading-icon" />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    if (compact) {
      return null; // Don't show anything in header if there's an error
    }
    return (
      <div className="weather-widget error">
        <Cloud size={24} />
        <span className="weather-error-text">{error || 'Weather unavailable'}</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="weather-widget compact">
        {getWeatherIcon(weather.icon, 18)}
        <span className="weather-temp">{weather.temperature}°F</span>
        <span className="weather-location">{weather.location}</span>
      </div>
    );
  }

  return (
    <div className="weather-widget expanded">
      <div className="weather-main">
        <div className="weather-icon-large">
          {getWeatherIcon(weather.icon, 48)}
        </div>
        <div className="weather-temp-main">
          <span className="temp-value">{weather.temperature}°</span>
          <span className="temp-unit">F</span>
        </div>
      </div>

      <div className="weather-details">
        <div className="weather-location-full">
          {weather.location}, {weather.country}
        </div>
        <div className="weather-description">{weather.description}</div>
        <div className="weather-stats">
          <span className="stat">
            <span className="stat-label">H:</span> {weather.high}°
          </span>
          <span className="stat">
            <span className="stat-label">L:</span> {weather.low}°
          </span>
          <span className="stat">
            <span className="stat-label">Feels:</span> {weather.feelsLike}°
          </span>
        </div>
        <div className="weather-extra">
          <span>Humidity: {weather.humidity}%</span>
          <span>Wind: {weather.windSpeed} mph</span>
        </div>
      </div>
    </div>
  );
}
