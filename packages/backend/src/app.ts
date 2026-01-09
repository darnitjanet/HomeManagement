import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import session from 'express-session';
import path from 'path';
import authRoutes from './routes/auth.routes';
import calendarRoutes from './routes/calendar.routes';
import syncRoutes from './routes/sync.routes';
import contactsRoutes from './routes/contacts.routes';
import moviesRoutes from './routes/movies.routes';
import gamesRoutes from './routes/games.routes';
import kidsRoutes from './routes/kids.routes';
import shoppingRoutes from './routes/shopping.routes';
import smartInputRoutes from './routes/smart-input.routes';
import recipesRoutes from './routes/recipes.routes';
import assetsRoutes from './routes/assets.routes';
import weatherRoutes from './routes/weather.routes';
import notesRoutes from './routes/notes.routes';
import todosRoutes from './routes/todos.routes';
import choresRoutes from './routes/chores.routes';
import notificationsRoutes from './routes/notifications.routes';
import moodRoutes from './routes/mood.routes';
import booksRoutes from './routes/books.routes';
import travelRoutes from './routes/travel.routes';
import pantryRoutes from './routes/pantry.routes';

// Import session store (will be implemented)
const SQLiteStore = require('connect-sqlite3')(session);

export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? false // In production, frontend is served from same origin
      : 'http://localhost:5173', // Vite dev server
    credentials: true,
  }));

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session middleware
  app.use(session({
    store: new SQLiteStore({
      db: 'sessions.db',
      dir: path.join(__dirname, '../database'),
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax', // Required for cross-port cookie handling in development
    },
  }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/sync', syncRoutes);
  app.use('/api/contacts', contactsRoutes);
  app.use('/api/movies', moviesRoutes);
  app.use('/api/games', gamesRoutes);
  app.use('/api/kids', kidsRoutes);
  app.use('/api/shopping', shoppingRoutes);
  app.use('/api/smart-input', smartInputRoutes);
  app.use('/api/recipes', recipesRoutes);
  app.use('/api/assets', assetsRoutes);
  app.use('/api/weather', weatherRoutes);
  app.use('/api/notes', notesRoutes);
  app.use('/api/todos', todosRoutes);
  app.use('/api/chores', choresRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/mood', moodRoutes);
  app.use('/api/books', booksRoutes);
  app.use('/api/travel', travelRoutes);
  app.use('/api/pantry', pantryRoutes);

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve static files in production (frontend build)
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../public')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    });
  });

  // 404 handler for API routes
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  return app;
}
