import { Router } from 'express';
import * as gamesController from '../controllers/games.controller';

const router = Router();

// Get games
router.get('/', gamesController.getAllGames);
router.get('/search', gamesController.searchGames);
router.get('/filter', gamesController.filterGames);
router.get('/available', gamesController.getAvailableGames);
router.get('/on-loan', gamesController.getGamesOnLoan);
router.get('/type/:type', gamesController.getGamesByType);
router.get('/tag/:tagId', gamesController.getGamesByTag);
router.get('/:id', gamesController.getGame);
router.get('/:id/loans', gamesController.getLoanHistory);

// Create game
router.post('/', gamesController.createGame);

// Update game
router.put('/:id', gamesController.updateGame);

// Delete game
router.delete('/:id', gamesController.deleteGame);

// Loan management
router.post('/:id/loan', gamesController.loanGame);
router.put('/:id/return', gamesController.returnGame);
router.get('/loans/active', gamesController.getActiveLoans);
router.get('/loans/overdue', gamesController.getOverdueLoans);

// Game tags
router.post('/:id/tags/:tagId', gamesController.addTagToGame);
router.delete('/:id/tags/:tagId', gamesController.removeTagFromGame);

// Tags management
router.get('/tags/all', gamesController.getAllTags);
router.post('/tags', gamesController.createTag);
router.put('/tags/:id', gamesController.updateTag);
router.delete('/tags/:id', gamesController.deleteTag);

export default router;
