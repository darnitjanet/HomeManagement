import { db } from '../config/database';
import { Movie } from '../types';

export class MovieRepository {
  /**
   * Get all movies with their tags
   */
  async getAllMovies(): Promise<Movie[]> {
    const movies = await db('movies')
      .orderBy('title', 'asc');

    // Get tags for each movie
    for (const movie of movies) {
      movie.tags = await this.getMovieTags(movie.id);
    }

    return movies.map(this.mapFromDb);
  }

  /**
   * Get movies by tag
   */
  async getMoviesByTag(tagId: number): Promise<Movie[]> {
    const movies = await db('movies')
      .join('movie_tag_assignments', 'movies.id', 'movie_tag_assignments.movie_id')
      .where('movie_tag_assignments.tag_id', tagId)
      .select('movies.*')
      .orderBy('movies.title', 'asc');

    // Get tags for each movie
    for (const movie of movies) {
      movie.tags = await this.getMovieTags(movie.id);
    }

    return movies.map(this.mapFromDb);
  }

  /**
   * Search movies by title, director, or actors
   */
  async searchMovies(query: string): Promise<Movie[]> {
    const movies = await db('movies')
      .where('title', 'like', `%${query}%`)
      .orWhere('director', 'like', `%${query}%`)
      .orWhere('actors', 'like', `%${query}%`)
      .orderBy('title', 'asc');

    // Get tags for each movie
    for (const movie of movies) {
      movie.tags = await this.getMovieTags(movie.id);
    }

    return movies.map(this.mapFromDb);
  }

  /**
   * Filter movies by multiple criteria
   */
  async filterMovies(filters: {
    genre?: string;
    myRating?: number;
    watchedStatus?: string;
    type?: string;
    mpaaRating?: string;
    format?: string;
  }): Promise<Movie[]> {
    let query = db('movies');

    if (filters.genre) {
      query = query.where('genre', 'like', `%${filters.genre}%`);
    }

    if (filters.myRating !== undefined) {
      query = query.where('my_rating', filters.myRating);
    }

    if (filters.watchedStatus) {
      query = query.where('watched_status', filters.watchedStatus);
    }

    if (filters.type) {
      query = query.where('type', filters.type);
    }

    if (filters.mpaaRating) {
      query = query.where('mpaa_rating', filters.mpaaRating);
    }

    if (filters.format) {
      query = query.where('format', filters.format);
    }

    const movies = await query.orderBy('title', 'asc');

    // Get tags for each movie
    for (const movie of movies) {
      movie.tags = await this.getMovieTags(movie.id);
    }

    return movies.map(this.mapFromDb);
  }

  /**
   * Get a single movie by ID
   */
  async getMovie(id: number): Promise<Movie | null> {
    const movie = await db('movies').where({ id }).first();

    if (!movie) return null;

    movie.tags = await this.getMovieTags(id);

    return this.mapFromDb(movie);
  }

  /**
   * Get movie by IMDb ID
   */
  async getMovieByImdbId(imdbId: string): Promise<Movie | null> {
    const movie = await db('movies')
      .where({ imdb_id: imdbId })
      .first();

    if (!movie) return null;

    movie.tags = await this.getMovieTags(movie.id);

    return this.mapFromDb(movie);
  }

  /**
   * Upsert a movie (insert or update if IMDb ID already exists)
   */
  async upsertMovie(movie: Partial<Movie>): Promise<number> {
    const existing = movie.imdbId
      ? await this.getMovieByImdbId(movie.imdbId)
      : null;

    const dbData = this.mapToDb(movie);

    if (existing) {
      await db('movies')
        .where({ id: existing.id })
        .update({
          ...dbData,
          updated_at: db.fn.now(),
        });
      return existing.id;
    } else {
      const [id] = await db('movies').insert(dbData);
      return id;
    }
  }

  /**
   * Update an existing movie by ID
   */
  async updateMovie(id: number, movie: Partial<Movie>): Promise<void> {
    const dbData = this.mapToDb(movie);

    await db('movies')
      .where({ id })
      .update({
        ...dbData,
        updated_at: db.fn.now(),
      });
  }

  /**
   * Delete a movie
   */
  async deleteMovie(id: number): Promise<void> {
    await db('movies').where({ id }).delete();
  }

  /**
   * Get tags for a movie
   */
  async getMovieTags(movieId: number) {
    return await db('movie_tags')
      .join('movie_tag_assignments', 'movie_tags.id', 'movie_tag_assignments.tag_id')
      .where('movie_tag_assignments.movie_id', movieId)
      .select('movie_tags.*')
      .orderBy('movie_tags.priority', 'desc');
  }

  /**
   * Add tag to movie
   */
  async addTagToMovie(movieId: number, tagId: number): Promise<void> {
    await db('movie_tag_assignments')
      .insert({ movie_id: movieId, tag_id: tagId })
      .onConflict(['movie_id', 'tag_id'])
      .ignore();
  }

