import { Router } from 'express';
import * as moviesController from '../controllers/movies.controller';

const router = Router();

// OMDb API endpoints
router.get('/omdb/search', moviesController.searchOMDb);
router.get('/omdb/details', moviesController.getOMDbDetails);

// Get movies
router.get('/', moviesController.getAllMovies);
router.get('/search', moviesController.searchMovies);
router.get('/filter', moviesController.filterMovies);
router.get('/tag/:tagId', moviesController.getMoviesByTag);
router.get('/:id', moviesController.getMovie);

// Create movies
router.post('/', moviesController.createMovie);
router.post('/from-omdb', moviesController.createMovieFromOMDb);

// Update movie
router.put('/:id', moviesController.updateMovie);
router.put('/:id/rating', moviesController.updateMyRating);
router.put('/:id/watched', moviesController.updateWatchedStatus);

// Delete movie
router.delete('/:id', moviesController.deleteMovie);

// Movie tags
router.post('/:id/tags', moviesController.addTagToMovie);
router.delete('/:id/tags/:tagId', moviesController.removeTagFromMovie);

// Tags management
router.get('/tags/all', moviesController.getAllTags);
router.post('/tags', moviesController.createTag);
router.put('/tags/:id', moviesController.updateTag);
router.delete('/tags/:id', moviesController.deleteTag);

export default router;
