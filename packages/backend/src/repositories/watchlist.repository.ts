import { db } from '../config/database';
import { WatchlistItem, CreateWatchlistItemInput, UpdateWatchlistItemInput } from '../types';

export class WatchlistRepository {
  /**
   * Get all watchlist items
   */
  async getAllItems(): Promise<WatchlistItem[]> {
    const items = await db('movie_watchlist')
      .orderBy([
        { column: 'status', order: 'asc' }, // want_to_watch first
        { column: 'priority', order: 'desc' },
        { column: 'added_at', order: 'desc' },
      ]);

    return items.map(this.mapFromDb);
  }

  /**
   * Get items by status
   */
  async getItemsByStatus(status: 'want_to_watch' | 'watched'): Promise<WatchlistItem[]> {
    const items = await db('movie_watchlist')
      .where({ status })
      .orderBy([
        { column: 'priority', order: 'desc' },
        { column: status === 'watched' ? 'watched_date' : 'added_at', order: 'desc' },
      ]);

    return items.map(this.mapFromDb);
  }

  /**
   * Get a single watchlist item by ID
   */
  async getItem(id: number): Promise<WatchlistItem | null> {
    const item = await db('movie_watchlist').where({ id }).first();
    return item ? this.mapFromDb(item) : null;
  }

  /**
   * Get item by TMDB ID
   */
  async getByTmdbId(tmdbId: number): Promise<WatchlistItem | null> {
    const item = await db('movie_watchlist')
      .where({ tmdb_id: tmdbId })
      .first();
    return item ? this.mapFromDb(item) : null;
  }

  /**
   * Add item to watchlist
   */
  async addItem(input: CreateWatchlistItemInput): Promise<number> {
    const [id] = await db('movie_watchlist').insert({
      tmdb_id: input.tmdbId,
      title: input.title,
      poster_url: input.posterUrl,
      release_year: input.releaseYear,
      genre: input.genre,
      plot: input.plot,
      status: input.status || 'want_to_watch',
      priority: input.priority || 3,
      notes: input.notes,
      added_at: db.fn.now(),
    });
    return id;
  }

  /**
   * Update watchlist item
   */
  async updateItem(id: number, input: UpdateWatchlistItemInput): Promise<void> {
    const updateData: any = { updated_at: db.fn.now() };

    if (input.status !== undefined) updateData.status = input.status;
    if (input.myRating !== undefined) updateData.my_rating = input.myRating;
    if (input.watchedDate !== undefined) updateData.watched_date = input.watchedDate;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.notes !== undefined) updateData.notes = input.notes;

    await db('movie_watchlist').where({ id }).update(updateData);
  }

  /**
   * Mark item as watched
   */
  async markAsWatched(id: number, rating?: number, watchedDate?: string): Promise<void> {
    await db('movie_watchlist').where({ id }).update({
      status: 'watched',
      my_rating: rating,
      watched_date: watchedDate || new Date().toISOString().split('T')[0],
      updated_at: db.fn.now(),
    });
  }

  /**
   * Delete item from watchlist
   */
  async deleteItem(id: number): Promise<void> {
    await db('movie_watchlist').where({ id }).delete();
  }

  /**
   * Search watchlist items by title
   */
  async searchItems(query: string): Promise<WatchlistItem[]> {
    const items = await db('movie_watchlist')
      .where('title', 'like', `%${query}%`)
      .orderBy('title', 'asc');

    return items.map(this.mapFromDb);
  }

  /**
   * Map database row to WatchlistItem
   */
  private mapFromDb(row: any): WatchlistItem {
    return {
      id: row.id,
      tmdbId: row.tmdb_id,
      title: row.title,
      posterUrl: row.poster_url,
      releaseYear: row.release_year,
      genre: row.genre,
      plot: row.plot,
      status: row.status,
      myRating: row.my_rating,
      watchedDate: row.watched_date,
      priority: row.priority,
      notes: row.notes,
      addedAt: row.added_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
