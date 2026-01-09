import { Request, Response } from 'express';
import { GameRepository } from '../repositories/game.repository';

const gameRepo = new GameRepository();

/**
 * Get all games
 */
export async function getAllGames(req: Request, res: Response) {
  try {
    const games = await gameRepo.getAllGames();

    res.json({
      success: true,
      data: games,
    });
  } catch (error: any) {
    console.error('Get games error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve games',
      message: error.message,
    });
  }
}

/**
 * Get a single game by ID
 */
export async function getGame(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const game = await gameRepo.getGame(parseInt(id));

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error: any) {
    console.error('Get game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve game',
      message: error.message,
    });
  }
}

/**
 * Search games by name
 */
export async function searchGames(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const games = await gameRepo.searchGames(q);

    res.json({
      success: true,
      data: games,
    });
  } catch (error: any) {
    console.error('Search games error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search games',
      message: error.message,
    });
  }
}

/**
 * Filter games by criteria
 */
export async function filterGames(req: Request, res: Response) {
  try {
    const { type, condition, platform, available } = req.query;

    const filters: any = {};

    if (type) filters.type = type as string;
    if (condition) filters.condition = condition as string;
    if (platform) filters.platform = platform as string;
    if (available !== undefined) filters.available = available === 'true';

    const games = await gameRepo.filterGames(filters);

    res.json({
      success: true,
      data: games,
    });
  } catch (error: any) {
    console.error('Filter games error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter games',
      message: error.message,
    });
  }
}

/**
 * Get games by type
 */
export async function getGamesByType(req: Request, res: Response) {
  try {
    const { type } = req.params;
    const games = await gameRepo.getGamesByType(type);

    res.json({
      success: true,
      data: games,
    });
  } catch (error: any) {
    console.error('Get games by type error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve games',
      message: error.message,
    });
  }
}

/**
 * Get games by tag
 */
export async function getGamesByTag(req: Request, res: Response) {
  try {
    const { tagId } = req.params;
    const games = await gameRepo.getGamesByTag(parseInt(tagId));

    res.json({
      success: true,
      data: games,
    });
  } catch (error: any) {
    console.error('Get games by tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve games',
      message: error.message,
    });
  }
}

/**
 * Get available games (not on loan)
 */
export async function getAvailableGames(req: Request, res: Response) {
  try {
    const games = await gameRepo.getAvailableGames();

    res.json({
      success: true,
      data: games,
    });
  } catch (error: any) {
    console.error('Get available games error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve games',
      message: error.message,
    });
  }
}

/**
 * Get games currently on loan
 */
export async function getGamesOnLoan(req: Request, res: Response) {
  try {
    const games = await gameRepo.getGamesOnLoan();

    res.json({
      success: true,
      data: games,
    });
  } catch (error: any) {
    console.error('Get games on loan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve games',
      message: error.message,
    });
  }
}

/**
 * Create a new game
 */
export async function createGame(req: Request, res: Response) {
  try {
    const gameData = req.body;

    if (!gameData.name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required',
      });
    }

    if (!gameData.type) {
      return res.status(400).json({
        success: false,
        error: 'Type is required',
      });
    }

    const id = await gameRepo.createGame(gameData);

    // If tags were provided, add them
    if (gameData.tags && Array.isArray(gameData.tags)) {
      for (const tagId of gameData.tags) {
        await gameRepo.addTagToGame(id, tagId);
      }
    }

    const game = await gameRepo.getGame(id);

    res.json({
      success: true,
      data: game,
    });
  } catch (error: any) {
    console.error('Create game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game',
      message: error.message,
    });
  }
}

/**
 * Update an existing game
 */
export async function updateGame(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    await gameRepo.updateGame(parseInt(id), updates);

    const game = await gameRepo.getGame(parseInt(id));

    res.json({
      success: true,
      data: game,
    });
  } catch (error: any) {
    console.error('Update game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update game',
      message: error.message,
    });
  }
}

/**
 * Delete a game
 */
export async function deleteGame(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await gameRepo.deleteGame(parseInt(id));

    res.json({
      success: true,
      message: 'Game deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete game',
      message: error.message,
    });
  }
}

// =====================
// LOAN ENDPOINTS
// =====================

/**
 * Loan out a game
 */
