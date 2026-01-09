import { Request, Response } from 'express';
import { tmdbService } from '../services/tmdb.service';
import { MovieRepository } from '../repositories/movie.repository';
import { MovieTagRepository } from '../repositories/movie-tag.repository';

/**
 * Search TMDB for movies
 */
export async function searchOMDb(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const results = await tmdbService.searchMovies(q);

    // Transform TMDB results to match expected format
    const transformedResults = {
      Search: results.results.map(movie => ({
        Title: movie.title,
        Year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
        imdbID: String(movie.id), // Use TMDB ID temporarily
        tmdbID: movie.id,
        Type: 'movie',
        Poster: tmdbService.getImageUrl(movie.poster_path, 'w342') || 'N/A',
      })),
      totalResults: String(results.total_results),
      Response: 'True',
    };

    res.json({
      success: true,
      data: transformedResults,
    });
  } catch (error: any) {
    console.error('TMDB search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search TMDB',
      message: error.message,
    });
  }
}

/**
 * Get movie details from TMDB
 */
export async function getOMDbDetails(req: Request, res: Response) {
  try {
    const { imdbId, tmdbId } = req.query;

    let id: number;

    if (tmdbId && typeof tmdbId === 'string') {
      id = parseInt(tmdbId);
    } else if (imdbId && typeof imdbId === 'string') {
      // If it looks like a TMDB ID (numeric), use it directly
      id = parseInt(imdbId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either tmdbId or imdbId parameter is required',
      });
    }

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
      });
    }

    const details = await tmdbService.getMovieDetails(id);

    // Transform to match expected format for frontend
    const transformedDetails = {
      Title: details.title,
      Year: details.release_date ? details.release_date.substring(0, 4) : 'N/A',
      Rated: 'N/A', // Will be filled from release_dates
      Released: details.release_date || 'N/A',
      Runtime: details.runtime ? `${details.runtime} min` : 'N/A',
      Genre: details.genres.map(g => g.name).join(', ') || 'N/A',
      Director: details.credits.crew.filter(c => c.job === 'Director').map(c => c.name).join(', ') || 'N/A',
      Writer: details.credits.crew.filter(c => c.department === 'Writing').map(c => c.name).slice(0, 3).join(', ') || 'N/A',
      Actors: details.credits.cast.slice(0, 5).map(c => c.name).join(', ') || 'N/A',
      Plot: details.overview || 'N/A',
      Language: details.spoken_languages.map(l => l.english_name || l.name).join(', ') || 'N/A',
      Country: details.production_countries.map(c => c.name).join(', ') || 'N/A',
      Poster: tmdbService.getImageUrl(details.poster_path, 'w500') || 'N/A',
      imdbRating: details.vote_average ? details.vote_average.toFixed(1) : 'N/A',
      imdbID: details.imdb_id || 'N/A',
      tmdbID: details.id,
      Production: details.production_companies.map(pc => pc.name).join(', ') || 'N/A',
      Response: 'True',
    };

    res.json({
      success: true,
      data: transformedDetails,
    });
  } catch (error: any) {
    console.error('TMDB details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get movie details from TMDB',
      message: error.message,
    });
  }
}

/**
 * Get all movies
 */
export async function getAllMovies(req: Request, res: Response) {
  try {
    const movieRepo = new MovieRepository();
    const movies = await movieRepo.getAllMovies();

    res.json({
      success: true,
      data: movies,
    });
  } catch (error: any) {
    console.error('Get movies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve movies',
      message: error.message,
    });
  }
}

/**
 * Get a single movie by ID
 */
export async function getMovie(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const movieRepo = new MovieRepository();
    const movie = await movieRepo.getMovie(parseInt(id));

    if (!movie) {
      return res.status(404).json({
        success: false,
        error: 'Movie not found',
      });
    }

    res.json({
      success: true,
      data: movie,
    });
  } catch (error: any) {
    console.error('Get movie error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve movie',
      message: error.message,
    });
  }
}

/**
 * Search movies by title, director, or actors
 */
export async function searchMovies(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const movieRepo = new MovieRepository();
    const movies = await movieRepo.searchMovies(q);

    res.json({
      success: true,
      data: movies,
    });
  } catch (error: any) {
    console.error('Search movies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search movies',
      message: error.message,
    });
  }
}

/**
 * Filter movies by criteria
 */
export async function filterMovies(req: Request, res: Response) {
  try {
    const { genre, myRating, watchedStatus, type, mpaaRating, format } = req.query;

    const filters: any = {};

    if (genre) filters.genre = genre as string;
    if (myRating) filters.myRating = parseInt(myRating as string);
    if (watchedStatus) filters.watchedStatus = watchedStatus as string;
    if (type) filters.type = type as string;
    if (mpaaRating) filters.mpaaRating = mpaaRating as string;
    if (format) filters.format = format as string;

    const movieRepo = new MovieRepository();
    const movies = await movieRepo.filterMovies(filters);

    res.json({
      success: true,
      data: movies,
    });
  } catch (error: any) {
    console.error('Filter movies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter movies',
      message: error.message,
    });
  }
}

/**
 * Get movies by tag
 */
export async function getMoviesByTag(req: Request, res: Response) {
  try {
    const { tagId } = req.params;
    const movieRepo = new MovieRepository();
    const movies = await movieRepo.getMoviesByTag(parseInt(tagId));

    res.json({
      success: true,
      data: movies,
    });
  } catch (error: any) {
    console.error('Get movies by tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve movies',
      message: error.message,
    });
  }
}

/**
 * Create a new movie manually
 */
