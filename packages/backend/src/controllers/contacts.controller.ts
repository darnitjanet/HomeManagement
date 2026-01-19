import { Request, Response } from 'express';
import { ContactsSyncService } from '../services/contacts-sync.service';
import { ContactRepository } from '../repositories/contact.repository';
import { ContactTagRepository } from '../repositories/contact-tag.repository';
import { AuthenticatedRequest } from '../types';

/**
 * Sync contacts from Google
 */
export async function syncContacts(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.googleAuth) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const syncService = new ContactsSyncService(req.googleAuth);
    const result = await syncService.syncContacts();

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Sync contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync contacts',
      message: error.message,
    });
  }
}

/**
 * Get all contacts
 */
export async function getAllContacts(req: Request, res: Response) {
  try {
    const contactRepo = new ContactRepository();
    const contacts = await contactRepo.getAllContacts();

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contacts',
      message: error.message,
    });
  }
}

/**
 * Get contacts by tag
 */
export async function getContactsByTag(req: Request, res: Response) {
  try {
    const { tagId } = req.params;
    const contactRepo = new ContactRepository();
    const contacts = await contactRepo.getContactsByTag(parseInt(tagId));

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error: any) {
    console.error('Get contacts by tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contacts',
      message: error.message,
    });
  }
}

/**
 * Get favorite contacts
 */
export async function getFavoriteContacts(req: Request, res: Response) {
  try {
    const contactRepo = new ContactRepository();
    const contacts = await contactRepo.getFavoriteContacts();

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error: any) {
    console.error('Get favorite contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve favorite contacts',
      message: error.message,
    });
  }
}

/**
 * Search contacts
 */
export async function searchContacts(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid search query',
      });
    }

    const contactRepo = new ContactRepository();
    const contacts = await contactRepo.searchContacts(q);

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error: any) {
    console.error('Search contacts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search contacts',
      message: error.message,
    });
  }
}

/**
 * Create a new contact
 */
export async function createContact(req: Request, res: Response) {
  try {
    const { displayName, givenName, familyName, emails, phones, notes } = req.body;
    const authReq = req as AuthenticatedRequest;

    if (!displayName) {
      return res.status(400).json({
        success: false,
        error: 'Display name is required',
      });
    }

    const contactRepo = new ContactRepository();

    // Create contact locally first
    const contactId = await contactRepo.upsertContact({
      googleContactId: `local-${Date.now()}`, // Temporary ID for local contacts
      displayName,
      givenName,
      familyName,
      emails: emails || [],
      phones: phones || [],
      notes,
      isFavorite: false,
      lastSyncedAt: new Date().toISOString(),
    });

    // If authenticated, create in Google Contacts too
    if (authReq.googleAuth) {
      try {
        const { GoogleContactsService } = await import('../services/google-contacts.service');
        const googleService = new GoogleContactsService(authReq.googleAuth);
        const googleContact = await googleService.createContact({
          displayName,
          givenName,
          familyName,
          emails,
          phones,
          notes,
        });

        console.log('📝 Google contact response:', JSON.stringify({
          resourceName: googleContact.resourceName,
          names: googleContact.names,
          emailAddresses: googleContact.emailAddresses,
        }));

        const extractedDisplayName = googleService.extractDisplayName(googleContact);
        console.log(`📝 Extracted display name: "${extractedDisplayName}"`);

        // Update local contact with full data from Google
        await contactRepo.updateContact(contactId, {
          googleContactId: googleContact.resourceName,
          displayName: extractedDisplayName,
          givenName: googleService.extractGivenName(googleContact),
          familyName: googleService.extractFamilyName(googleContact),
          emails: googleService.extractEmails(googleContact),
          phones: googleService.extractPhones(googleContact),
          photoUrl: googleService.extractPhotoUrl(googleContact),
          notes: googleService.extractNotes(googleContact),
          lastSyncedAt: new Date().toISOString(),
        });

        console.log(`✅ Created contact in Google: ${displayName}`);
      } catch (syncError: any) {
        console.warn('Failed to create contact in Google:', syncError.message);
        // Local contact still exists
      }
    }

    res.json({
      success: true,
      data: { id: contactId },
      message: 'Contact created',
    });
  } catch (error: any) {
    console.error('Create contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create contact',
      message: error.message,
    });
  }
}

