import { Request, Response, NextFunction } from 'express';
import { WatchlistRepository } from '../repositories/watchlist.repository';
import { CreateWatchlistItemInput, UpdateWatchlistItemInput } from '../types';

const watchlistRepo = new WatchlistRepository();

/**
 * Get all watchlist items
 */
export const getAllItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as 'want_to_watch' | 'watched' | undefined;

    let items;
    if (status) {
      items = await watchlistRepo.getItemsByStatus(status);
    } else {
      items = await watchlistRepo.getAllItems();
    }

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single watchlist item
 */
export const getItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const item = await watchlistRepo.getItem(id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * Add item to watchlist
 */
export const addItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: CreateWatchlistItemInput = req.body;

    // Check for duplicate
    if (input.tmdbId) {
      const existing = await watchlistRepo.getByTmdbId(input.tmdbId);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'This movie is already in your watchlist',
          data: existing,
        });
      }
    }

    const id = await watchlistRepo.addItem(input);
    const item = await watchlistRepo.getItem(id);

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

/**
 * Update watchlist item
 */
export const updateItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const input: UpdateWatchlistItemInput = req.body;

    const existing = await watchlistRepo.getItem(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    await watchlistRepo.updateItem(id, input);
    const updated = await watchlistRepo.getItem(id);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark item as watched
 */
export const markAsWatched = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { rating, watchedDate } = req.body;

    const existing = await watchlistRepo.getItem(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    await watchlistRepo.markAsWatched(id, rating, watchedDate);
    const updated = await watchlistRepo.getItem(id);

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete item from watchlist
 */
export const deleteItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const existing = await watchlistRepo.getItem(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    await watchlistRepo.deleteItem(id);

    res.json({ success: true, message: 'Item removed from watchlist' });
  } catch (error) {
    next(error);
  }
};

/**
 * Search watchlist
 */
export const searchItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const items = await watchlistRepo.searchItems(query);

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};