export async function createMovie(req: Request, res: Response) {
  try {
    const movieData = req.body;

    if (!movieData.title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
      });
    }

    const movieRepo = new MovieRepository();
    const id = await movieRepo.upsertMovie(movieData);

    // If tags were provided, add them
    if (movieData.tags && Array.isArray(movieData.tags)) {
      for (const tagId of movieData.tags) {
        await movieRepo.addTagToMovie(id, tagId);
      }
    }

    const movie = await movieRepo.getMovie(id);

    res.json({
      success: true,
      data: movie,
    });
  } catch (error: any) {
    console.error('Create movie error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create movie',
      message: error.message,
    });
  }
}

/**
 * Create a movie from TMDB data
 */
export async function createMovieFromOMDb(req: Request, res: Response) {
  try {
    const { imdbId, tmdbId, myRating, watchedStatus, format, personalNotes, tags } = req.body;

    // Accept either tmdbId or imdbId (which now contains TMDB ID from search)
    const movieId = tmdbId || imdbId;

    if (!movieId) {
      return res.status(400).json({
        success: false,
        error: 'tmdbId or imdbId is required',
      });
    }

    // Fetch movie details from TMDB
    const tmdbData = await tmdbService.getMovieDetails(parseInt(movieId));

    if (!tmdbData) {
      return res.status(404).json({
        success: false,
        error: 'Movie not found in TMDB',
      });
    }

    // Map TMDB data to our schema and merge with user data
    const movieData = {
      ...tmdbService.mapTMDbToMovie(tmdbData),
      myRating,
      watchedStatus: watchedStatus || 'Not Watched',
      format,
      personalNotes,
    };

    const movieRepo = new MovieRepository();
    const id = await movieRepo.upsertMovie(movieData);

    // Add tags if provided
    if (tags && Array.isArray(tags)) {
      for (const tagId of tags) {
        await movieRepo.addTagToMovie(id, tagId);
      }
    }

    const movie = await movieRepo.getMovie(id);

    res.json({
      success: true,
      data: movie,
    });
  } catch (error: any) {
    console.error('Create movie from TMDB error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create movie from TMDB',
      message: error.message,
    });
  }
}

/**
 * Update an existing movie
 */
export async function updateMovie(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const movieRepo = new MovieRepository();
    await movieRepo.updateMovie(parseInt(id), updates);

    const movie = await movieRepo.getMovie(parseInt(id));

    res.json({
      success: true,
      data: movie,
    });
  } catch (error: any) {
    console.error('Update movie error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update movie',
      message: error.message,
    });
  }
}

/**
 * Delete a movie
 */
export async function deleteMovie(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const movieRepo = new MovieRepository();
    await movieRepo.deleteMovie(parseInt(id));

    res.json({
      success: true,
      message: 'Movie deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete movie error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete movie',
      message: error.message,
    });
  }
}

/**
 * Add tag to movie
 */
export async function addTagToMovie(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({
        success: false,
        error: 'tagId is required',
      });
    }

    const movieRepo = new MovieRepository();
    await movieRepo.addTagToMovie(parseInt(id), tagId);

    const movie = await movieRepo.getMovie(parseInt(id));

    res.json({
      success: true,
      data: movie,
    });
  } catch (error: any) {
    console.error('Add tag to movie error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add tag to movie',
      message: error.message,
    });
  }
}

/**
 * Remove tag from movie
 */
export async function removeTagFromMovie(req: Request, res: Response) {
  try {
    const { id, tagId } = req.params;

    const movieRepo = new MovieRepository();
    await movieRepo.removeTagFromMovie(parseInt(id), parseInt(tagId));

    const movie = await movieRepo.getMovie(parseInt(id));

    res.json({
      success: true,
      data: movie,
    });
  } catch (error: any) {
    console.error('Remove tag from movie error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove tag from movie',
      message: error.message,
    });
  }
}

/**
 * Get all movie tags
 */
export async function getAllTags(req: Request, res: Response) {
  try {
    const tagRepo = new MovieTagRepository();
    const tags = await tagRepo.getAllTags();

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

    const tagRepo = new MovieTagRepository();
    const id = await tagRepo.createTag({
      name,
      color: color || '#5b768a',
      priority: priority || 0,
    });

    const tag = await tagRepo.getTag(id);

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

    const tagRepo = new MovieTagRepository();
    await tagRepo.updateTag(parseInt(id), updates);

    const tag = await tagRepo.getTag(parseInt(id));

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
    const tagRepo = new MovieTagRepository();
    await tagRepo.deleteTag(parseInt(id));

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
 * Update my rating for a movie
 */
export async function updateMyRating(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating === undefined || rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 0 and 5',
      });
    }

    const movieRepo = new MovieRepository();
    await movieRepo.updateMyRating(parseInt(id), rating);

    const movie = await movieRepo.getMovie(parseInt(id));

    res.json({
      success: true,
      data: movie,
    });
  } catch (error: any) {
    console.error('Update rating error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update rating',
      message: error.message,
    });
  }
}

/**
 * Update watched status for a movie
 */
export async function updateWatchedStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || (status !== 'Not Watched' && status !== 'Watched')) {
      return res.status(400).json({
        success: false,
        error: 'Status must be "Not Watched" or "Watched"',
      });
    }

    const movieRepo = new MovieRepository();
    await movieRepo.updateWatchedStatus(parseInt(id), status);

    const movie = await movieRepo.getMovie(parseInt(id));

    res.json({
      success: true,
      data: movie,
    });
  } catch (error: any) {
    console.error('Update watched status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update watched status',
      message: error.message,
    });
  }
}
