import { Router } from 'express';
import * as booksController from '../controllers/books.controller';

const router = Router();

// Open Library API endpoints
router.get('/openlibrary/search', booksController.searchOpenLibrary);
router.get('/openlibrary/details', booksController.getOpenLibraryDetails);

// Get books
router.get('/', booksController.getAllBooks);
router.get('/search', booksController.searchBooks);
router.get('/filter', booksController.filterBooks);
router.get('/tag/:tagId', booksController.getBooksByTag);
router.get('/:id', booksController.getBook);
router.get('/:id/loans', booksController.getLoanHistory);

// Create books
router.post('/', booksController.createBook);
router.post('/from-openlibrary', booksController.createBookFromOpenLibrary);

// Update book
router.put('/:id', booksController.updateBook);
router.put('/:id/status', booksController.updateReadStatus);
router.put('/:id/rating', booksController.updateMyRating);

// Delete book
router.delete('/:id', booksController.deleteBook);

// Loan management
router.post('/:id/loan', booksController.loanBook);
router.put('/:id/return', booksController.returnBook);
router.get('/loans/active', booksController.getActiveLoans);
router.get('/loans/overdue', booksController.getOverdueLoans);

// Book tags
router.post('/:id/tags', booksController.addTagToBook);
router.delete('/:id/tags/:tagId', booksController.removeTagFromBook);

// Tags management
router.get('/tags/all', booksController.getAllTags);
router.post('/tags', booksController.createTag);
router.put('/tags/:id', booksController.updateTag);
router.delete('/tags/:id', booksController.deleteTag);

export default router;
