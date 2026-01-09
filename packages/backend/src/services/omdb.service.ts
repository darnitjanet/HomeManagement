import axios from 'axios';
import type { OMDbMovieDetails, OMDbSearchResponse } from '../types';

const OMDB_API_URL = 'http://www.omdbapi.com/';

// Get API key at runtime to ensure dotenv has loaded
function getApiKey(): string | undefined {
  return process.env.OMDB_API_KEY;
}

export class OMDbService {
  /**
   * Search for movies by title
   */
  async searchMovies(query: string): Promise<OMDbSearchResponse> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('OMDb API key not configured. Please set OMDB_API_KEY in your .env file.');
    }

    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    try {
      const response = await axios.get(OMDB_API_URL, {
        params: {
          apikey: apiKey,
          s: query.trim(),
          type: 'movie', // Can be 'movie', 'series', 'episode', or omitted for all
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data.Response === 'False') {
        // OMDb returns Response: "False" when no results found
        return {
          Search: [],
          totalResults: '0',
          Response: 'False',
        };
      }

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('OMDb API request timed out');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid OMDb API key');
      }
      if (error.response?.status === 429) {
        throw new Error('OMDb API rate limit exceeded. Please try again later.');
      }
      throw new Error(`OMDb API error: ${error.message}`);
    }
  }

  /**
   * Get full movie details by IMDb ID
   */
  async getMovieDetails(imdbId: string): Promise<OMDbMovieDetails | null> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('OMDb API key not configured. Please set OMDB_API_KEY in your .env file.');
    }

    if (!imdbId || imdbId.trim().length === 0) {
      throw new Error('IMDb ID cannot be empty');
    }

    try {
      const response = await axios.get(OMDB_API_URL, {
        params: {
          apikey: apiKey,
          i: imdbId.trim(),
          plot: 'full',
        },
        timeout: 10000,
      });

      if (response.data.Response === 'False') {
        // Movie not found
        return null;
      }

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('OMDb API request timed out');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid OMDb API key');
      }
      if (error.response?.status === 429) {
        throw new Error('OMDb API rate limit exceeded. Please try again later.');
      }
      throw new Error(`OMDb API error: ${error.message}`);
    }
  }

  /**
   * Get movie details by exact title (and optional year)
   */
  async getMovieByTitle(title: string, year?: string): Promise<OMDbMovieDetails | null> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('OMDb API key not configured. Please set OMDB_API_KEY in your .env file.');
    }

    if (!title || title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }

    try {
      const params: any = {
        apikey: apiKey,
        t: title.trim(),
        plot: 'full',
      };

      if (year) {
        params.y = year;
      }

      const response = await axios.get(OMDB_API_URL, {
        params,
        timeout: 10000,
      });

      if (response.data.Response === 'False') {
        // Movie not found
        return null;
      }

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('OMDb API request timed out');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid OMDb API key');
      }
      if (error.response?.status === 429) {
        throw new Error('OMDb API rate limit exceeded. Please try again later.');
      }
      throw new Error(`OMDb API error: ${error.message}`);
    }
  }

  /**
   * Map OMDb API response to our Movie type
   */
  mapOMDbToMovie(omdbData: OMDbMovieDetails): Partial<any> {
    // Extract Rotten Tomatoes score from Ratings array
    const rottenTomatoesRating = omdbData.Ratings?.find(
      (r) => r.Source === 'Rotten Tomatoes'
    );

    return {
      title: omdbData.Title,
      type: this.mapOMDbType(omdbData.Type),
      imdbId: omdbData.imdbID,
      starRating: omdbData.imdbRating && omdbData.imdbRating !== 'N/A'
        ? parseFloat(omdbData.imdbRating) / 2 // Convert 0-10 to 0-5
        : null,
      mpaaRating: omdbData.Rated !== 'N/A' ? omdbData.Rated : null,
      genre: omdbData.Genre !== 'N/A' ? omdbData.Genre : null,
      plot: omdbData.Plot !== 'N/A' ? omdbData.Plot : null,
      releaseYear: omdbData.Year !== 'N/A' ? omdbData.Year : null,
      runtime: omdbData.Runtime !== 'N/A' ? omdbData.Runtime : null,
      languages: omdbData.Language !== 'N/A' ? omdbData.Language : null,
      country: omdbData.Country !== 'N/A' ? omdbData.Country : null,
      awards: omdbData.Awards !== 'N/A' ? omdbData.Awards : null,
      imdbScore: omdbData.imdbRating !== 'N/A' ? omdbData.imdbRating : null,
      metacriticScore: omdbData.Metascore !== 'N/A' ? omdbData.Metascore : null,
      rottenTomatoesScore: rottenTomatoesRating ? rottenTomatoesRating.Value : null,
      director: omdbData.Director !== 'N/A' ? omdbData.Director : null,
      actors: omdbData.Actors !== 'N/A' ? omdbData.Actors : null,
      writers: omdbData.Writer !== 'N/A' ? omdbData.Writer : null,
      posterUrl: omdbData.Poster !== 'N/A' ? omdbData.Poster : null,
      rawOmdbData: JSON.stringify(omdbData),
    };
  }

  /**
   * Map OMDb Type to our enum
   */
  private mapOMDbType(omdbType: string): 'Movie' | 'Series' | 'Episode' | 'All' {
    const lowerType = omdbType.toLowerCase();
    if (lowerType === 'movie') return 'Movie';
    if (lowerType === 'series') return 'Series';
    if (lowerType === 'episode') return 'Episode';
    return 'All';
  }
}

// Export singleton instance
export const omdbService = new OMDbService();
