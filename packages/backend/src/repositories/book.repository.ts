import { db } from '../config/database';
import {
  Book,
  BookTag,
  BookLoan,
  CreateBookInput,
  UpdateBookInput,
  CreateBookLoanInput,
  ReadStatus,
} from '../types';

// Database row interfaces
interface BookRow {
  id: number;
  title: string;
  author: string | null;
  isbn: string | null;
  isbn13: string | null;
  olid: string | null;
  publisher: string | null;
  publish_year: string | null;
  pages: number | null;
  genre: string | null;
  subject: string | null;
  description: string | null;
  cover_url: string | null;
  language: string | null;
  read_status: string;
  my_rating: number | null;
  personal_notes: string | null;
  location: string | null;
  raw_openlibrary_data: string | null;
  created_at: string;
  updated_at: string;
}

interface BookTagRow {
  id: number;
  name: string;
  color: string;
  priority: number;
  created_at: string;
}

interface BookLoanRow {
  id: number;
  book_id: number;
  borrower_name: string;
  borrower_contact: string | null;
  loaned_at: string;
  due_date: string | null;
  returned_at: string | null;
  notes: string | null;
}

// Mapping functions
function mapBookFromDb(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author || undefined,
    isbn: row.isbn || undefined,
    isbn13: row.isbn13 || undefined,
    olid: row.olid || undefined,
    publisher: row.publisher || undefined,
    publishYear: row.publish_year || undefined,
    pages: row.pages || undefined,
    genre: row.genre || undefined,
    subject: row.subject || undefined,
    description: row.description || undefined,
    coverUrl: row.cover_url || undefined,
    language: row.language || undefined,
    readStatus: row.read_status as ReadStatus,
    myRating: row.my_rating || undefined,
    personalNotes: row.personal_notes || undefined,
    location: row.location || undefined,
    rawOpenLibraryData: row.raw_openlibrary_data || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTagFromDb(row: BookTagRow): BookTag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    priority: row.priority,
    createdAt: row.created_at,
  };
}

function mapLoanFromDb(row: BookLoanRow): BookLoan {
  return {
    id: row.id,
    bookId: row.book_id,
    borrowerName: row.borrower_name,
    borrowerContact: row.borrower_contact || undefined,
    loanedAt: row.loaned_at,
    dueDate: row.due_date || undefined,
    returnedAt: row.returned_at || undefined,
    notes: row.notes || undefined,
  };
}

// Book CRUD operations
export async function getAllBooks(): Promise<Book[]> {
  const rows: BookRow[] = await db('books').orderBy('title');
  const books = rows.map(mapBookFromDb);

  // Load tags and current loans for all books
  for (const book of books) {
    book.tags = await getBookTags(book.id);
    book.currentLoan = await getActiveLoan(book.id) || undefined;
  }

  return books;
}

export async function getBook(id: number): Promise<Book | null> {
  const row: BookRow | undefined = await db('books').where({ id }).first();
  if (!row) return null;

  const book = mapBookFromDb(row);
  book.tags = await getBookTags(id);
  book.currentLoan = await getActiveLoan(id) || undefined;

  return book;
}

export async function getBookByOlid(olid: string): Promise<Book | null> {
  const row: BookRow | undefined = await db('books').where({ olid }).first();
  if (!row) return null;

  const book = mapBookFromDb(row);
  book.tags = await getBookTags(book.id);
  book.currentLoan = await getActiveLoan(book.id) || undefined;

  return book;
}

export async function getBookByIsbn(isbn: string): Promise<Book | null> {
  const row: BookRow | undefined = await db('books')
    .where({ isbn })
    .orWhere({ isbn13: isbn })
    .first();
  if (!row) return null;

  const book = mapBookFromDb(row);
  book.tags = await getBookTags(book.id);
  book.currentLoan = await getActiveLoan(book.id) || undefined;

  return book;
}

