import { Request, Response } from 'express';
import {
  PantryRepository,
  PANTRY_CATEGORIES,
  STORAGE_LOCATIONS,
  COMMON_UNITS,
} from '../repositories/pantry.repository';
import { categorizeGroceryItem, isAIEnabled } from '../services/ai.service';

const pantryRepo = new PantryRepository();

// =====================
// CONSTANTS
// =====================

export async function getConstants(_req: Request, res: Response) {
  res.json({
    success: true,
    data: {
      categories: PANTRY_CATEGORIES,
      locations: STORAGE_LOCATIONS,
      units: COMMON_UNITS,
      aiEnabled: isAIEnabled(),
    },
  });
}

// =====================
// CRUD OPERATIONS
// =====================

export async function getAllItems(req: Request, res: Response) {
  try {
    const { category, location } = req.query;
    const items = await pantryRepo.getAllItems({
      category: category as any,
      location: location as any,
    });
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Get pantry items error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve items', message: error.message });
  }
}

export async function getItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const item = await pantryRepo.getItem(parseInt(id));
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Get pantry item error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve item', message: error.message });
  }
}

export async function createItem(req: Request, res: Response) {
  try {
    const { name, quantity, unit, category, location, expirationDate, purchaseDate, lowStockThreshold, notes } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    // Auto-categorize using AI if no category provided
    let itemCategory = category;
    if (!category) {
      itemCategory = await categorizeGroceryItem(name);
    }

    const id = await pantryRepo.createItem({
      name,
      quantity,
      unit,
      category: itemCategory,
      location,
      expirationDate,
      purchaseDate,
      lowStockThreshold,
      notes,
    });

    const item = await pantryRepo.getItem(id);
    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Create pantry item error:', error);
    res.status(500).json({ success: false, error: 'Failed to create item', message: error.message });
  }
}

export async function updateItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, quantity, unit, category, location, expirationDate, purchaseDate, lowStockThreshold, notes } = req.body;

    const existing = await pantryRepo.getItem(parseInt(id));
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    await pantryRepo.updateItem(parseInt(id), {
      name,
      quantity,
      unit,
      category,
      location,
      expirationDate,
      purchaseDate,
      lowStockThreshold,
      notes,
    });

    const item = await pantryRepo.getItem(parseInt(id));
    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Update pantry item error:', error);
    res.status(500).json({ success: false, error: 'Failed to update item', message: error.message });
  }
}

export async function deleteItem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await pantryRepo.deleteItem(parseInt(id));
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete pantry item error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete item', message: error.message });
  }
}

// =====================
// QUERY OPERATIONS
// =====================

export async function searchItems(req: Request, res: Response) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }
    const items = await pantryRepo.searchItems(q);
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Search pantry items error:', error);
    res.status(500).json({ success: false, error: 'Failed to search items', message: error.message });
  }
}

export async function getExpiringItems(req: Request, res: Response) {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    const items = await pantryRepo.getExpiringItems(days);
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Get expiring items error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve expiring items', message: error.message });
  }
}

export async function getExpiredItems(_req: Request, res: Response) {
  try {
    const items = await pantryRepo.getExpiredItems();
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Get expired items error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve expired items', message: error.message });
  }
}

export async function getLowStockItems(_req: Request, res: Response) {
  try {
    const items = await pantryRepo.getLowStockItems();
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve low stock items', message: error.message });
  }
}

// =====================
// QUANTITY OPERATIONS
// =====================

export async function updateQuantity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ success: false, error: 'Valid quantity is required' });
    }

    await pantryRepo.updateQuantity(parseInt(id), quantity);
    const item = await pantryRepo.getItem(parseInt(id));
    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Update quantity error:', error);
    res.status(500).json({ success: false, error: 'Failed to update quantity', message: error.message });
  }
}

export async function incrementQuantity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const amount = req.body.amount || 1;

    await pantryRepo.incrementQuantity(parseInt(id), amount);
    const item = await pantryRepo.getItem(parseInt(id));
    res.json({ success: true, data: item });
  } catch (error: any) {
    console.error('Increment quantity error:', error);
    res.status(500).json({ success: false, error: 'Failed to increment quantity', message: error.message });
  }
}

export async function decrementQuantity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const amount = req.body.amount || 1;

    const item = await pantryRepo.getItem(parseInt(id));
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Don't go below zero
    const newQuantity = Math.max(0, item.quantity - amount);
    await pantryRepo.updateQuantity(parseInt(id), newQuantity);

    const updatedItem = await pantryRepo.getItem(parseInt(id));
    res.json({ success: true, data: updatedItem });
  } catch (error: any) {
    console.error('Decrement quantity error:', error);
    res.status(500).json({ success: false, error: 'Failed to decrement quantity', message: error.message });
  }
}