/**
 * Update a contact
 */
export async function updateContactDetails(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { displayName, givenName, familyName, emails, phones, notes } = req.body;

    if (!displayName?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Display name is required',
      });
    }

    const contactRepo = new ContactRepository();
    const contact = await contactRepo.getContact(parseInt(id));

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Update local database first
    await contactRepo.updateContact(parseInt(id), {
      displayName: displayName.trim(),
      givenName: givenName?.trim(),
      familyName: familyName?.trim(),
      emails,
      phones,
      notes: notes?.trim(),
    });

    // If contact is synced with Google and user is authenticated, update in Google
    if (contact.googleContactId && authReq.googleAuth) {
      try {
        const { GoogleContactsService } = await import('../services/google-contacts.service');
        const googleService = new GoogleContactsService(authReq.googleAuth);

        // Get current contact data from Google to get the etag
        const googleContact = await googleService.getContact(contact.googleContactId);

        // Update contact in Google
        await googleService.updateContact(contact.googleContactId, {
          displayName: displayName.trim(),
          givenName: givenName?.trim(),
          familyName: familyName?.trim(),
          emails,
          phones,
          notes: notes?.trim(),
          etag: googleContact.etag,
        });

        console.log(`✅ Updated contact in Google: ${displayName}`);
      } catch (syncError: any) {
        console.warn('Failed to update contact in Google:', syncError.message);
        // Local update still succeeded
      }
    }

    res.json({
      success: true,
      message: 'Contact updated',
    });
  } catch (error: any) {
    console.error('Update contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact',
      message: error.message,
    });
  }
}

/**
 * Get a single contact
 */
export async function getContact(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const contactRepo = new ContactRepository();
    const contact = await contactRepo.getContact(parseInt(id));

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  } catch (error: any) {
    console.error('Get contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contact',
      message: error.message,
    });
  }
}

/**
 * Toggle contact favorite
 */
export async function toggleFavorite(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const contactRepo = new ContactRepository();
    const isFavorite = await contactRepo.toggleFavorite(parseInt(id));

    res.json({
      success: true,
      data: { isFavorite },
    });
  } catch (error: any) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle favorite',
      message: error.message,
    });
  }
}

/**
 * Update contact notes (and sync to Google if authenticated)
 */
export async function updateNotes(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const authReq = req as AuthenticatedRequest;

    const contactRepo = new ContactRepository();

    // Update locally first
    await contactRepo.updateContact(parseInt(id), { notes });

    // If authenticated, try to sync back to Google
    if (authReq.googleAuth) {
      try {
        const contact = await contactRepo.getContact(parseInt(id));
        if (contact && contact.googleContactId) {
          const { GoogleContactsService } = await import('../services/google-contacts.service');
          const googleService = new GoogleContactsService(authReq.googleAuth);

          // Get current contact to get etag
          const googleContact = await googleService.getContact(contact.googleContactId);

          await googleService.updateContactNotes(contact.googleContactId, notes || '', googleContact.etag);
          console.log(`✅ Synced notes to Google for contact ${contact.displayName}`);
        }
      } catch (syncError: any) {
        // Log error but don't fail the request - local update succeeded
        console.warn('Failed to sync notes to Google:', syncError.message);
      }
    }

    res.json({
      success: true,
      message: 'Notes updated',
    });
  } catch (error: any) {
    console.error('Update notes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notes',
      message: error.message,
    });
  }
}

/**
 * Add tag to contact
 */
export async function addTagToContact(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({
        success: false,
        error: 'Missing tagId',
      });
    }

    const contactRepo = new ContactRepository();
    await contactRepo.addTagToContact(parseInt(id), tagId);

    res.json({
      success: true,
      message: 'Tag added to contact',
    });
  } catch (error: any) {
    console.error('Add tag to contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add tag',
      message: error.message,
    });
  }
}