export async function createBook(input: CreateBookInput): Promise<number> {
  const [id] = await db('books').insert({
    title: input.title,
    author: input.author || null,
    isbn: input.isbn || null,
    isbn13: input.isbn13 || null,
    olid: input.olid || null,
    publisher: input.publisher || null,
    publish_year: input.publishYear || null,
    pages: input.pages || null,
    genre: input.genre || null,
    subject: input.subject || null,
    description: input.description || null,
    cover_url: input.coverUrl || null,
    language: input.language || null,
    read_status: input.readStatus || 'Wishlist',
    my_rating: input.myRating || null,
    personal_notes: input.personalNotes || null,
    location: input.location || null,
    raw_openlibrary_data: input.rawOpenLibraryData || null,
  });

  // Add tags if provided
  if (input.tags && input.tags.length > 0) {
    for (const tagId of input.tags) {
      await addTagToBook(id, tagId);
    }
  }

  return id;
}

export async function updateBook(id: number, input: UpdateBookInput): Promise<Book | null> {
  const updateData: Record<string, any> = { updated_at: db.fn.now() };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.author !== undefined) updateData.author = input.author;
  if (input.isbn !== undefined) updateData.isbn = input.isbn;
  if (input.isbn13 !== undefined) updateData.isbn13 = input.isbn13;
  if (input.olid !== undefined) updateData.olid = input.olid;
  if (input.publisher !== undefined) updateData.publisher = input.publisher;
  if (input.publishYear !== undefined) updateData.publish_year = input.publishYear;
  if (input.pages !== undefined) updateData.pages = input.pages;
  if (input.genre !== undefined) updateData.genre = input.genre;
  if (input.subject !== undefined) updateData.subject = input.subject;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.coverUrl !== undefined) updateData.cover_url = input.coverUrl;
  if (input.language !== undefined) updateData.language = input.language;
  if (input.readStatus !== undefined) updateData.read_status = input.readStatus;
  if (input.myRating !== undefined) updateData.my_rating = input.myRating;
  if (input.personalNotes !== undefined) updateData.personal_notes = input.personalNotes;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.rawOpenLibraryData !== undefined) updateData.raw_openlibrary_data = input.rawOpenLibraryData;

  await db('books').where({ id }).update(updateData);

  // Update tags if provided
  if (input.tags !== undefined) {
    await db('book_tag_assignments').where({ book_id: id }).delete();
    for (const tagId of input.tags) {
      await addTagToBook(id, tagId);
    }
  }

  return getBook(id);
}

export async function deleteBook(id: number): Promise<boolean> {
  const deleted = await db('books').where({ id }).delete();
  return deleted > 0;
}

// Search and filter
export async function searchBooks(query: string): Promise<Book[]> {
  const rows: BookRow[] = await db('books')
    .where('title', 'like', `%${query}%`)
    .orWhere('author', 'like', `%${query}%`)
    .orWhere('isbn', 'like', `%${query}%`)
    .orWhere('isbn13', 'like', `%${query}%`)
    .orderBy('title');

  const books = rows.map(mapBookFromDb);
  for (const book of books) {
    book.tags = await getBookTags(book.id);
    book.currentLoan = await getActiveLoan(book.id) || undefined;
  }

  return books;
}

export async function filterBooks(filters: {
  readStatus?: ReadStatus;
  author?: string;
  genre?: string;
  hasLoan?: boolean;
}): Promise<Book[]> {
  let query = db('books').orderBy('title');

  if (filters.readStatus) {
    query = query.where('read_status', filters.readStatus);
  }
  if (filters.author) {
    query = query.where('author', 'like', `%${filters.author}%`);
  }
  if (filters.genre) {
    query = query.where('genre', 'like', `%${filters.genre}%`);
  }

  const rows: BookRow[] = await query;
  let books = rows.map(mapBookFromDb);

  // Load tags and loans
  for (const book of books) {
    book.tags = await getBookTags(book.id);
    book.currentLoan = await getActiveLoan(book.id) || undefined;
  }

  // Filter by loan status if needed
  if (filters.hasLoan !== undefined) {
    books = books.filter((b) => (filters.hasLoan ? !!b.currentLoan : !b.currentLoan));
  }

  return books;
}

export async function getBooksByTag(tagId: number): Promise<Book[]> {
  const rows: BookRow[] = await db('books')
    .join('book_tag_assignments', 'books.id', 'book_tag_assignments.book_id')
    .where('book_tag_assignments.tag_id', tagId)
    .select('books.*')
    .orderBy('books.title');

  const books = rows.map(mapBookFromDb);
  for (const book of books) {
    book.tags = await getBookTags(book.id);
    book.currentLoan = await getActiveLoan(book.id) || undefined;
  }

  return books;
}