// =====================
// BULK OPERATIONS
// =====================

export async function addMultipleItems(req: Request, res: Response) {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Items array is required' });
    }

    // Auto-categorize items without categories
    const itemsWithCategories = await Promise.all(
      items.map(async (item: any) => {
        if (!item.category) {
          item.category = await categorizeGroceryItem(item.name);
        }
        return item;
      })
    );

    const ids = await pantryRepo.addMultipleItems(itemsWithCategories);
    const allItems = await pantryRepo.getAllItems();
    res.json({ success: true, data: allItems, ids });
  } catch (error: any) {
    console.error('Add multiple items error:', error);
    res.status(500).json({ success: false, error: 'Failed to add items', message: error.message });
  }
}

// =====================
// AI INTEGRATION
// =====================

export async function getIngredients(_req: Request, res: Response) {
  try {
    const ingredients = await pantryRepo.getIngredientNames();
    res.json({ success: true, data: ingredients });
  } catch (error: any) {
    console.error('Get ingredients error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve ingredients', message: error.message });
  }
}

export async function getIngredientsWithQuantity(_req: Request, res: Response) {
  try {
    const ingredients = await pantryRepo.getIngredientsWithQuantity();
    res.json({ success: true, data: ingredients });
  } catch (error: any) {
    console.error('Get ingredients with quantity error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve ingredients', message: error.message });
  }
}

// =====================
// BARCODE LOOKUP
// =====================

export async function lookupBarcode(req: Request, res: Response) {
  try {
    const { barcode } = req.params;

    if (!barcode || typeof barcode !== 'string') {
      return res.status(400).json({ success: false, error: 'Barcode is required' });
    }

    // Use Open Food Facts API (free, no API key required)
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 0 || !data.product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'This barcode is not in the Open Food Facts database'
      });
    }

    const product = data.product;

    // Extract relevant info
    const productInfo = {
      name: product.product_name || product.product_name_en || 'Unknown Product',
      brand: product.brands || null,
      category: mapOpenFoodFactsCategory(product.categories_tags || []),
      quantity: product.quantity || null,
      imageUrl: product.image_url || product.image_front_url || null,
      ingredients: product.ingredients_text || null,
      nutriscore: product.nutriscore_grade || null,
    };

    res.json({ success: true, data: productInfo });
  } catch (error: any) {
    console.error('Barcode lookup error:', error);
    res.status(500).json({ success: false, error: 'Failed to lookup barcode', message: error.message });
  }
}

// Map Open Food Facts categories to our pantry categories
function mapOpenFoodFactsCategory(tags: string[]): string | null {
  const tagString = tags.join(' ').toLowerCase();

  if (tagString.includes('dairy') || tagString.includes('milk') || tagString.includes('cheese') || tagString.includes('yogurt')) {
    return 'Dairy';
  }
  if (tagString.includes('meat') || tagString.includes('poultry') || tagString.includes('beef') || tagString.includes('chicken') || tagString.includes('pork')) {
    return 'Meat & Protein';
  }
  if (tagString.includes('seafood') || tagString.includes('fish') || tagString.includes('shrimp')) {
    return 'Meat & Protein';
  }
  if (tagString.includes('vegetable') || tagString.includes('fruit') || tagString.includes('produce')) {
    return 'Produce';
  }
  if (tagString.includes('bread') || tagString.includes('bakery') || tagString.includes('pastry')) {
    return 'Bakery';
  }
  if (tagString.includes('frozen')) {
    return 'Frozen';
  }
  if (tagString.includes('beverage') || tagString.includes('drink') || tagString.includes('juice') || tagString.includes('soda') || tagString.includes('water')) {
    return 'Beverages';
  }
  if (tagString.includes('snack') || tagString.includes('chip') || tagString.includes('cracker') || tagString.includes('cookie')) {
    return 'Snacks';
  }
  if (tagString.includes('sauce') || tagString.includes('condiment') || tagString.includes('dressing')) {
    return 'Condiments & Sauces';
  }
  if (tagString.includes('spice') || tagString.includes('herb') || tagString.includes('seasoning')) {
    return 'Spices & Seasonings';
  }
  if (tagString.includes('grain') || tagString.includes('rice') || tagString.includes('pasta') || tagString.includes('cereal')) {
    return 'Grains & Pasta';
  }
  if (tagString.includes('canned') || tagString.includes('preserved')) {
    return 'Canned Goods';
  }

  return null;
}
