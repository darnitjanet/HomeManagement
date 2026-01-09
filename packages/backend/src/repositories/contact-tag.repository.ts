import { db } from '../config/database';
import { ContactTag } from '../types';

export class ContactTagRepository {
  /**
   * Get all tags ordered by priority
   */
  async getAllTags(): Promise<ContactTag[]> {
    const tags = await db('contact_tags')
      .orderBy('priority', 'desc')
      .orderBy('name', 'asc');

    return tags.map(this.mapFromDb);
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: number): Promise<ContactTag | null> {
    const tag = await db('contact_tags').where({ id }).first();

    if (!tag) return null;

    return this.mapFromDb(tag);
  }

  /**
   * Get tag by name
   */
  async getTagByName(name: string): Promise<ContactTag | null> {
    const tag = await db('contact_tags')
      .where({ name })
      .first();

    if (!tag) return null;

    return this.mapFromDb(tag);
  }

  /**
   * Create a new tag
   */
  async createTag(tag: Omit<ContactTag, 'id' | 'createdAt'>): Promise<number> {
    const [id] = await db('contact_tags').insert({
      name: tag.name,
      color: tag.color,
      priority: tag.priority,
    });

    return id;
  }

  /**
   * Update a tag
   */
  async updateTag(id: number, tag: Partial<ContactTag>): Promise<void> {
    const updates: any = {};

    if (tag.name !== undefined) updates.name = tag.name;
    if (tag.color !== undefined) updates.color = tag.color;
    if (tag.priority !== undefined) updates.priority = tag.priority;

    await db('contact_tags').where({ id }).update(updates);
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number): Promise<void> {
    await db('contact_tags').where({ id }).delete();
  }

  /**
   * Get contact count for a tag
   */
  async getContactCount(tagId: number): Promise<number> {
    const result = await db('contact_tag_assignments')
      .where({ tag_id: tagId })
      .count('* as count')
      .first();

    return result?.count || 0;
  }

  /**
   * Map database row to ContactTag
   */
  private mapFromDb(row: any): ContactTag {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      priority: row.priority,
      createdAt: row.created_at,
    };
  }
}
