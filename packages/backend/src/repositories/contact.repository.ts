import { db } from '../config/database';
import { Contact } from '../types';

export class ContactRepository {
  /**
   * Get all contacts with their tags
   */
  async getAllContacts(): Promise<Contact[]> {
    const contacts = await db('contacts')
      .orderBy('display_name', 'asc');

    // Get tags for each contact
    for (const contact of contacts) {
      contact.tags = await this.getContactTags(contact.id);
    }

    return contacts.map(this.mapFromDb);
  }

  /**
   * Get contacts by tag
   */
  async getContactsByTag(tagId: number): Promise<Contact[]> {
    const contacts = await db('contacts')
      .join('contact_tag_assignments', 'contacts.id', 'contact_tag_assignments.contact_id')
      .where('contact_tag_assignments.tag_id', tagId)
      .select('contacts.*')
      .orderBy('contacts.display_name', 'asc');

    // Get tags for each contact
    for (const contact of contacts) {
      contact.tags = await this.getContactTags(contact.id);
    }

    return contacts.map(this.mapFromDb);
  }

  /**
   * Get favorite contacts
   */
  async getFavoriteContacts(): Promise<Contact[]> {
    const contacts = await db('contacts')
      .where({ is_favorite: true })
      .orderBy('display_name', 'asc');

    // Get tags for each contact
    for (const contact of contacts) {
      contact.tags = await this.getContactTags(contact.id);
    }

    return contacts.map(this.mapFromDb);
  }

  /**
   * Search contacts by name
   */
  async searchContacts(query: string): Promise<Contact[]> {
    const contacts = await db('contacts')
      .where('display_name', 'like', `%${query}%`)
      .orWhere('given_name', 'like', `%${query}%`)
      .orWhere('family_name', 'like', `%${query}%`)
      .orderBy('display_name', 'asc');

    // Get tags for each contact
    for (const contact of contacts) {
      contact.tags = await this.getContactTags(contact.id);
    }

    return contacts.map(this.mapFromDb);
  }

  /**
   * Get a single contact by ID
   */
  async getContact(id: number): Promise<Contact | null> {
    const contact = await db('contacts').where({ id }).first();

    if (!contact) return null;

    contact.tags = await this.getContactTags(id);

    return this.mapFromDb(contact);
  }

  /**
   * Get contact by Google contact ID
   */
  async getContactByGoogleId(googleContactId: string): Promise<Contact | null> {
    const contact = await db('contacts')
      .where({ google_contact_id: googleContactId })
      .first();

    if (!contact) return null;

    contact.tags = await this.getContactTags(contact.id);

    return this.mapFromDb(contact);
  }

  /**
   * Upsert a contact
   */
  async upsertContact(contact: Partial<Contact>): Promise<number> {
    const existing = contact.googleContactId
      ? await this.getContactByGoogleId(contact.googleContactId)
      : null;

    const dbData = this.mapToDb(contact);

    if (existing) {
      await db('contacts')
        .where({ id: existing.id })
        .update({
          ...dbData,
          updated_at: db.fn.now(),
        });
      return existing.id;
    } else {
      const [id] = await db('contacts').insert(dbData);
      return id;
    }
  }

  /**
   * Update an existing contact by ID
   */
  async updateContact(id: number, contact: Partial<Contact>): Promise<void> {
    const dbData = this.mapToDb(contact);

    await db('contacts')
      .where({ id })
      .update({
        ...dbData,
        updated_at: db.fn.now(),
      });
  }

  /**
   * Delete a contact
   */
  async deleteContact(id: number): Promise<void> {
    await db('contacts').where({ id }).delete();
  }

  /**
   * Get tags for a contact
   */
  async getContactTags(contactId: number) {
    return await db('contact_tags')
      .join('contact_tag_assignments', 'contact_tags.id', 'contact_tag_assignments.tag_id')
      .where('contact_tag_assignments.contact_id', contactId)
      .select('contact_tags.*')
      .orderBy('contact_tags.priority', 'desc');
  }

