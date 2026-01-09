import { Request, Response } from 'express';
import { AssetRepository } from '../repositories/asset.repository';

const assetRepo = new AssetRepository();

// =====================
// ASSET CRUD
// =====================

export async function getAllAssets(req: Request, res: Response) {
  try {
    const assets = await assetRepo.getAllAssets();
    res.json({ success: true, data: assets });
  } catch (error: any) {
    console.error('Get assets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve assets',
      message: error.message,
    });
  }
}

export async function getAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const asset = await assetRepo.getAsset(parseInt(id));

    if (!asset) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }

    res.json({ success: true, data: asset });
  } catch (error: any) {
    console.error('Get asset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve asset',
      message: error.message,
    });
  }
}

export async function searchAssets(req: Request, res: Response) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const assets = await assetRepo.searchAssets(q);
    res.json({ success: true, data: assets });
  } catch (error: any) {
    console.error('Search assets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search assets',
      message: error.message,
    });
  }
}

export async function filterAssets(req: Request, res: Response) {
  try {
    const { category, location, condition } = req.query;

    const filters: any = {};
    if (category) filters.category = category as string;
    if (location) filters.location = location as string;
    if (condition) filters.condition = condition as string;

    const assets = await assetRepo.filterAssets(filters);
    res.json({ success: true, data: assets });
  } catch (error: any) {
    console.error('Filter assets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to filter assets',
      message: error.message,
    });
  }
}

export async function getAssetsByTag(req: Request, res: Response) {
  try {
    const { tagId } = req.params;
    const assets = await assetRepo.getAssetsByTag(parseInt(tagId));
    res.json({ success: true, data: assets });
  } catch (error: any) {
    console.error('Get assets by tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve assets',
      message: error.message,
    });
  }
}

export async function createAsset(req: Request, res: Response) {
  try {
    const assetData = req.body;

    if (!assetData.name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const id = await assetRepo.createAsset(assetData);

    // If tags were provided, add them
    if (assetData.tags && Array.isArray(assetData.tags)) {
      for (const tagId of assetData.tags) {
        await assetRepo.addTagToAsset(id, tagId);
      }
    }

    const asset = await assetRepo.getAsset(id);
    res.json({ success: true, data: asset });
  } catch (error: any) {
    console.error('Create asset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create asset',
      message: error.message,
    });
  }
}

export async function updateAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    await assetRepo.updateAsset(parseInt(id), updates);

    const asset = await assetRepo.getAsset(parseInt(id));
    res.json({ success: true, data: asset });
  } catch (error: any) {
    console.error('Update asset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update asset',
      message: error.message,
    });
  }
}

export async function deleteAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await assetRepo.deleteAsset(parseInt(id));
    res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error: any) {
    console.error('Delete asset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete asset',
      message: error.message,
    });
  }
}

// =====================
// SUMMARY / STATS
// =====================

export async function getSummary(req: Request, res: Response) {
  try {
    const totals = await assetRepo.getTotalValue();
    const byCategory = await assetRepo.getValueByCategory();
    const byLocation = await assetRepo.getValueByLocation();

    res.json({
      success: true,
      data: {
        totals,
        byCategory,
        byLocation,
      },
    });
  } catch (error: any) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get summary',
      message: error.message,
    });
  }
}

// =====================
// TAG ENDPOINTS
// =====================

export async function getAllTags(req: Request, res: Response) {
  try {
    const tags = await assetRepo.getAllTags();
    res.json({ success: true, data: tags });
  } catch (error: any) {
    console.error('Get tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tags',
      message: error.message,
    });
  }
}

export async function createTag(req: Request, res: Response) {
  try {
    const { name, color, priority } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Tag name is required' });
    }

    const id = await assetRepo.createTag(name, color || '#6b7280', priority || 0);
    const tags = await assetRepo.getAllTags();
    const tag = tags.find((t) => t.id === id);

    res.json({ success: true, data: tag });
  } catch (error: any) {
    console.error('Create tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tag',
      message: error.message,
    });
  }
}

export async function updateTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    await assetRepo.updateTag(parseInt(id), updates);

    const tags = await assetRepo.getAllTags();
    const tag = tags.find((t) => t.id === parseInt(id));

    res.json({ success: true, data: tag });
  } catch (error: any) {
    console.error('Update tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tag',
      message: error.message,
    });
  }
}

export async function deleteTag(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await assetRepo.deleteTag(parseInt(id));
    res.json({ success: true, message: 'Tag deleted successfully' });
  } catch (error: any) {
    console.error('Delete tag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tag',
      message: error.message,
    });
  }
}

export async function addTagToAsset(req: Request, res: Response) {
  try {
    const { id, tagId } = req.params;

    await assetRepo.addTagToAsset(parseInt(id), parseInt(tagId));

    const asset = await assetRepo.getAsset(parseInt(id));
    res.json({ success: true, data: asset });
  } catch (error: any) {
    console.error('Add tag to asset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add tag to asset',
      message: error.message,
    });
  }
}

export async function removeTagFromAsset(req: Request, res: Response) {
  try {
    const { id, tagId } = req.params;

    await assetRepo.removeTagFromAsset(parseInt(id), parseInt(tagId));

    const asset = await assetRepo.getAsset(parseInt(id));
    res.json({ success: true, data: asset });
  } catch (error: any) {
    console.error('Remove tag from asset error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove tag from asset',
      message: error.message,
    });
  }
}
