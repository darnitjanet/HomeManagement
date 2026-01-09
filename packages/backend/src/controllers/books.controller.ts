import { Request, Response } from 'express';
import * as bookRepo from '../repositories/book.repository';
import * as openLibraryService from '../services/openlibrary.service';
import { CreateBookInput, ReadStatus } from '../types';

// Open Library API endpoints
export async function searchOpenLibrary(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing search query',
        message: 'Please provide a search query (q parameter)',
      });
    }

    const results = await openLibraryService.searchBooks(q);

    // Transform results to include cover URLs and mapped data
    const transformedResults = results.docs.map((doc) => ({
      ...openLibraryService.mapSearchResultToBook(doc),
      _raw: doc,
    }));

    res.json({
      success: true,
      data: {
        numFound: results.numFound,
        results: transformedResults,
      },
    });
  } catch (error: any) {
    console.error('Error searching Open Library:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message,
    });
  }
}

export async function getOpenLibraryDetails(req: Request, res: Response) {
  try {
    const { olid } = req.query;

    if (!olid || typeof olid !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing work ID',
        message: 'Please provide an Open Library work ID (olid parameter)',
      });
    }

    const details = await openLibraryService.getWorkDetails(olid);
    const mappedData = openLibraryService.mapWorkDetailsToBook(details);

    res.json({
      success: true,
      data: {
        ...mappedData,
        _raw: details,
      },
    });
  } catch (error: any) {
    console.error('Error fetching Open Library details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch details',
      message: error.message,
    });
  }
}

// Book CRUD endpoints
export async function getAllBooks(req: Request, res: Response) {
  try {
    const books = await bookRepo.getAllBooks();
    res.json({ success: true, data: books });
  } catch (error: any) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch books',
      message: error.message,
    });
  }
}

export async function getBook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const book = await bookRepo.getBook(parseInt(id));

    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Book not found',
      });
    }

    res.json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error fetching book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch book',
      message: error.message,
    });
  }
}

export async function createBook(req: Request, res: Response) {
  try {
    const input: CreateBookInput = req.body;

    if (!input.title) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Title is required',
      });
    }

    const id = await bookRepo.createBook(input);
    const book = await bookRepo.getBook(id);

    res.status(201).json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error creating book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create book',
      message: error.message,
    });
  }
}

export async function createBookFromOpenLibrary(req: Request, res: Response) {
  try {
    const { olid, readStatus, myRating, personalNotes, location, tags, genre, description, ...bookData } = req.body;

    if (!bookData.title) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Title is required',
      });
    }

    const input: CreateBookInput = {
      ...bookData,
      olid,
      genre,
      description,
      readStatus: readStatus || 'Wishlist',
      myRating,
      personalNotes,
      location,
      tags,
    };

    // Use upsert to avoid duplicates
    const id = await bookRepo.upsertBook(input);
    const book = await bookRepo.getBook(id);

    res.status(201).json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error creating book from Open Library:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create book',
      message: error.message,
    });
  }
}

export async function updateBook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const book = await bookRepo.updateBook(parseInt(id), req.body);

    if (!book) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Book not found',
      });
    }

    res.json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error updating book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update book',
      message: error.message,
    });
  }
}

export async function deleteBook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await bookRepo.deleteBook(parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Book not found',
      });
    }

    res.json({ success: true, message: 'Book deleted' });
  } catch (error: any) {
    console.error('Error deleting book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete book',
      message: error.message,
    });
  }
}

// Search and filter
export async function searchBooks(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing search query',
        message: 'Please provide a search query (q parameter)',
      });
    }

    const books = await bookRepo.searchBooks(q);
    res.json({ success: true, data: books });
  } catch (error: any) {
    console.error('Error searching books:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message,
    });
  }
}

export async function filterBooks(req: Request, res: Response) {
  try {
    const { readStatus, author, genre, hasLoan } = req.query;

    const filters: {
      readStatus?: ReadStatus;
      author?: string;
      genre?: string;
      hasLoan?: boolean;
    } = {};

    if (readStatus && typeof readStatus === 'string') {
      filters.readStatus = readStatus as ReadStatus;
    }
    if (author && typeof author === 'string') {
      filters.author = author;
    }
    if (genre && typeof genre === 'string') {
      filters.genre = genre;
    }
    if (hasLoan !== undefined) {
      filters.hasLoan = hasLoan === 'true';
    }

    const books = await bookRepo.filterBooks(filters);
    res.json({ success: true, data: books });
  } catch (error: any) {
    console.error('Error filtering books:', error);
    res.status(500).json({
      success: false,
      error: 'Filter failed',
      message: error.message,
    });
  }
}

