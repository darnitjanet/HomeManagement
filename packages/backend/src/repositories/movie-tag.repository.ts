import { db } from '../config/database';
import { MovieTag } from '../types';

export class MovieTagRepository {
  /**
   * Get all tags ordered by priority
   */
  async getAllTags(): Promise<MovieTag[]> {
    const tags = await db('movie_tags')
      .orderBy('priority', 'desc')
      .orderBy('name', 'asc');

    return tags.map(this.mapFromDb);
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: number): Promise<MovieTag | null> {
    const tag = await db('movie_tags').where({ id }).first();

    if (!tag) return null;

    return this.mapFromDb(tag);
  }

  /**
   * Get tag by name
   */
  async getTagByName(name: string): Promise<MovieTag | null> {
    const tag = await db('movie_tags')
      .where({ name })
      .first();

    if (!tag) return null;

    return this.mapFromDb(tag);
  }

  /**
   * Create a new tag
   */
  async createTag(tag: Omit<MovieTag, 'id' | 'createdAt'>): Promise<number> {
    const [id] = await db('movie_tags').insert({
      name: tag.name,
      color: tag.color,
      priority: tag.priority,
    });

    return id;
  }

  /**
   * Update a tag
   */
  async updateTag(id: number, tag: Partial<MovieTag>): Promise<void> {
    const updates: any = {};

    if (tag.name !== undefined) updates.name = tag.name;
    if (tag.color !== undefined) updates.color = tag.color;
    if (tag.priority !== undefined) updates.priority = tag.priority;

    await db('movie_tags').where({ id }).update(updates);
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: number): Promise<void> {
    await db('movie_tags').where({ id }).delete();
  }

  /**
   * Get movie count for a tag
   */
  async getMovieCount(tagId: number): Promise<number> {
    const result = await db('movie_tag_assignments')
      .where({ tag_id: tagId })
      .count('* as count')
      .first();

    return Number(result?.count) || 0;
  }

  /**
   * Map database row to MovieTag
   */
  private mapFromDb(row: any): MovieTag {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      priority: row.priority,
      createdAt: row.created_at,
    };
  }
}
