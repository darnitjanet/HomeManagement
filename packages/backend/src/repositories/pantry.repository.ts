import { db } from '../config/database';

// Categories (shared with shopping)
export const PANTRY_CATEGORIES = [
  'Produce',
  'Bakery',
  'Dairy',
  'Meat & Seafood',
  'Frozen',
  'Pantry',
  'Beverages',
  'Snacks',
  'Spices & Seasonings',
  'Condiments',
  'Other',
] as const;

export type PantryCategory = typeof PANTRY_CATEGORIES[number];

// Storage locations
export const STORAGE_LOCATIONS = [
  'Refrigerator',
  'Freezer',
  'Pantry',
  'Counter',
  'Spice Rack',
] as const;

export type StorageLocation = typeof STORAGE_LOCATIONS[number];

// Common units
export const COMMON_UNITS = [
  'count',
  'lbs',
  'oz',
  'cups',
  'tbsp',
  'tsp',
  'gallons',
  'liters',
  'ml',
  'bags',
  'boxes',
  'cans',
  'jars',
  'bottles',
  'packages',
] as const;

export interface PantryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string | null;
  category: PantryCategory | null;
  location: StorageLocation | null;
  expirationDate: string | null;
  purchaseDate: string | null;
  lowStockThreshold: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePantryItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  category?: PantryCategory;
  location?: StorageLocation;
  expirationDate?: string;
  purchaseDate?: string;
  lowStockThreshold?: number;
  notes?: string;
}

export interface UpdatePantryItemInput {
  name?: string;
  quantity?: number;
  unit?: string;
  category?: PantryCategory;
  location?: StorageLocation;
  expirationDate?: string | null;
  purchaseDate?: string | null;
  lowStockThreshold?: number | null;
  notes?: string | null;
}

export class PantryRepository {
  // =====================
  // CRUD OPERATIONS
  // =====================

  async getAllItems(filters?: {
    category?: PantryCategory;
    location?: StorageLocation;
  }): Promise<PantryItem[]> {
    let query = db('pantry_items');

    if (filters?.category) {
      query = query.where({ category: filters.category });
    }
    if (filters?.location) {
      query = query.where({ location: filters.location });
    }

    const items = await query.orderBy([
      { column: 'category', order: 'asc' },
      { column: 'name', order: 'asc' },
    ]);

    return items.map(this.mapItemFromDb);
  }

  async getItem(id: number): Promise<PantryItem | null> {
    const item = await db('pantry_items').where({ id }).first();
    return item ? this.mapItemFromDb(item) : null;
  }

  async createItem(input: CreatePantryItemInput): Promise<number> {
    const now = new Date().toISOString();
    const [id] = await db('pantry_items').insert({
      name: input.name,
      quantity: input.quantity ?? 1,
      unit: input.unit || null,
      category: input.category || null,
      location: input.location || null,
      expiration_date: input.expirationDate || null,
      purchase_date: input.purchaseDate || null,
      low_stock_threshold: input.lowStockThreshold || null,
      notes: input.notes || null,
      created_at: now,
      updated_at: now,
    });
    return id;
  }

