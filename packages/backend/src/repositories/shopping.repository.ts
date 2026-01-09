import { db } from '../config/database';
import { ShoppingItem, FavoriteItem, CreateShoppingItemInput, CreateFavoriteInput, GroceryCategory } from '../types';

// Category order for grocery sorting (typical store layout)
const CATEGORY_ORDER: GroceryCategory[] = [
  'Produce',
  'Bakery',
  'Dairy',
  'Meat & Seafood',
  'Frozen',
  'Pantry',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Other',
];

export class ShoppingRepository {
  // =====================
  // SHOPPING ITEMS
  // =====================

  async getItems(listType: 'grocery' | 'other'): Promise<ShoppingItem[]> {
    const items = await db('shopping_items')
      .where({ list_type: listType })
      .orderBy('created_at', 'asc');

    const mapped = items.map(this.mapItemFromDb);

    // Sort grocery items by category order
    if (listType === 'grocery') {
      return mapped.sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a.category || 'Other');
        const bIndex = CATEGORY_ORDER.indexOf(b.category || 'Other');
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.name.localeCompare(b.name);
      });
    }

    return mapped;
  }

  async addItem(input: CreateShoppingItemInput): Promise<number> {
    const [id] = await db('shopping_items').insert({
      list_type: input.listType,
      name: input.name,
      quantity: input.quantity || 1,
      category: input.category || null,
    });
    return id;
  }

  async updateItemQuantity(id: number, quantity: number): Promise<void> {
    await db('shopping_items')
      .where({ id })
      .update({ quantity });
  }

  async removeItem(id: number): Promise<void> {
    await db('shopping_items').where({ id }).delete();
  }

  async clearList(listType: 'grocery' | 'other'): Promise<void> {
    await db('shopping_items').where({ list_type: listType }).delete();
  }

  // =====================
  // FAVORITE ITEMS
  // =====================

  async getFavorites(listType: 'grocery' | 'other'): Promise<FavoriteItem[]> {
    const items = await db('favorite_items')
      .where({ list_type: listType })
      .orderBy('name', 'asc');
    return items.map(this.mapFavoriteFromDb);
  }

  async addFavorite(input: CreateFavoriteInput): Promise<number> {
    const [id] = await db('favorite_items').insert({
      list_type: input.listType,
      name: input.name,
      category: input.category || null,
      default_quantity: input.defaultQuantity || 1,
    });
    return id;
  }

  async removeFavorite(id: number): Promise<void> {
    await db('favorite_items').where({ id }).delete();
  }

  async addFavoriteToList(favoriteId: number): Promise<number> {
    const favorite = await db('favorite_items').where({ id: favoriteId }).first();
    if (!favorite) throw new Error('Favorite not found');

    const [id] = await db('shopping_items').insert({
      list_type: favorite.list_type,
      name: favorite.name,
      quantity: favorite.default_quantity,
      category: favorite.category,
    });
    return id;
  }

  // =====================
  // MAPPING FUNCTIONS
  // =====================

  private mapItemFromDb(row: any): ShoppingItem {
    return {
      id: row.id,
      listType: row.list_type,
      name: row.name,
      quantity: row.quantity,
      category: row.category,
      createdAt: row.created_at,
    };
  }

  private mapFavoriteFromDb(row: any): FavoriteItem {
    return {
      id: row.id,
      listType: row.list_type,
      name: row.name,
      category: row.category,
      defaultQuantity: row.default_quantity,
      createdAt: row.created_at,
    };
  }
}
