import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as contactsController from '../controllers/contacts.controller';

const router = Router();

// Sync contacts (requires auth)
router.post('/sync', requireAuth, contactsController.syncContacts);

// Get contacts
router.get('/', contactsController.getAllContacts);
router.get('/search', contactsController.searchContacts);
router.get('/favorites', contactsController.getFavoriteContacts);
router.get('/tag/:tagId', contactsController.getContactsByTag);
router.get('/:id', contactsController.getContact);

// Create contact
router.post('/', requireAuth, contactsController.createContact);

// Update contact
router.put('/:id', requireAuth, contactsController.updateContactDetails);
router.post('/:id/favorite', contactsController.toggleFavorite);
router.put('/:id/notes', requireAuth, contactsController.updateNotes);
router.post('/:id/tags', contactsController.addTagToContact);
router.delete('/:id/tags/:tagId', contactsController.removeTagFromContact);

// Delete contact
router.delete('/:id', contactsController.deleteContact);

// Tags
router.get('/tags/all', contactsController.getAllTags);
router.post('/tags', contactsController.createTag);
router.put('/tags/:id', contactsController.updateTag);
router.delete('/tags/:id', contactsController.deleteTag);

// Sync logs and stats
router.get('/sync/stats', contactsController.getSyncStats);
router.get('/sync/logs', contactsController.getSyncLogs);

export default router;
