import { Router } from 'express';
import * as assetsController from '../controllers/assets.controller';

const router = Router();

// Summary/Stats
router.get('/summary', assetsController.getSummary);

// Tags management (before :id routes)
router.get('/tags/all', assetsController.getAllTags);
router.post('/tags', assetsController.createTag);
router.put('/tags/:id', assetsController.updateTag);
router.delete('/tags/:id', assetsController.deleteTag);

// Get assets
router.get('/', assetsController.getAllAssets);
router.get('/search', assetsController.searchAssets);
router.get('/filter', assetsController.filterAssets);
router.get('/tag/:tagId', assetsController.getAssetsByTag);
router.get('/:id', assetsController.getAsset);

// Create asset
router.post('/', assetsController.createAsset);

// Update asset
router.put('/:id', assetsController.updateAsset);

// Delete asset
router.delete('/:id', assetsController.deleteAsset);

// Asset tags
router.post('/:id/tags/:tagId', assetsController.addTagToAsset);
router.delete('/:id/tags/:tagId', assetsController.removeTagFromAsset);

export default router;
