import { Router } from 'express';
import * as kidsController from '../controllers/kids.controller';

const router = Router();

// Kids CRUD
router.get('/', kidsController.getAllKids);
router.post('/', kidsController.createKid);
router.get('/:id', kidsController.getKid);
router.put('/:id', kidsController.updateKid);
router.delete('/:id', kidsController.deleteKid);

// Stickers
router.get('/:id/stickers', kidsController.getStickers);
router.post('/:id/stickers', kidsController.awardSticker);
router.delete('/:id/stickers/:stickerId', kidsController.removeSticker);

// Rewards
router.get('/:id/rewards', kidsController.getRewards);
router.post('/:id/rewards', kidsController.createReward);
router.put('/:id/rewards/:rewardId/claim', kidsController.claimReward);
router.put('/:id/rewards/:rewardId/unclaim', kidsController.unclaimReward);
router.delete('/:id/rewards/:rewardId', kidsController.deleteReward);

export default router;
