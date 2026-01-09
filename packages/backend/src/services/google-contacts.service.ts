import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export class GoogleContactsService {
  private auth: OAuth2Client;
  private people: any;

  constructor(auth: OAuth2Client) {
    this.auth = auth;
    this.people = google.people({ version: 'v1', auth: this.auth });
  }

  /**
   * List all contacts (People API)
   */
  async listContacts(pageSize: number = 1000, pageToken?: string) {
    try {
      const response = await this.people.people.connections.list({
        resourceName: 'people/me',
        pageSize,
        pageToken,
        personFields: 'names,emailAddresses,phoneNumbers,photos,biographies,metadata,memberships',
        sortOrder: 'LAST_NAME_ASCENDING',
      });

      return {
        contacts: response.data.connections || [],
        nextPageToken: response.data.nextPageToken,
        totalItems: response.data.totalItems,
      };
    } catch (error) {
      console.error('Error listing contacts:', error);
      throw error;
    }
  }

  /**
   * Get a specific contact by resource name
   */
  async getContact(resourceName: string) {
    try {
      const response = await this.people.people.get({
        resourceName,
        personFields: 'names,emailAddresses,phoneNumbers,photos,biographies,metadata',
      });

      return response.data;
    } catch (error) {
      console.error('Error getting contact:', error);
      throw error;
    }
  }

  /**
   * Sync contacts with pagination support
   * Returns all contacts from Google
   */
  async syncContacts(pageSize: number = 1000): Promise<any[]> {
    try {
      const allContacts: any[] = [];
      let pageToken: string | undefined;

      do {
        const result = await this.listContacts(pageSize, pageToken);
        allContacts.push(...result.contacts);
        pageToken = result.nextPageToken;

        console.log(`Fetched ${result.contacts.length} contacts, total: ${allContacts.length}`);
      } while (pageToken);

      return allContacts;
    } catch (error) {
      console.error('Error syncing contacts:', error);
      throw error;
    }
  }

  /**
   * Extract display name from Google contact
   */
  extractDisplayName(contact: any): string {
    if (contact.names && contact.names.length > 0) {
      return contact.names[0].displayName || 'Unknown';
    }
    if (contact.emailAddresses && contact.emailAddresses.length > 0) {
      return contact.emailAddresses[0].value;
    }
    return 'Unknown Contact';
  }

  /**
   * Extract given name from Google contact
   */
  extractGivenName(contact: any): string | undefined {
    if (contact.names && contact.names.length > 0) {
      return contact.names[0].givenName;
    }
    return undefined;
  }

  /**
   * Extract family name from Google contact
   */
  extractFamilyName(contact: any): string | undefined {
    if (contact.names && contact.names.length > 0) {
      return contact.names[0].familyName;
    }
    return undefined;
  }

  /**
   * Extract emails from Google contact
   */
  extractEmails(contact: any): Array<{ value: string; type?: string }> {
    if (!contact.emailAddresses) return [];

    return contact.emailAddresses.map((email: any) => ({
      value: email.value,
      type: email.type || 'other',
    }));
  }

  /**
   * Extract phone numbers from Google contact
   */
  extractPhones(contact: any): Array<{ value: string; type?: string }> {
    if (!contact.phoneNumbers) return [];

    return contact.phoneNumbers.map((phone: any) => ({
      value: phone.value,
      type: phone.type || 'other',
    }));
  }

  /**
   * Extract photo URL from Google contact
   */
  extractPhotoUrl(contact: any): string | undefined {
    if (contact.photos && contact.photos.length > 0) {
      return contact.photos[0].url;
    }
    return undefined;
  }

  /**
   * Extract notes/biography from Google contact
   */
  extractNotes(contact: any): string | undefined {
    if (contact.biographies && contact.biographies.length > 0) {
      return contact.biographies[0].value;
    }
    return undefined;
  }

  /**
   * Extract Google contact resource name (used as ID)
   */
  extractResourceName(contact: any): string {
    return contact.resourceName;
  }

  /**
   * List all contact groups (labels)
   */
  async listContactGroups() {
    try {
      const response = await this.people.contactGroups.list({});
      return response.data.contactGroups || [];
    } catch (error) {
      console.error('Error listing contact groups:', error);
      throw error;
    }
  }

  /**
   * Extract contact group memberships from a contact
   * Returns array of contactGroup resourceNames
   */
  extractGroupMemberships(contact: any): string[] {
    if (!contact.memberships) return [];

    return contact.memberships
      .filter((m: any) => m.contactGroupMembership)
      .map((m: any) => m.contactGroupMembership.contactGroupResourceName);
  }

  /**
   * Update a contact in Google Contacts
   */
  async updateContact(resourceName: string, data: {
    displayName?: string;
    givenName?: string;
    familyName?: string;
    emails?: Array<{ value: string; type?: string }>;
    phones?: Array<{ value: string; type?: string }>;
    notes?: string;
    etag: string; // Required for updates
  }) {
    try {
      const requestBody: any = {
        resourceName,
        etag: data.etag,
      };

      // Update names if provided
      if (data.displayName !== undefined) {
        const nameObject: any = {
          displayName: data.displayName,
        };
        if (data.givenName) nameObject.givenName = data.givenName;
        if (data.familyName) nameObject.familyName = data.familyName;
        requestBody.names = [nameObject];
      }

      // Update emails
      if (data.emails !== undefined) {
        requestBody.emailAddresses = data.emails.map((email) => ({
          value: email.value,
          type: email.type || 'other',
        }));
      }

      // Update phones
      if (data.phones !== undefined) {
        requestBody.phoneNumbers = data.phones.map((phone) => ({
          value: phone.value,
          type: phone.type || 'other',
        }));
      }

      // Update notes
      if (data.notes !== undefined) {
        requestBody.biographies = data.notes ? [{
          value: data.notes,
          contentType: 'TEXT_PLAIN',
        }] : [];
      }

      // Determine which fields to update
      const updateFields: string[] = [];
      if (requestBody.names) updateFields.push('names');
      if (requestBody.emailAddresses) updateFields.push('emailAddresses');
      if (requestBody.phoneNumbers) updateFields.push('phoneNumbers');
      if (requestBody.biographies !== undefined) updateFields.push('biographies');

      const response = await this.people.people.updateContact({
        resourceName,
        updatePersonFields: updateFields.join(','),
        requestBody,
      });

      return response.data;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Update a contact's biography/notes in Google Contacts
   * @deprecated Use updateContact instead
   */
  async updateContactNotes(resourceName: string, notes: string, etag: string) {
    try {
      const response = await this.people.people.updateContact({
        resourceName,
        updatePersonFields: 'biographies',
        requestBody: {
          resourceName,
          etag,
          biographies: notes ? [{
            value: notes,
            contentType: 'TEXT_PLAIN',
          }] : [],
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error updating contact notes:', error);
      throw error;
    }
  }

  /**
   * Create a new contact group (label) in Google Contacts
   */
  async createContactGroup(name: string) {
    try {
      const response = await this.people.contactGroups.create({
        requestBody: {
          contactGroup: {
            name,
          },
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating contact group:', error);
      throw error;
    }
  }

  /**
   * Add a contact to a contact group
   */
  async addContactToGroup(contactResourceName: string, groupResourceName: string) {
    try {
      const response = await this.people.contactGroups.members.modify({
        resourceName: groupResourceName,
        requestBody: {
          resourceNamesToAdd: [contactResourceName],
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error adding contact to group:', error);
      throw error;
    }
  }

  /**
   * Remove a contact from a contact group
   */
  async removeContactFromGroup(contactResourceName: string, groupResourceName: string) {
    try {
      const response = await this.people.contactGroups.members.modify({
        resourceName: groupResourceName,
        requestBody: {
          resourceNamesToRemove: [contactResourceName],
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error removing contact from group:', error);
      throw error;
    }
  }

  /**
   * Create a new contact in Google Contacts
   */
  async createContact(data: {
    displayName: string;
    givenName?: string;
    familyName?: string;
    emails?: Array<{ value: string; type?: string }>;
    phones?: Array<{ value: string; type?: string }>;
    notes?: string;
  }) {
    try {
      const requestBody: any = {};

      // Add names - always include at least the display name
      const nameObject: any = {
        displayName: data.displayName,
      };

      // Only add givenName/familyName if they're provided
      if (data.givenName) {
        nameObject.givenName = data.givenName;
      }
      if (data.familyName) {
        nameObject.familyName = data.familyName;
      }

      requestBody.names = [nameObject];

      console.log('📤 Sending name to Google:', JSON.stringify(nameObject));

      // Add emails
      if (data.emails && data.emails.length > 0) {
        requestBody.emailAddresses = data.emails.map((email) => ({
          value: email.value,
          type: email.type || 'other',
        }));
      }

      // Add phones
      if (data.phones && data.phones.length > 0) {
        requestBody.phoneNumbers = data.phones.map((phone) => ({
          value: phone.value,
          type: phone.type || 'other',
        }));
      }

      // Add notes
      if (data.notes) {
        requestBody.biographies = [{
          value: data.notes,
          contentType: 'TEXT_PLAIN',
        }];
      }

      const response = await this.people.people.createContact({
        requestBody,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  }
}