  async updateItem(id: number, input: UpdatePantryItemInput): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.quantity !== undefined) updateData.quantity = input.quantity;
    if (input.unit !== undefined) updateData.unit = input.unit || null;
    if (input.category !== undefined) updateData.category = input.category || null;
    if (input.location !== undefined) updateData.location = input.location || null;
    if (input.expirationDate !== undefined) updateData.expiration_date = input.expirationDate;
    if (input.purchaseDate !== undefined) updateData.purchase_date = input.purchaseDate;
    if (input.lowStockThreshold !== undefined) updateData.low_stock_threshold = input.lowStockThreshold;
    if (input.notes !== undefined) updateData.notes = input.notes;

    await db('pantry_items').where({ id }).update(updateData);
  }

  async deleteItem(id: number): Promise<void> {
    await db('pantry_items').where({ id }).delete();
  }

  // =====================
  // QUERY OPERATIONS
  // =====================

  async searchItems(query: string): Promise<PantryItem[]> {
    const items = await db('pantry_items')
      .where('name', 'like', `%${query}%`)
      .orWhere('notes', 'like', `%${query}%`)
      .orderBy('name', 'asc');
    return items.map(this.mapItemFromDb);
  }

  async getExpiringItems(withinDays: number = 7): Promise<PantryItem[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const todayStr = new Date().toISOString().split('T')[0];

    const items = await db('pantry_items')
      .whereNotNull('expiration_date')
      .where('expiration_date', '<=', futureDateStr)
      .where('expiration_date', '>=', todayStr)
      .orderBy('expiration_date', 'asc');
    return items.map(this.mapItemFromDb);
  }

  async getExpiredItems(): Promise<PantryItem[]> {
    const todayStr = new Date().toISOString().split('T')[0];

    const items = await db('pantry_items')
      .whereNotNull('expiration_date')
      .where('expiration_date', '<', todayStr)
      .orderBy('expiration_date', 'asc');
    return items.map(this.mapItemFromDb);
  }

  async getLowStockItems(): Promise<PantryItem[]> {
    const items = await db('pantry_items')
      .whereNotNull('low_stock_threshold')
      .whereRaw('quantity <= low_stock_threshold')
      .orderBy('name', 'asc');
    return items.map(this.mapItemFromDb);
  }

  // =====================
  // QUANTITY OPERATIONS
  // =====================

  async updateQuantity(id: number, quantity: number): Promise<void> {
    await db('pantry_items')
      .where({ id })
      .update({
        quantity,
        updated_at: new Date().toISOString(),
      });
  }

  async decrementQuantity(id: number, amount: number = 1): Promise<void> {
    await db('pantry_items')
      .where({ id })
      .decrement('quantity', amount)
      .update({ updated_at: new Date().toISOString() });
  }

  async incrementQuantity(id: number, amount: number = 1): Promise<void> {
    await db('pantry_items')
      .where({ id })
      .increment('quantity', amount)
      .update({ updated_at: new Date().toISOString() });
  }

  // =====================
  // BULK OPERATIONS
  // =====================

  async addMultipleItems(items: CreatePantryItemInput[]): Promise<number[]> {
    const now = new Date().toISOString();
    const insertData = items.map((item) => ({
      name: item.name,
      quantity: item.quantity ?? 1,
      unit: item.unit || null,
      category: item.category || null,
      location: item.location || null,
      expiration_date: item.expirationDate || null,
      purchase_date: item.purchaseDate || null,
      low_stock_threshold: item.lowStockThreshold || null,
      notes: item.notes || null,
      created_at: now,
      updated_at: now,
    }));

    // SQLite doesn't return all IDs on bulk insert, so insert one by one
    const ids: number[] = [];
    for (const data of insertData) {
      const [id] = await db('pantry_items').insert(data);
      ids.push(id);
    }
    return ids;
  }

  // =====================
  // AI INTEGRATION
  // =====================

  async getIngredientNames(): Promise<string[]> {
    const items = await db('pantry_items')
      .select('name')
      .where('quantity', '>', 0)
      .orderBy('name', 'asc');
    return items.map((item) => item.name);
  }

  async getIngredientsWithQuantity(): Promise<{ name: string; quantity: number; unit: string | null }[]> {
    const items = await db('pantry_items')
      .select('name', 'quantity', 'unit')
      .where('quantity', '>', 0)
      .orderBy('name', 'asc');
    return items;
  }

  // =====================
  // MAPPING FUNCTION
  // =====================

  private mapItemFromDb(row: any): PantryItem {
    return {
      id: row.id,
      name: row.name,
      quantity: parseFloat(row.quantity) || 0,
      unit: row.unit,
      category: row.category,
      location: row.location,
      expirationDate: row.expiration_date,
      purchaseDate: row.purchase_date,
      lowStockThreshold: row.low_stock_threshold ? parseFloat(row.low_stock_threshold) : null,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