// Tag operations
export async function getAllTags(): Promise<BookTag[]> {
  const rows: BookTagRow[] = await db('book_tags').orderBy('priority', 'desc');
  return rows.map(mapTagFromDb);
}

export async function getBookTags(bookId: number): Promise<BookTag[]> {
  const rows: BookTagRow[] = await db('book_tags')
    .join('book_tag_assignments', 'book_tags.id', 'book_tag_assignments.tag_id')
    .where('book_tag_assignments.book_id', bookId)
    .select('book_tags.*')
    .orderBy('book_tags.priority', 'desc');

  return rows.map(mapTagFromDb);
}

export async function createTag(name: string, color: string, priority: number = 0): Promise<number> {
  const [id] = await db('book_tags').insert({ name, color, priority });
  return id;
}

export async function updateTag(
  id: number,
  data: { name?: string; color?: string; priority?: number }
): Promise<BookTag | null> {
  await db('book_tags').where({ id }).update(data);
  const row: BookTagRow | undefined = await db('book_tags').where({ id }).first();
  return row ? mapTagFromDb(row) : null;
}

export async function deleteTag(id: number): Promise<boolean> {
  const deleted = await db('book_tags').where({ id }).delete();
  return deleted > 0;
}

export async function addTagToBook(bookId: number, tagId: number): Promise<void> {
  try {
    await db('book_tag_assignments').insert({ book_id: bookId, tag_id: tagId });
  } catch (error: any) {
    // Ignore duplicate key errors
    if (!error.message.includes('UNIQUE constraint failed')) {
      throw error;
    }
  }
}

export async function removeTagFromBook(bookId: number, tagId: number): Promise<void> {
  await db('book_tag_assignments').where({ book_id: bookId, tag_id: tagId }).delete();
}

// Loan operations
export async function getActiveLoan(bookId: number): Promise<BookLoan | null> {
  const row: BookLoanRow | undefined = await db('book_loans')
    .where({ book_id: bookId })
    .whereNull('returned_at')
    .first();

  return row ? mapLoanFromDb(row) : null;
}

export async function getAllActiveLoans(): Promise<BookLoan[]> {
  const rows: BookLoanRow[] = await db('book_loans')
    .whereNull('returned_at')
    .orderBy('loaned_at', 'desc');

  return rows.map(mapLoanFromDb);
}

export async function getLoanHistory(bookId: number): Promise<BookLoan[]> {
  const rows: BookLoanRow[] = await db('book_loans')
    .where({ book_id: bookId })
    .orderBy('loaned_at', 'desc');

  return rows.map(mapLoanFromDb);
}

export async function createLoan(bookId: number, input: CreateBookLoanInput): Promise<number> {
  // Check if book already has an active loan
  const activeLoan = await getActiveLoan(bookId);
  if (activeLoan) {
    throw new Error('Book is already on loan');
  }

  const [id] = await db('book_loans').insert({
    book_id: bookId,
    borrower_name: input.borrowerName,
    borrower_contact: input.borrowerContact || null,
    due_date: input.dueDate || null,
    notes: input.notes || null,
  });

  return id;
}

export async function returnBook(bookId: number): Promise<void> {
  await db('book_loans')
    .where({ book_id: bookId })
    .whereNull('returned_at')
    .update({ returned_at: db.fn.now() });
}

export async function getOverdueLoans(): Promise<BookLoan[]> {
  const rows: BookLoanRow[] = await db('book_loans')
    .whereNull('returned_at')
    .whereNotNull('due_date')
    .where('due_date', '<', db.fn.now())
    .orderBy('due_date', 'asc');

  return rows.map(mapLoanFromDb);
}

// Upsert - create or update based on OLID or ISBN
export async function upsertBook(input: CreateBookInput): Promise<number> {
  // Try to find existing book by OLID or ISBN
  let existingBook: Book | null = null;

  if (input.olid) {
    existingBook = await getBookByOlid(input.olid);
  }
  if (!existingBook && input.isbn) {
    existingBook = await getBookByIsbn(input.isbn);
  }
  if (!existingBook && input.isbn13) {
    existingBook = await getBookByIsbn(input.isbn13);
  }

  if (existingBook) {
    await updateBook(existingBook.id, input);
    return existingBook.id;
  }

  return createBook(input);
}