  /**
   * Add tag to contact
   */
  async addTagToContact(contactId: number, tagId: number): Promise<void> {
    await db('contact_tag_assignments')
      .insert({ contact_id: contactId, tag_id: tagId })
      .onConflict(['contact_id', 'tag_id'])
      .ignore();
  }

  /**
   * Remove tag from contact
   */
  async removeTagFromContact(contactId: number, tagId: number): Promise<void> {
    await db('contact_tag_assignments')
      .where({ contact_id: contactId, tag_id: tagId })
      .delete();
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: number): Promise<boolean> {
    const contact = await db('contacts').where({ id }).first();
    const newStatus = !contact.is_favorite;

    await db('contacts')
      .where({ id })
      .update({ is_favorite: newStatus });

    return newStatus;
  }

  /**
   * Get contacts with upcoming birthdays
   */
  async getContactsWithUpcomingBirthdays(daysAhead: number = 7): Promise<(Contact & { daysUntil: number })[]> {
    const contacts = await db('contacts')
      .whereNotNull('birthday')
      .where('birthday', '!=', '');

    const today = new Date();
    const upcoming: (Contact & { daysUntil: number })[] = [];

    for (const contact of contacts) {
      if (!contact.birthday) continue;

      const [month, day] = contact.birthday.split('-').map(Number);
      if (!month || !day) continue;

      const thisYear = today.getFullYear();

      // Create date for this year's birthday
      let birthdayDate = new Date(thisYear, month - 1, day);

      // If birthday already passed this year, check next year
      if (birthdayDate < today) {
        birthdayDate = new Date(thisYear + 1, month - 1, day);
      }

      const daysUntil = Math.ceil((birthdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil >= 0 && daysUntil <= daysAhead) {
        const mappedContact = this.mapFromDb(contact);
        upcoming.push({ ...mappedContact, daysUntil });
      }
    }

    // Sort by days until birthday
    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  /**
   * Map database row to Contact
   */
  private mapFromDb(row: any): Contact {
    return {
      id: row.id,
      googleContactId: row.google_contact_id,
      displayName: row.display_name,
      givenName: row.given_name,
      familyName: row.family_name,
      emails: row.emails ? JSON.parse(row.emails) : undefined,
      phones: row.phones ? JSON.parse(row.phones) : undefined,
      photoUrl: row.photo_url,
      notes: row.notes,
      rawData: row.raw_data,
      birthday: row.birthday,
      isFavorite: Boolean(row.is_favorite),
      lastSyncedAt: row.last_synced_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: row.tags,
    };
  }

  /**
   * Map Contact to database row
   */
  private mapToDb(contact: Partial<Contact>): any {
    const dbData: any = {};

    if (contact.googleContactId !== undefined) dbData.google_contact_id = contact.googleContactId;
    if (contact.displayName !== undefined) dbData.display_name = contact.displayName;
    if (contact.givenName !== undefined) dbData.given_name = contact.givenName;
    if (contact.familyName !== undefined) dbData.family_name = contact.familyName;
    if (contact.emails !== undefined) dbData.emails = JSON.stringify(contact.emails);
    if (contact.phones !== undefined) dbData.phones = JSON.stringify(contact.phones);
    if (contact.photoUrl !== undefined) dbData.photo_url = contact.photoUrl;
    if (contact.notes !== undefined) dbData.notes = contact.notes;
    if (contact.rawData !== undefined) dbData.raw_data = contact.rawData;
    if (contact.isFavorite !== undefined) dbData.is_favorite = contact.isFavorite;
    if (contact.lastSyncedAt !== undefined) dbData.last_synced_at = contact.lastSyncedAt;
    if (contact.birthday !== undefined) dbData.birthday = contact.birthday;

    return dbData;
  }
}