  /**
   * Remove tag from movie
   */
  async removeTagFromMovie(movieId: number, tagId: number): Promise<void> {
    await db('movie_tag_assignments')
      .where({ movie_id: movieId, tag_id: tagId })
      .delete();
  }

  /**
   * Update my rating for a movie
   */
  async updateMyRating(id: number, rating: number): Promise<void> {
    await db('movies')
      .where({ id })
      .update({ my_rating: rating, updated_at: db.fn.now() });
  }

  /**
   * Update watched status for a movie
   */
  async updateWatchedStatus(id: number, status: 'Not Watched' | 'Watched'): Promise<void> {
    await db('movies')
      .where({ id })
      .update({ watched_status: status, updated_at: db.fn.now() });
  }

  /**
   * Map database row to Movie
   */
  private mapFromDb(row: any): Movie {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      watchedStatus: row.watched_status,
      imdbId: row.imdb_id,
      tmdbId: row.tmdb_id,
      starRating: row.star_rating ? parseFloat(row.star_rating) : undefined,
      myRating: row.my_rating,
      mpaaRating: row.mpaa_rating,
      format: row.format,
      genre: row.genre,
      plot: row.plot,
      releaseYear: row.release_year,
      runtime: row.runtime,
      languages: row.languages,
      country: row.country,
      awards: row.awards,
      imdbScore: row.imdb_score,
      tmdbScore: row.tmdb_score,
      metacriticScore: row.metacritic_score,
      rottenTomatoesScore: row.rotten_tomatoes_score,
      director: row.director,
      actors: row.actors,
      writers: row.writers,
      productionCompany: row.production_company,
      posterUrl: row.poster_url,
      backdropUrl: row.backdrop_url,
      budget: row.budget,
      revenue: row.revenue,
      personalNotes: row.personal_notes,
      rawOmdbData: row.raw_omdb_data,
      rawTmdbData: row.raw_tmdb_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: row.tags,
    };
  }

  /**
   * Map Movie to database row
   */
  private mapToDb(movie: Partial<Movie>): any {
    const dbData: any = {};

    if (movie.title !== undefined) dbData.title = movie.title;
    if (movie.type !== undefined) dbData.type = movie.type;
    if (movie.watchedStatus !== undefined) dbData.watched_status = movie.watchedStatus;
    if (movie.imdbId !== undefined) dbData.imdb_id = movie.imdbId;
    if (movie.tmdbId !== undefined) dbData.tmdb_id = movie.tmdbId;
    if (movie.starRating !== undefined) dbData.star_rating = movie.starRating;
    if (movie.myRating !== undefined) dbData.my_rating = movie.myRating;
    if (movie.mpaaRating !== undefined) dbData.mpaa_rating = movie.mpaaRating;
    if (movie.format !== undefined) dbData.format = movie.format;
    if (movie.genre !== undefined) dbData.genre = movie.genre;
    if (movie.plot !== undefined) dbData.plot = movie.plot;
    if (movie.releaseYear !== undefined) dbData.release_year = movie.releaseYear;
    if (movie.runtime !== undefined) dbData.runtime = movie.runtime;
    if (movie.languages !== undefined) dbData.languages = movie.languages;
    if (movie.country !== undefined) dbData.country = movie.country;
    if (movie.awards !== undefined) dbData.awards = movie.awards;
    if (movie.imdbScore !== undefined) dbData.imdb_score = movie.imdbScore;
    if (movie.tmdbScore !== undefined) dbData.tmdb_score = movie.tmdbScore;
    if (movie.metacriticScore !== undefined) dbData.metacritic_score = movie.metacriticScore;
    if (movie.rottenTomatoesScore !== undefined) dbData.rotten_tomatoes_score = movie.rottenTomatoesScore;
    if (movie.director !== undefined) dbData.director = movie.director;
    if (movie.actors !== undefined) dbData.actors = movie.actors;
    if (movie.writers !== undefined) dbData.writers = movie.writers;
    if (movie.productionCompany !== undefined) dbData.production_company = movie.productionCompany;
    if (movie.posterUrl !== undefined) dbData.poster_url = movie.posterUrl;
    if (movie.backdropUrl !== undefined) dbData.backdrop_url = movie.backdropUrl;
    if (movie.budget !== undefined) dbData.budget = movie.budget;
    if (movie.revenue !== undefined) dbData.revenue = movie.revenue;
    if (movie.personalNotes !== undefined) dbData.personal_notes = movie.personalNotes;
    if (movie.rawOmdbData !== undefined) dbData.raw_omdb_data = movie.rawOmdbData;
    if (movie.rawTmdbData !== undefined) dbData.raw_tmdb_data = movie.rawTmdbData;

    return dbData;
  }
}