export async function getBooksByTag(req: Request, res: Response) {
  try {
    const { tagId } = req.params;
    const books = await bookRepo.getBooksByTag(parseInt(tagId));
    res.json({ success: true, data: books });
  } catch (error: any) {
    console.error('Error fetching books by tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch books',
      message: error.message,
    });
  }
}

// Tag endpoints
export async function getAllTags(req: Request, res: Response) {
  try {
    const tags = await bookRepo.getAllTags();
    res.json({ success: true, data: tags });
  } catch (error: any) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tags',
      message: error.message,
    });
  }
}

export async function createTag(req: Request, res: Response) {
  try {
    const { name, color, priority } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Tag name is required',
      });
    }

    const id = await bookRepo.createTag(name, color || '#3498db', priority || 0);
    const tags = await bookRepo.getAllTags();
    const tag = tags.find((t) => t.id === id);

    res.status(201).json({ success: true, data: tag });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tag',
      message: error.message,
    });
  }
}

export async function updateTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const tag = await bookRepo.updateTag(parseInt(id), req.body);

    if (!tag) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Tag not found',
      });
    }

    res.json({ success: true, data: tag });
  } catch (error: any) {
    console.error('Error updating tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tag',
      message: error.message,
    });
  }
}

export async function deleteTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await bookRepo.deleteTag(parseInt(id));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Tag not found',
      });
    }

    res.json({ success: true, message: 'Tag deleted' });
  } catch (error: any) {
    console.error('Error deleting tag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tag',
      message: error.message,
    });
  }
}

export async function addTagToBook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Tag ID is required',
      });
    }

    await bookRepo.addTagToBook(parseInt(id), parseInt(tagId));
    const book = await bookRepo.getBook(parseInt(id));

    res.json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error adding tag to book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add tag',
      message: error.message,
    });
  }
}

export async function removeTagFromBook(req: Request, res: Response) {
  try {
    const { id, tagId } = req.params;

    await bookRepo.removeTagFromBook(parseInt(id), parseInt(tagId));
    const book = await bookRepo.getBook(parseInt(id));

    res.json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error removing tag from book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove tag',
      message: error.message,
    });
  }
}

// Loan endpoints
export async function loanBook(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { borrowerName, borrowerContact, dueDate, notes } = req.body;

    if (!borrowerName) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Borrower name is required',
      });
    }

    await bookRepo.createLoan(parseInt(id), {
      borrowerName,
      borrowerContact,
      dueDate,
      notes,
    });

    const book = await bookRepo.getBook(parseInt(id));
    res.json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error loaning book:', error);

    if (error.message === 'Book is already on loan') {
      return res.status(400).json({
        success: false,
        error: 'Already on loan',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to loan book',
      message: error.message,
    });
  }
}

export async function returnBook(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await bookRepo.returnBook(parseInt(id));
    const book = await bookRepo.getBook(parseInt(id));

    res.json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error returning book:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to return book',
      message: error.message,
    });
  }
}

export async function getActiveLoans(req: Request, res: Response) {
  try {
    const loans = await bookRepo.getAllActiveLoans();
    res.json({ success: true, data: loans });
  } catch (error: any) {
    console.error('Error fetching active loans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch loans',
      message: error.message,
    });
  }
}

export async function getOverdueLoans(req: Request, res: Response) {
  try {
    const loans = await bookRepo.getOverdueLoans();
    res.json({ success: true, data: loans });
  } catch (error: any) {
    console.error('Error fetching overdue loans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch loans',
      message: error.message,
    });
  }
}

export async function getLoanHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const loans = await bookRepo.getLoanHistory(parseInt(id));
    res.json({ success: true, data: loans });
  } catch (error: any) {
    console.error('Error fetching loan history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch loan history',
      message: error.message,
    });
  }
}

// Status update shortcuts
export async function updateReadStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { readStatus } = req.body;

    if (!readStatus) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Read status is required',
      });
    }

    const book = await bookRepo.updateBook(parseInt(id), { readStatus });
    res.json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error updating read status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update status',
      message: error.message,
    });
  }
}

export async function updateMyRating(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { myRating } = req.body;

    const book = await bookRepo.updateBook(parseInt(id), { myRating });
    res.json({ success: true, data: book });
  } catch (error: any) {
    console.error('Error updating rating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update rating',
      message: error.message,
    });
  }
}
