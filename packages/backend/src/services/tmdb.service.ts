import axios from 'axios';

const TMDB_API_URL = 'https://api.themoviedb.org/3';

// Get API key at runtime to ensure dotenv has loaded
function getApiKey(): string | undefined {
  return process.env.TMDB_API_KEY;
}

export interface TMDbSearchResult {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
  popularity: number;
  vote_average: number;
  vote_count: number;
  adult: boolean;
}

export interface TMDbSearchResponse {
  page: number;
  results: TMDbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TMDbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDbMovieDetails {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  tagline: string;
  overview: string;
  release_date: string;
  runtime: number | null;
  budget: number;
  revenue: number;
  status: string;
  adult: boolean;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: Array<{ id: number; name: string }>;
  production_companies: TMDbProductionCompany[];
  production_countries: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages: Array<{ iso_639_1: string; name: string; english_name: string }>;
  vote_average: number;
  vote_count: number;
  popularity: number;
}

export interface TMDbCredits {
  cast: Array<{
    id: number;
    name: string;
    character: string;
    order: number;
    profile_path: string | null;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
    profile_path: string | null;
  }>;
}

export interface TMDbReleaseDates {
  results: Array<{
    iso_3166_1: string;
    release_dates: Array<{
      certification: string;
      release_date: string;
      type: number;
    }>;
  }>;
}

export class TMDbService {
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/';

  /**
   * Get full image URL from TMDB path
   */
  getImageUrl(path: string | null, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string | null {
    if (!path) return null;
    return `${this.imageBaseUrl}${size}${path}`;
  }

  /**
   * Search for movies by title
   */
  async searchMovies(query: string): Promise<TMDbSearchResponse> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('TMDB API key not configured. Please set TMDB_API_KEY in your .env file.');
    }

    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    try {
      const response = await axios.get(`${TMDB_API_URL}/search/movie`, {
        params: {
          api_key: apiKey,
          query: query.trim(),
          include_adult: false,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('TMDB API request timed out');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid TMDB API key');
      }
      if (error.response?.status === 429) {
        throw new Error('TMDB API rate limit exceeded. Please try again later.');
      }
      throw new Error(`TMDB API error: ${error.message}`);
    }
  }

  /**
   * Get full movie details by TMDB ID
   */
  async getMovieDetails(tmdbId: number): Promise<TMDbMovieDetails & { credits: TMDbCredits; release_dates: TMDbReleaseDates }> {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('TMDB API key not configured. Please set TMDB_API_KEY in your .env file.');
    }

    try {
      const response = await axios.get(`${TMDB_API_URL}/movie/${tmdbId}`, {
        params: {
          api_key: apiKey,
          append_to_response: 'credits,release_dates',
        },
        timeout: 10000,
      });

      return response.data;
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('TMDB API request timed out');
      }
      if (error.response?.status === 401) {
        throw new Error('Invalid TMDB API key');
      }
      if (error.response?.status === 404) {
        throw new Error('Movie not found in TMDB');
      }
      if (error.response?.status === 429) {
        throw new Error('TMDB API rate limit exceeded. Please try again later.');
      }
      throw new Error(`TMDB API error: ${error.message}`);
    }
  }

  /**
   * Get US MPAA rating from release dates
   */
  private getMpaaRating(releaseDates: TMDbReleaseDates): string | null {
    const usRelease = releaseDates.results.find(r => r.iso_3166_1 === 'US');
    if (!usRelease) return null;

    // Find theatrical or general release with certification
    const certifiedRelease = usRelease.release_dates.find(rd => rd.certification && rd.certification.length > 0);
    return certifiedRelease?.certification || null;
  }

  /**
   * Map TMDB API response to our Movie type
   */
  mapTMDbToMovie(tmdbData: TMDbMovieDetails & { credits: TMDbCredits; release_dates: TMDbReleaseDates }): Partial<any> {
    // Get director from crew
    const director = tmdbData.credits.crew
      .filter(c => c.job === 'Director')
      .map(c => c.name)
      .join(', ');

    // Get writers from crew
    const writers = tmdbData.credits.crew
      .filter(c => c.department === 'Writing')
      .map(c => c.name)
      .slice(0, 5) // Limit to first 5 writers
      .join(', ');

    // Get top 5 actors
    const actors = tmdbData.credits.cast
      .slice(0, 5)
      .map(c => c.name)
      .join(', ');

    // Get production companies
    const productionCompanies = tmdbData.production_companies
      .map(pc => pc.name)
      .join(', ');

    // Get genres
    const genres = tmdbData.genres.map(g => g.name).join(', ');

    // Get languages
    const languages = tmdbData.spoken_languages
      .map(l => l.english_name || l.name)
      .join(', ');

    // Get countries
    const countries = tmdbData.production_countries
      .map(c => c.name)
      .join(', ');

    // Get MPAA rating
    const mpaaRating = this.getMpaaRating(tmdbData.release_dates);

    // Convert TMDB 0-10 rating to 0-5 stars
    const starRating = tmdbData.vote_average ? tmdbData.vote_average / 2 : null;

    return {
      title: tmdbData.title,
      type: 'Movie',
      tmdbId: tmdbData.id,
      imdbId: tmdbData.imdb_id,
      starRating,
      mpaaRating,
      genre: genres || null,
      plot: tmdbData.overview || null,
      releaseYear: tmdbData.release_date ? tmdbData.release_date.substring(0, 4) : null,
      runtime: tmdbData.runtime ? `${tmdbData.runtime} min` : null,
      languages: languages || null,
      country: countries || null,
      director: director || null,
      actors: actors || null,
      writers: writers || null,
      productionCompany: productionCompanies || null,
      posterUrl: this.getImageUrl(tmdbData.poster_path, 'w500'),
      backdropUrl: this.getImageUrl(tmdbData.backdrop_path, 'w780'),
      tmdbScore: tmdbData.vote_average ? tmdbData.vote_average.toFixed(1) : null,
      budget: tmdbData.budget || null,
      revenue: tmdbData.revenue || null,
      rawTmdbData: JSON.stringify(tmdbData),
    };
  }
}

// Export singleton instance
export const tmdbService = new TMDbService();
