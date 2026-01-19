import { OAuth2Client } from 'google-auth-library';
import { GoogleContactsService } from './google-contacts.service';
import { ContactRepository } from '../repositories/contact.repository';
import { ContactTagRepository } from '../repositories/contact-tag.repository';
import { db } from '../config/database';

export interface ContactsSyncResult {
  success: boolean;
  contactsAdded: number;
  contactsUpdated: number;
  contactsDeleted: number;
  error?: string;
}

export class ContactsSyncService {
  private contactRepo: ContactRepository;
  private tagRepo: ContactTagRepository;
  private googleContactsService?: GoogleContactsService;

  constructor(auth?: OAuth2Client) {
    this.contactRepo = new ContactRepository();
    this.tagRepo = new ContactTagRepository();

    if (auth) {
      this.googleContactsService = new GoogleContactsService(auth);
    }
  }

  /**
   * Sync all contacts from Google
   */
  async syncContacts(): Promise<ContactsSyncResult> {
    if (!this.googleContactsService) {
      throw new Error('Google Contacts service not initialized. Authentication required.');
    }

    const result: ContactsSyncResult = {
      success: false,
      contactsAdded: 0,
      contactsUpdated: 0,
      contactsDeleted: 0,
    };

    // Create sync log
    const logId = await this.createSyncLog();

    try {
      console.log('🔄 Starting contacts sync...');

      // Step 1: Fetch and sync contact groups
      const googleGroups = await this.googleContactsService.listContactGroups();
      const groupToTagMap = new Map<string, number>();

      console.log(`📋 Found ${googleGroups.length} contact groups in Google`);

      for (const group of googleGroups) {
        // Skip system groups
        if (group.groupType === 'SYSTEM_CONTACT_GROUP') continue;

        const groupName = group.name || group.formattedName;
        if (!groupName) continue;

        // Check if tag already exists
        let existingTag = await this.tagRepo.getTagByName(groupName);

        if (!existingTag) {
          // Create new tag with Google colors
          const tagId = await this.tagRepo.createTag({
            name: groupName,
            color: '#4285f4', // Google blue default
            priority: 5, // Default priority
          });
          groupToTagMap.set(group.resourceName, tagId);
          console.log(`✨ Created tag "${groupName}" from Google Contact Group`);
        } else {
          groupToTagMap.set(group.resourceName, existingTag.id);
        }
      }

      // Step 2: Fetch all contacts from Google
      const googleContacts = await this.googleContactsService.syncContacts();

      console.log(`📥 Fetched ${googleContacts.length} contacts from Google`);

      // Process each contact
      for (const googleContact of googleContacts) {
        try {
          const resourceName = this.googleContactsService.extractResourceName(googleContact);

          // Check if contact exists
          const existing = await this.contactRepo.getContactByGoogleId(resourceName);

          // Convert Google contact to our format
          const contact = {
            googleContactId: resourceName,
            displayName: this.googleContactsService.extractDisplayName(googleContact),
            givenName: this.googleContactsService.extractGivenName(googleContact),
            familyName: this.googleContactsService.extractFamilyName(googleContact),
            emails: this.googleContactsService.extractEmails(googleContact),
            phones: this.googleContactsService.extractPhones(googleContact),
            photoUrl: this.googleContactsService.extractPhotoUrl(googleContact),
            notes: this.googleContactsService.extractNotes(googleContact),
            birthday: this.googleContactsService.extractBirthday(googleContact),
            rawData: JSON.stringify(googleContact),
            isFavorite: false,
            lastSyncedAt: new Date().toISOString(),
          };

          // Upsert contact
          const contactId = await this.contactRepo.upsertContact(contact);

          // Step 3: Sync group memberships as tags
          const groupMemberships = this.googleContactsService.extractGroupMemberships(googleContact);

          // Remove all existing tags first
          const existingContact = await this.contactRepo.getContact(contactId);
          if (existingContact && existingContact.tags) {
            for (const tag of existingContact.tags) {
              await this.contactRepo.removeTagFromContact(contactId, tag.id);
            }
          }

          // Add tags based on group membership
          for (const groupResourceName of groupMemberships) {
            const tagId = groupToTagMap.get(groupResourceName);
            if (tagId) {
              try {
                await this.contactRepo.addTagToContact(contactId, tagId);
              } catch (error) {
                // Tag might already be assigned, ignore
              }
            }
          }

          if (existing) {
            result.contactsUpdated++;
          } else {
            result.contactsAdded++;
          }
        } catch (error: any) {
          console.warn(`Failed to process contact: ${error.message}`);
          // Continue with other contacts
        }
      }

      result.success = true;

      // Update sync log
      await this.completeSyncLog(logId, {
        status: 'success',
        contactsAdded: result.contactsAdded,
        contactsUpdated: result.contactsUpdated,
        contactsDeleted: result.contactsDeleted,
      });

      console.log(`✅ Contacts sync complete: +${result.contactsAdded} ~${result.contactsUpdated}`);

      return result;
    } catch (error: any) {
      result.error = error.message;

      // Update sync log with error
      await this.completeSyncLog(logId, {
        status: 'failed',
        contactsAdded: 0,
        contactsUpdated: 0,
        contactsDeleted: 0,
        errorMessage: error.message,
      });

      console.error(`❌ Contacts sync failed:`, error.message);

      throw error;
    }
  }

  /**
   * Create a sync log entry
   */
  private async createSyncLog(): Promise<number> {
    const [id] = await db('contact_sync_logs').insert({
      sync_type: 'full',
      status: 'success',
      contacts_added: 0,
      contacts_updated: 0,
      contacts_deleted: 0,
      started_at: db.fn.now(),
    });

    return id;
  }

  /**
   * Complete a sync log entry
   */
  private async completeSyncLog(
    id: number,
    data: {
      status: 'success' | 'failed' | 'partial';
      contactsAdded: number;
      contactsUpdated: number;
      contactsDeleted: number;
      errorMessage?: string;
    }
  ): Promise<void> {
    await db('contact_sync_logs')
      .where({ id })
      .update({
        status: data.status,
        contacts_added: data.contactsAdded,
        contacts_updated: data.contactsUpdated,
        contacts_deleted: data.contactsDeleted,
        error_message: data.errorMessage,
        completed_at: db.fn.now(),
      });
  }

  /**
   * Get sync stats
   */
  async getSyncStats() {
    const stats = await db('contact_sync_logs')
      .select(
        db.raw('COUNT(*) as total_syncs'),
        db.raw('SUM(CASE WHEN status = "success" THEN 1 ELSE 0 END) as successful_syncs'),
        db.raw('SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed_syncs'),
        db.raw('MAX(started_at) as last_sync_at')
      )
      .first();

    return {
      totalSyncs: stats?.total_syncs || 0,
      successfulSyncs: stats?.successful_syncs || 0,
      failedSyncs: stats?.failed_syncs || 0,
      lastSyncAt: stats?.last_sync_at,
    };
  }

  /**
   * Get recent sync logs
   */
  async getSyncLogs(limit: number = 10) {
    return await db('contact_sync_logs')
      .orderBy('started_at', 'desc')
      .limit(limit);
  }
}
