import axios from 'axios';
import {
  OpenLibrarySearchResult,
  OpenLibrarySearchResponse,
  OpenLibraryWorkDetails,
  CreateBookInput,
} from '../types';

const OPENLIBRARY_API_URL = 'https://openlibrary.org';
const OPENLIBRARY_COVERS_URL = 'https://covers.openlibrary.org';

// Language code to name mapping
const LANGUAGE_CODES: Record<string, string> = {
  eng: 'English',
  spa: 'Spanish',
  fre: 'French',
  ger: 'German',
  ita: 'Italian',
  por: 'Portuguese',
  rus: 'Russian',
  chi: 'Chinese',
  jpn: 'Japanese',
  kor: 'Korean',
  ara: 'Arabic',
  hin: 'Hindi',
  dut: 'Dutch',
  swe: 'Swedish',
  nor: 'Norwegian',
  dan: 'Danish',
  fin: 'Finnish',
  pol: 'Polish',
  tur: 'Turkish',
  heb: 'Hebrew',
  gre: 'Greek',
  lat: 'Latin',
  cze: 'Czech',
  hun: 'Hungarian',
  rum: 'Romanian',
  vie: 'Vietnamese',
  tha: 'Thai',
  ind: 'Indonesian',
  mul: 'Multiple Languages',
  und: 'Undetermined',
};

function getLanguageName(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return LANGUAGE_CODES[code.toLowerCase()] || code;
}

/**
 * Search Open Library for books by title, author, or ISBN
 */
export async function searchBooks(query: string): Promise<OpenLibrarySearchResponse> {
  try {
    // Detect if query looks like an ISBN (10 or 13 digits, possibly with dashes)
    const cleanQuery = query.replace(/[-\s]/g, '');
    const isIsbn = /^\d{10}(\d{3})?$/.test(cleanQuery);

    const params: Record<string, string | number> = {
      limit: 20,
      // Request specific fields to ensure we get pages, subjects, and language
      fields: 'key,title,author_name,first_publish_year,isbn,cover_i,publisher,subject,number_of_pages_median,language',
    };

    if (isIsbn) {
      params.isbn = cleanQuery;
    } else {
      params.q = query.trim();
    }

    const response = await axios.get<OpenLibrarySearchResponse>(
      `${OPENLIBRARY_API_URL}/search.json`,
      {
        params,
        timeout: 15000,
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Open Library request timed out');
    }
    if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    throw new Error(`Open Library search failed: ${error.message}`);
  }
}

/**
 * Get detailed information about a specific work
 */
export async function getWorkDetails(workKey: string): Promise<OpenLibraryWorkDetails> {
  try {
    // workKey is like "/works/OL12345W" - we need to fetch the work details
    const cleanKey = workKey.startsWith('/works/') ? workKey : `/works/${workKey}`;

    const response = await axios.get<OpenLibraryWorkDetails>(
      `${OPENLIBRARY_API_URL}${cleanKey}.json`,
      { timeout: 10000 }
    );

    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Open Library request timed out');
    }
    if (error.response?.status === 404) {
      throw new Error('Work not found');
    }
    throw new Error(`Failed to fetch work details: ${error.message}`);
  }
}

/**
 * Get cover image URL from cover ID
 * Sizes: S (small), M (medium), L (large)
 */
export function getCoverUrl(coverId: number | undefined, size: 'S' | 'M' | 'L' = 'M'): string | null {
  if (!coverId) return null;
  return `${OPENLIBRARY_COVERS_URL}/b/id/${coverId}-${size}.jpg`;
}

/**
 * Get cover image URL from ISBN
 */
export function getCoverUrlByIsbn(isbn: string, size: 'S' | 'M' | 'L' = 'M'): string {
  return `${OPENLIBRARY_COVERS_URL}/b/isbn/${isbn}-${size}.jpg`;
}

/**
 * Map Open Library search result to our Book input format
 */
export function mapSearchResultToBook(result: OpenLibrarySearchResult): Partial<CreateBookInput> {
  const subjects = result.subject?.slice(0, 5).join(', ');

  // Get pages - try number_of_pages_median first
  const pages = result.number_of_pages_median;

  // Get language - prefer English if available, otherwise use first language
  let languageCode: string | undefined;
  if (result.language && result.language.length > 0) {
    // Check if English is in the list
    const hasEnglish = result.language.find(l => l.toLowerCase() === 'eng');
    languageCode = hasEnglish || result.language[0];
  }
  const language = getLanguageName(languageCode);

  return {
    title: result.title,
    author: result.author_name?.join(', '),
    olid: result.key?.replace('/works/', ''),
    isbn: result.isbn?.[0],
    isbn13: result.isbn?.find((i) => i.length === 13),
    publisher: result.publisher?.[0],
    publishYear: result.first_publish_year?.toString(),
    pages,
    genre: subjects, // Use subjects as genre since Open Library doesn't have a genre field
    subject: subjects,
    language,
    coverUrl: getCoverUrl(result.cover_i, 'M'),
  };
}

/**
 * Map Open Library work details to our Book input format
 * This provides more detailed info than search results
 */
export function mapWorkDetailsToBook(
  work: OpenLibraryWorkDetails,
  searchResult?: OpenLibrarySearchResult
): Partial<CreateBookInput> {
  // Description can be a string or an object with a 'value' property
  let description: string | undefined;
  if (work.description) {
    if (typeof work.description === 'string') {
      description = work.description;
    } else if (work.description.value) {
      description = work.description.value;
    }
  }

  // Start with search result data (more complete for some fields)
  const baseData = searchResult ? mapSearchResultToBook(searchResult) : {};

  return {
    ...baseData,
    title: work.title || baseData.title,
    olid: work.key?.replace('/works/', ''),
    description,
    subject: work.subjects?.slice(0, 5).join(', ') || baseData.subject,
    coverUrl: work.covers?.[0] ? getCoverUrl(work.covers[0], 'M') : baseData.coverUrl,
    rawOpenLibraryData: JSON.stringify(work),
  };
}

/**
 * Search and get full details in one call
 */
export async function searchAndGetDetails(
  query: string
): Promise<Array<Partial<CreateBookInput> & { _searchResult: OpenLibrarySearchResult }>> {
  const searchResponse = await searchBooks(query);

  return searchResponse.docs.map((result) => ({
    ...mapSearchResultToBook(result),
    _searchResult: result,
  }));
}
