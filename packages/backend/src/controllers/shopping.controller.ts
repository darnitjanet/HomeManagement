import { Request, Response } from 'express';
import { ShoppingRepository } from '../repositories/shopping.repository';
import { categorizeGroceryItem, isAIEnabled } from '../services/ai.service';
import { lookupBarcode as lookupBarcodeService } from '../services/barcode.service';

const shoppingRepo = new ShoppingRepository();

// =====================
// AI STATUS
// =====================

export async function getAIStatus(_req: Request, res: Response) {
  res.json({ success: true, data: { aiEnabled: isAIEnabled() } });
}

// =====================
// BARCODE LOOKUP
// =====================

export async function lookupBarcode(req: Request, res: Response) {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Barcode is required' });
    }

    const product = await lookupBarcodeService(code);
    res.json({ success: true, data: product });
  } catch (error: any) {
    console.error('Barcode lookup error:', error);
    res.status(500).json({ success: false, error: 'Failed to lookup barcode', message: error.message });
  }
}

// =====================
// SHOPPING ITEMS
// =====================

export async function getItems(req: Request, res: Response) {
  try {
    const { listType } = req.params;
    if (listType !== 'grocery' && listType !== 'other') {
      return res.status(400).json({ success: false, error: 'Invalid list type' });
    }

    const items = await shoppingRepo.getItems(listType);
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Get items error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve items', message: error.message });
  }
}

export async function addItem(req: Request, res: Response) {
  try {
    const { listType } = req.params;
    const { name, quantity, category } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    if (listType !== 'grocery' && listType !== 'other') {
      return res.status(400).json({ success: false, error: 'Invalid list type' });
    }

    // Auto-categorize grocery items using AI if no category provided
    let itemCategory = category;
    if (listType === 'grocery' && !category) {
      itemCategory = await categorizeGroceryItem(name);
    }

    const id = await shoppingRepo.addItem({
      listType,
      name,
      quantity,
      category: listType === 'grocery' ? itemCategory : undefined
    });

    const items = await shoppingRepo.getItems(listType);
    res.json({ success: true, data: items, itemId: id });
  } catch (error: any) {
    console.error('Add item error:', error);
    res.status(500).json({ success: false, error: 'Failed to add item', message: error.message });
  }
}

export async function updateItemQuantity(req: Request, res: Response) {
  try {
    const { listType, id } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ success: false, error: 'Valid quantity is required' });
    }

    await shoppingRepo.updateItemQuantity(parseInt(id), quantity);

    const items = await shoppingRepo.getItems(listType as 'grocery' | 'other');
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Update item error:', error);
    res.status(500).json({ success: false, error: 'Failed to update item', message: error.message });
  }
}

export async function removeItem(req: Request, res: Response) {
  try {
    const { listType, id } = req.params;
    await shoppingRepo.removeItem(parseInt(id));

    const items = await shoppingRepo.getItems(listType as 'grocery' | 'other');
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Remove item error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove item', message: error.message });
  }
}

export async function clearList(req: Request, res: Response) {
  try {
    const { listType } = req.params;
    if (listType !== 'grocery' && listType !== 'other') {
      return res.status(400).json({ success: false, error: 'Invalid list type' });
    }

    await shoppingRepo.clearList(listType);
    res.json({ success: true, data: [] });
  } catch (error: any) {
    console.error('Clear list error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear list', message: error.message });
  }
}

// =====================
// FAVORITES
// =====================

export async function getFavorites(req: Request, res: Response) {
  try {
    const { listType } = req.params;
    if (listType !== 'grocery' && listType !== 'other') {
      return res.status(400).json({ success: false, error: 'Invalid list type' });
    }

    const favorites = await shoppingRepo.getFavorites(listType);
    res.json({ success: true, data: favorites });
  } catch (error: any) {
    console.error('Get favorites error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve favorites', message: error.message });
  }
}

export async function addFavorite(req: Request, res: Response) {
  try {
    const { listType } = req.params;
    const { name, category, defaultQuantity } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    if (listType !== 'grocery' && listType !== 'other') {
      return res.status(400).json({ success: false, error: 'Invalid list type' });
    }

    // Auto-categorize grocery favorites using AI if no category provided
    let itemCategory = category;
    if (listType === 'grocery' && !category) {
      itemCategory = await categorizeGroceryItem(name);
    }

    await shoppingRepo.addFavorite({
      listType,
      name,
      category: listType === 'grocery' ? itemCategory : undefined,
      defaultQuantity
    });

    const favorites = await shoppingRepo.getFavorites(listType);
    res.json({ success: true, data: favorites });
  } catch (error: any) {
    console.error('Add favorite error:', error);
    res.status(500).json({ success: false, error: 'Failed to add favorite', message: error.message });
  }
}

export async function removeFavorite(req: Request, res: Response) {
  try {
    const { listType, id } = req.params;
    await shoppingRepo.removeFavorite(parseInt(id));

    const favorites = await shoppingRepo.getFavorites(listType as 'grocery' | 'other');
    res.json({ success: true, data: favorites });
  } catch (error: any) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove favorite', message: error.message });
  }
}

export async function addFavoriteToList(req: Request, res: Response) {
  try {
    const { listType, id } = req.params;
    await shoppingRepo.addFavoriteToList(parseInt(id));

    const items = await shoppingRepo.getItems(listType as 'grocery' | 'other');
    res.json({ success: true, data: items });
  } catch (error: any) {
    console.error('Add favorite to list error:', error);
    res.status(500).json({ success: false, error: 'Failed to add favorite to list', message: error.message });
  }
}