export async function loanGame(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { borrowerName, borrowerContact, expectedReturnDate, notes } = req.body;

    if (!borrowerName) {
      return res.status(400).json({
        success: false,
        error: 'Borrower name is required',
      });
    }

    // Check if game exists
    const game = await gameRepo.getGame(parseInt(id));
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found',
      });
    }

    // Check if game is already on loan
    const activeLoan = await gameRepo.getActiveLoan(parseInt(id));
    if (activeLoan) {
      return res.status(400).json({
        success: false,
        error: 'Game is already on loan',
      });
    }

    await gameRepo.createLoan(parseInt(id), {
      borrowerName,
      borrowerContact,
      expectedReturnDate,
      notes,
    });

    const updatedGame = await gameRepo.getGame(parseInt(id));

    res.json({
      success: true,
      data: updatedGame,
    });
  } catch (error: any) {
    console.error('Loan game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to loan game',
      message: error.message,
    });
  }
}

/**
 * Return a loaned game
 */
export async function returnGame(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if game is on loan
    const activeLoan = await gameRepo.getActiveLoan(parseInt(id));
    if (!activeLoan) {
      return res.status(400).json({
        success: false,
        error: 'Game is not currently on loan',
      });
    }

    await gameRepo.returnGame(parseInt(id));

    const game = await gameRepo.getGame(parseInt(id));

    res.json({
      success: true,
      data: game,
    });
  } catch (error: any) {
    console.error('Return game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to return game',
      message: error.message,
    });
  }
}

/**
 * Get all active loans
 */
export async function getActiveLoans(req: Request, res: Response) {
  try {
    const loans = await gameRepo.getAllActiveLoans();

    res.json({
      success: true,
      data: loans,
    });
  } catch (error: any) {
    console.error('Get active loans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve loans',
      message: error.message,
    });
  }
}

/**
 * Get overdue loans (30+ days)
 */
export async function getOverdueLoans(req: Request, res: Response) {
  try {
    const loans = await gameRepo.getOverdueLoans();

    res.json({
      success: true,
      data: loans,
    });
  } catch (error: any) {
    console.error('Get overdue loans error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve overdue loans',
      message: error.message,
    });
  }
}

/**
 * Get loan history for a game
 */
export async function getLoanHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const loans = await gameRepo.getLoanHistory(parseInt(id));

    res.json({
      success: true,
      data: loans,
    });
  } catch (error: any) {
    console.error('Get loan history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve loan history',
      message: error.message,
    });
  }
}

// =====================
// TAG ENDPOINTS
// =====================

/**
 * Get all tags
 */
export async function getAllTags(req: Request, res: Response) {
  try {
    const tags = await gameRepo.getAllTags();

    res.json({
      success: true,
      data: tags,
    });
  } catch (error: any) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tags',
      message: error.message,
    });
  }
}

/**
 * Create a new tag
 */
export async function createTag(req: Request, res: Response) {
  try {
    const { name, color, priority } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Tag name is required',
      });
    }

    const id = await gameRepo.createTag(name, color || '#6b7280', priority || 0);
    const tags = await gameRepo.getAllTags();
    const tag = tags.find(t => t.id === id);

    res.json({
      success: true,
      data: tag,
    });
  } catch (error: any) {
    console.error('Create tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tag',
      message: error.message,
    });
  }
}

/**
 * Update a tag
 */
export async function updateTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    await gameRepo.updateTag(parseInt(id), updates);

    const tags = await gameRepo.getAllTags();
    const tag = tags.find(t => t.id === parseInt(id));

    res.json({
      success: true,
      data: tag,
    });
  } catch (error: any) {
    console.error('Update tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tag',
      message: error.message,
    });
  }
}

/**
 * Delete a tag
 */
export async function deleteTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await gameRepo.deleteTag(parseInt(id));

    res.json({
      success: true,
      message: 'Tag deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tag',
      message: error.message,
    });
  }
}

/**
 * Add tag to game
 */
export async function addTagToGame(req: Request, res: Response) {
  try {
    const { id, tagId } = req.params;

    await gameRepo.addTagToGame(parseInt(id), parseInt(tagId));

    const game = await gameRepo.getGame(parseInt(id));

    res.json({
      success: true,
      data: game,
    });
  } catch (error: any) {
    console.error('Add tag to game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add tag to game',
      message: error.message,
    });
  }
}

/**
 * Remove tag from game
 */
export async function removeTagFromGame(req: Request, res: Response) {
  try {
    const { id, tagId } = req.params;

    await gameRepo.removeTagFromGame(parseInt(id), parseInt(tagId));

    const game = await gameRepo.getGame(parseInt(id));

    res.json({
      success: true,
      data: game,
    });
  } catch (error: any) {
    console.error('Remove tag from game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove tag from game',
      message: error.message,
    });
  }
}
