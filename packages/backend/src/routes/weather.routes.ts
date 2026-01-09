import { Router, Request, Response } from 'express';

const router = Router();

// Read env vars at request time (after dotenv has loaded them)
const getApiKey = () => process.env.OPENWEATHERMAP_API_KEY;
const getDefaultLocation = () => process.env.WEATHER_LOCATION || 'New York,US';

interface WeatherData {
  location: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
  sunrise: number;
  sunset: number;
  high: number;
  low: number;
}

// GET /api/weather - Get current weather
router.get('/', async (req: Request, res: Response) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(503).json({
        success: false,
        error: 'Weather API not configured',
        message: 'Please add your OpenWeatherMap API key to .env',
      });
    }

    const location = (req.query.location as string) || getDefaultLocation();

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=imperial`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        success: false,
        error: errorData.message || 'Failed to fetch weather data',
      });
    }

    const data = await response.json();

    const weather: WeatherData = {
      location: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      windSpeed: Math.round(data.wind.speed),
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      high: Math.round(data.main.temp_max),
      low: Math.round(data.main.temp_min),
    };

    res.json({
      success: true,
      data: weather,
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data',
    });
  }
});

// GET /api/weather/forecast - Get 5-day forecast
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === 'your_api_key_here') {
      return res.status(503).json({
        success: false,
        error: 'Weather API not configured',
      });
    }

    const location = (req.query.location as string) || getDefaultLocation();

    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=imperial`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        success: false,
        error: errorData.message || 'Failed to fetch forecast data',
      });
    }

    const data = await response.json();

    // Group by day and get daily highs/lows
    const dailyForecasts = new Map<string, any>();

    data.list.forEach((item: any) => {
      const date = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, {
          date,
          high: item.main.temp_max,
          low: item.main.temp_min,
          icon: item.weather[0].icon,
          description: item.weather[0].description,
        });
      } else {
        const existing = dailyForecasts.get(date);
        existing.high = Math.max(existing.high, item.main.temp_max);
        existing.low = Math.min(existing.low, item.main.temp_min);
      }
    });

    const forecast = Array.from(dailyForecasts.values()).slice(0, 5).map(day => ({
      ...day,
      high: Math.round(day.high),
      low: Math.round(day.low),
    }));

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    console.error('Forecast fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch forecast data',
    });
  }
});

export default router;
