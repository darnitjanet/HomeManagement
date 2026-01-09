import { Request, Response } from 'express';
import { KidRepository } from '../repositories/kid.repository';

const kidRepo = new KidRepository();

// =====================
// KIDS CRUD
// =====================

export async function getAllKids(req: Request, res: Response) {
  try {
    const kids = await kidRepo.getAllKids();
    res.json({ success: true, data: kids });
  } catch (error: any) {
    console.error('Get kids error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve kids', message: error.message });
  }
}

export async function getKid(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const kid = await kidRepo.getKid(parseInt(id));

    if (!kid) {
      return res.status(404).json({ success: false, error: 'Kid not found' });
    }

    res.json({ success: true, data: kid });
  } catch (error: any) {
    console.error('Get kid error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve kid', message: error.message });
  }
}

export async function createKid(req: Request, res: Response) {
  try {
    const { name, avatarColor } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const id = await kidRepo.createKid({ name, avatarColor });
    const kid = await kidRepo.getKid(id);

    res.json({ success: true, data: kid });
  } catch (error: any) {
    console.error('Create kid error:', error);
    res.status(500).json({ success: false, error: 'Failed to create kid', message: error.message });
  }
}

export async function updateKid(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updates = req.body;

    await kidRepo.updateKid(parseInt(id), updates);
    const kid = await kidRepo.getKid(parseInt(id));

    res.json({ success: true, data: kid });
  } catch (error: any) {
    console.error('Update kid error:', error);
    res.status(500).json({ success: false, error: 'Failed to update kid', message: error.message });
  }
}

export async function deleteKid(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await kidRepo.deleteKid(parseInt(id));
    res.json({ success: true, message: 'Kid deleted successfully' });
  } catch (error: any) {
    console.error('Delete kid error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete kid', message: error.message });
  }
}

// =====================
// STICKERS
// =====================

export async function getStickers(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const stickers = await kidRepo.getStickers(parseInt(id));
    res.json({ success: true, data: stickers });
  } catch (error: any) {
    console.error('Get stickers error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve stickers', message: error.message });
  }
}

export async function awardSticker(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason, awardedBy } = req.body;

    await kidRepo.awardSticker(parseInt(id), { reason, awardedBy });
    const kid = await kidRepo.getKid(parseInt(id));

    res.json({ success: true, data: kid });
  } catch (error: any) {
    console.error('Award sticker error:', error);
    res.status(500).json({ success: false, error: 'Failed to award sticker', message: error.message });
  }
}

export async function removeSticker(req: Request, res: Response) {
  try {
    const { id, stickerId } = req.params;

    await kidRepo.removeSticker(parseInt(stickerId));
    const kid = await kidRepo.getKid(parseInt(id));

    res.json({ success: true, data: kid });
  } catch (error: any) {
    console.error('Remove sticker error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove sticker', message: error.message });
  }
}

// =====================
// REWARDS
// =====================

export async function getRewards(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const rewards = await kidRepo.getRewards(parseInt(id));
    res.json({ success: true, data: rewards });
  } catch (error: any) {
    console.error('Get rewards error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve rewards', message: error.message });
  }
}

export async function createReward(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, stickersRequired } = req.body;

    if (!name || !stickersRequired) {
      return res.status(400).json({ success: false, error: 'Name and stickersRequired are required' });
    }

    await kidRepo.createReward(parseInt(id), { name, stickersRequired });
    const kid = await kidRepo.getKid(parseInt(id));

    res.json({ success: true, data: kid });
  } catch (error: any) {
    console.error('Create reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to create reward', message: error.message });
  }
}

export async function claimReward(req: Request, res: Response) {
  try {
    const { id, rewardId } = req.params;

    await kidRepo.claimReward(parseInt(rewardId));
    const kid = await kidRepo.getKid(parseInt(id));

    res.json({ success: true, data: kid });
  } catch (error: any) {
    console.error('Claim reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to claim reward', message: error.message });
  }
}

export async function unclaimReward(req: Request, res: Response) {
  try {
    const { id, rewardId } = req.params;

    await kidRepo.unclaimReward(parseInt(rewardId));
    const kid = await kidRepo.getKid(parseInt(id));

    res.json({ success: true, data: kid });
  } catch (error: any) {
    console.error('Unclaim reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to unclaim reward', message: error.message });
  }
}

export async function deleteReward(req: Request, res: Response) {
  try {
    const { id, rewardId } = req.params;

    await kidRepo.deleteReward(parseInt(rewardId));
    const kid = await kidRepo.getKid(parseInt(id));

    res.json({ success: true, data: kid });
  } catch (error: any) {
    console.error('Delete reward error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete reward', message: error.message });
  }
}
