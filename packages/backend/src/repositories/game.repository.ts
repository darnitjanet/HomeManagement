import { db } from '../config/database';
import { Game, GameLoan, GameTag, CreateGameInput, UpdateGameInput, CreateLoanInput } from '../types';

export class GameRepository {
  /**
   * Get all games with their tags and current loan status
   */
  async getAllGames(): Promise<Game[]> {
    const games = await db('games').orderBy('name', 'asc');

    for (const game of games) {
      game.tags = await this.getGameTags(game.id);
      game.currentLoan = await this.getActiveLoan(game.id);
    }

    return games.map(this.mapFromDb);
  }

  /**
   * Get games by type
   */
  async getGamesByType(type: string): Promise<Game[]> {
    const games = await db('games')
      .where('type', type)
      .orderBy('name', 'asc');

    for (const game of games) {
      game.tags = await this.getGameTags(game.id);
      game.currentLoan = await this.getActiveLoan(game.id);
    }

    return games.map(this.mapFromDb);
  }

  /**
   * Get games by tag
   */
  async getGamesByTag(tagId: number): Promise<Game[]> {
    const games = await db('games')
      .join('game_tag_assignments', 'games.id', 'game_tag_assignments.game_id')
      .where('game_tag_assignments.tag_id', tagId)
      .select('games.*')
      .orderBy('games.name', 'asc');

    for (const game of games) {
      game.tags = await this.getGameTags(game.id);
      game.currentLoan = await this.getActiveLoan(game.id);
    }

    return games.map(this.mapFromDb);
  }

  /**
   * Get available games (not on loan)
   */
  async getAvailableGames(): Promise<Game[]> {
    const gamesOnLoan = await db('game_loans')
      .whereNull('returned_date')
      .select('game_id');

    const loanedGameIds = gamesOnLoan.map(l => l.game_id);

    const games = await db('games')
      .whereNotIn('id', loanedGameIds)
      .orderBy('name', 'asc');

    for (const game of games) {
      game.tags = await this.getGameTags(game.id);
    }

    return games.map(this.mapFromDb);
  }

  /**
   * Get games currently on loan
   */
  async getGamesOnLoan(): Promise<Game[]> {
    const games = await db('games')
      .join('game_loans', 'games.id', 'game_loans.game_id')
      .whereNull('game_loans.returned_date')
      .select('games.*')
      .orderBy('game_loans.loaned_date', 'asc');

    for (const game of games) {
      game.tags = await this.getGameTags(game.id);
      game.currentLoan = await this.getActiveLoan(game.id);
    }

    return games.map(this.mapFromDb);
  }

  /**
   * Search games by name
   */
  async searchGames(query: string): Promise<Game[]> {
    const games = await db('games')
      .where('name', 'like', `%${query}%`)
      .orWhere('notes', 'like', `%${query}%`)
      .orderBy('name', 'asc');

    for (const game of games) {
      game.tags = await this.getGameTags(game.id);
      game.currentLoan = await this.getActiveLoan(game.id);
    }

    return games.map(this.mapFromDb);
  }

  /**
   * Filter games by multiple criteria
   */
  async filterGames(filters: {
    type?: string;
    condition?: string;
    platform?: string;
    available?: boolean;
  }): Promise<Game[]> {
    let query = db('games');

    if (filters.type) {
      query = query.where('type', filters.type);
    }

    if (filters.condition) {
      query = query.where('condition', filters.condition);
    }

    if (filters.platform) {
      query = query.where('platform', filters.platform);
    }

    const games = await query.orderBy('name', 'asc');

    // If filtering by availability, we need to check loans
    if (filters.available !== undefined) {
      const gamesOnLoan = await db('game_loans')
        .whereNull('returned_date')
        .select('game_id');
      const loanedGameIds = new Set(gamesOnLoan.map(l => l.game_id));

      const filteredGames = games.filter(game =>
        filters.available ? !loanedGameIds.has(game.id) : loanedGameIds.has(game.id)
      );

      for (const game of filteredGames) {
        game.tags = await this.getGameTags(game.id);
        game.currentLoan = await this.getActiveLoan(game.id);
      }

      return filteredGames.map(this.mapFromDb);
    }

    for (const game of games) {
      game.tags = await this.getGameTags(game.id);
      game.currentLoan = await this.getActiveLoan(game.id);
    }

    return games.map(this.mapFromDb);
  }

  /**
   * Get a single game by ID
   */
  async getGame(id: number): Promise<Game | null> {
    const game = await db('games').where({ id }).first();

    if (!game) return null;

    game.tags = await this.getGameTags(id);
    game.currentLoan = await this.getActiveLoan(id);

    return this.mapFromDb(game);
  }

  /**
   * Create a new game
   */
  async createGame(input: CreateGameInput): Promise<number> {
    const dbData = this.mapToDb(input);
    const [id] = await db('games').insert(dbData);
    return id;
  }

  /**
   * Update a game
   */
  async updateGame(id: number, input: UpdateGameInput): Promise<void> {
    const dbData = this.mapToDb(input);
    await db('games')
      .where({ id })
      .update({
        ...dbData,
        updated_at: db.fn.now(),
      });
  }

  /**
   * Delete a game
   */
  async deleteGame(id: number): Promise<void> {
    await db('games').where({ id }).delete();
  }

  // =====================
  // LOAN MANAGEMENT
  // =====================

  /**
   * Get active loan for a game
   */
  async getActiveLoan(gameId: number): Promise<GameLoan | null> {
    const loan = await db('game_loans')
      .where({ game_id: gameId })
      .whereNull('returned_date')
      .first();

    return loan ? this.mapLoanFromDb(loan) : null;
  }