/**
 * Remove tag from contact
 */
export async function removeTagFromContact(req: Request, res: Response) {
  try {
    const { id, tagId } = req.params;
    const contactRepo = new ContactRepository();
    await contactRepo.removeTagFromContact(parseInt(id), parseInt(tagId));

    res.json({
      success: true,
      message: 'Tag removed from contact',
    });
  } catch (error: any) {
    console.error('Remove tag from contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove tag',
      message: error.message,
    });
  }
}

/**
 * Get all tags
 */
export async function getAllTags(req: Request, res: Response) {
  try {
    const tagRepo = new ContactTagRepository();
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
        error: 'Missing required field: name',
      });
    }

    const tagRepo = new ContactTagRepository();
    const id = await tagRepo.createTag({
      name,
      color: color || '#4285f4',
      priority: priority || 0,
    });

    res.json({
      success: true,
      data: { id },
      message: 'Tag created',
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

    const tagRepo = new ContactTagRepository();
    await tagRepo.updateTag(parseInt(id), updates);

    res.json({
      success: true,
      message: 'Tag updated',
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
    const tagRepo = new ContactTagRepository();
    await tagRepo.deleteTag(parseInt(id));

    res.json({
      success: true,
      message: 'Tag deleted',
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
 * Get sync stats
 */
export async function getSyncStats(req: Request, res: Response) {
  try {
    const syncService = new ContactsSyncService();
    const stats = await syncService.getSyncStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Get sync stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync stats',
      message: error.message,
    });
  }
}

/**
 * Delete a contact
 */
export async function deleteContact(req: Request, res: Response) {
  try {
    const contactId = parseInt(req.params.id);
    const contactRepo = new ContactRepository();

    await contactRepo.deleteContact(contactId);

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact',
      message: error.message,
    });
  }
}

/**
 * Get sync logs
 */
export async function getSyncLogs(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const syncService = new ContactsSyncService();
    const logs = await syncService.getSyncLogs(limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error: any) {
    console.error('Get sync logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sync logs',
      message: error.message,
    });
  }
}

/**
 * Get contacts with upcoming birthdays
 */
export async function getUpcomingBirthdays(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const contactRepo = new ContactRepository();
    const contacts = await contactRepo.getContactsWithUpcomingBirthdays(days);

    res.json({
      success: true,
      data: contacts,
    });
  } catch (error: any) {
    console.error('Get upcoming birthdays error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve upcoming birthdays',
      message: error.message,
    });
  }
}

/**
 * Update contact birthday
 */
export async function updateBirthday(req: Request, res: Response) {
  try {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { birthday } = req.body;

    // Validate birthday format (MM-DD)
    if (birthday && !/^\d{2}-\d{2}$/.test(birthday)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid birthday format. Use MM-DD (e.g., 03-15)',
      });
    }

    const contactRepo = new ContactRepository();
    const contact = await contactRepo.getContact(parseInt(id));

    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }

    // Update locally first
    await contactRepo.updateContact(parseInt(id), { birthday: birthday || null });

    // If authenticated and contact is synced with Google, update in Google too
    if (contact.googleContactId && authReq.googleAuth) {
      try {
        const { GoogleContactsService } = await import('../services/google-contacts.service');
        const googleService = new GoogleContactsService(authReq.googleAuth);

        // Get current contact from Google to get the etag
        const googleContact = await googleService.getContact(contact.googleContactId);

        // Update birthday in Google
        await googleService.updateContact(contact.googleContactId, {
          birthday: birthday || undefined,
          etag: googleContact.etag,
        });

        console.log(`✅ Synced birthday to Google for contact ${contact.displayName}`);
      } catch (syncError: any) {
        console.warn('Failed to sync birthday to Google:', syncError.message);
        // Local update still succeeded
      }
    }

    res.json({
      success: true,
      message: 'Birthday updated',
    });
  } catch (error: any) {
    console.error('Update birthday error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update birthday',
      message: error.message,
    });
  }
}