  /**
   * Get all active loans
   */
  async getAllActiveLoans(): Promise<GameLoan[]> {
    const loans = await db('game_loans')
      .whereNull('returned_date')
      .orderBy('loaned_date', 'asc');

    return loans.map(this.mapLoanFromDb);
  }

  /**
   * Get overdue loans (loaned for 30+ days and reminder not sent)
   */
  async getOverdueLoans(): Promise<(GameLoan & { gameName: string })[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const loans = await db('game_loans')
      .join('games', 'game_loans.game_id', 'games.id')
      .whereNull('game_loans.returned_date')
      .where('game_loans.loaned_date', '<=', thirtyDaysAgo.toISOString().split('T')[0])
      .where('game_loans.reminder_sent', false)
      .select('game_loans.*', 'games.name as game_name');

    return loans.map(loan => ({
      ...this.mapLoanFromDb(loan),
      gameName: loan.game_name,
    }));
  }

  /**
   * Get loan history for a game
   */
  async getLoanHistory(gameId: number): Promise<GameLoan[]> {
    const loans = await db('game_loans')
      .where({ game_id: gameId })
      .orderBy('loaned_date', 'desc');

    return loans.map(this.mapLoanFromDb);
  }

  /**
   * Create a loan
   */
  async createLoan(gameId: number, input: CreateLoanInput): Promise<number> {
    const [id] = await db('game_loans').insert({
      game_id: gameId,
      borrower_name: input.borrowerName,
      borrower_contact: input.borrowerContact || null,
      loaned_date: input.loanedDate || new Date().toISOString().split('T')[0],
      expected_return_date: input.expectedReturnDate || null,
      notes: input.notes || null,
    });
    return id;
  }

  /**
   * Return a loaned game
   */
  async returnGame(gameId: number): Promise<void> {
    await db('game_loans')
      .where({ game_id: gameId })
      .whereNull('returned_date')
      .update({
        returned_date: new Date().toISOString().split('T')[0],
      });
  }

  /**
   * Mark reminder as sent for a loan
   */
  async markReminderSent(loanId: number): Promise<void> {
    await db('game_loans')
      .where({ id: loanId })
      .update({ reminder_sent: true });
  }

  // =====================
  // TAG MANAGEMENT
  // =====================

  /**
   * Get all tags
   */
  async getAllTags(): Promise<GameTag[]> {
    const tags = await db('game_tags').orderBy('priority', 'desc');
    return tags.map(this.mapTagFromDb);
  }

  /**
   * Get tags for a game
   */
  async getGameTags(gameId: number): Promise<GameTag[]> {
    const tags = await db('game_tags')
      .join('game_tag_assignments', 'game_tags.id', 'game_tag_assignments.tag_id')
      .where('game_tag_assignments.game_id', gameId)
      .select('game_tags.*')
      .orderBy('game_tags.priority', 'desc');

    return tags.map(this.mapTagFromDb);
  }

  /**
   * Create a tag
   */
  async createTag(name: string, color: string, priority: number = 0): Promise<number> {
    const [id] = await db('game_tags').insert({ name, color, priority });
    return id;
  }

  /**
   * Update a tag
   */
  async updateTag(id: number, data: { name?: string; color?: string; priority?: number }): Promise<void> {
    await db('game_tags').where({ id }).update(data);
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number): Promise<void> {
    await db('game_tags').where({ id }).delete();
  }

  /**
   * Add tag to game
   */
  async addTagToGame(gameId: number, tagId: number): Promise<void> {
    await db('game_tag_assignments')
      .insert({ game_id: gameId, tag_id: tagId })
      .onConflict(['game_id', 'tag_id'])
      .ignore();
  }

  /**
   * Remove tag from game
   */
  async removeTagFromGame(gameId: number, tagId: number): Promise<void> {
    await db('game_tag_assignments')
      .where({ game_id: gameId, tag_id: tagId })
      .delete();
  }

  // =====================
  // MAPPING FUNCTIONS
  // =====================

  private mapFromDb(row: any): Game {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      playerCountMin: row.player_count_min,
      playerCountMax: row.player_count_max,
      condition: row.condition,
      platform: row.platform,
      notes: row.notes,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: row.tags ? row.tags.map((t: any) => this.mapTagFromDb(t)) : undefined,
      currentLoan: row.currentLoan ? this.mapLoanFromDb(row.currentLoan) : undefined,
    };
  }

  private mapToDb(input: Partial<CreateGameInput | UpdateGameInput>): any {
    const dbData: any = {};

    if (input.name !== undefined) dbData.name = input.name;
    if (input.type !== undefined) dbData.type = input.type;
    if (input.playerCountMin !== undefined) dbData.player_count_min = input.playerCountMin;
    if (input.playerCountMax !== undefined) dbData.player_count_max = input.playerCountMax;
    if (input.condition !== undefined) dbData.condition = input.condition;
    if (input.platform !== undefined) dbData.platform = input.platform;
    if (input.notes !== undefined) dbData.notes = input.notes;
    if (input.imageUrl !== undefined) dbData.image_url = input.imageUrl;

    return dbData;
  }

  private mapLoanFromDb(row: any): GameLoan {
    return {
      id: row.id,
      gameId: row.game_id,
      borrowerName: row.borrower_name,
      borrowerContact: row.borrower_contact,
      loanedDate: row.loaned_date,
      expectedReturnDate: row.expected_return_date,
      returnedDate: row.returned_date,
      reminderSent: !!row.reminder_sent,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }

  private mapTagFromDb(row: any): GameTag {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      priority: row.priority,
      createdAt: row.created_at,
    };
  }
}
