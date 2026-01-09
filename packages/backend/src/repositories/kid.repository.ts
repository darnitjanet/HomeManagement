import { db } from '../config/database';
import { Kid, KidSticker, KidReward, CreateKidInput, CreateRewardInput, AwardStickerInput } from '../types';

export class KidRepository {
  // =====================
  // KIDS CRUD
  // =====================

  async getAllKids(): Promise<Kid[]> {
    const kids = await db('kids').orderBy('name', 'asc');

    // Get sticker count and rewards for each kid
    for (const kid of kids) {
      kid.stickerCount = await this.getStickerCount(kid.id);
      kid.rewards = await this.getRewards(kid.id);
    }

    return kids.map(this.mapKidFromDb);
  }

  async getKid(id: number): Promise<Kid | null> {
    const kid = await db('kids').where({ id }).first();
    if (!kid) return null;

    kid.stickerCount = await this.getStickerCount(id);
    kid.rewards = await this.getRewards(id);

    return this.mapKidFromDb(kid);
  }

  async createKid(input: CreateKidInput): Promise<number> {
    const [id] = await db('kids').insert({
      name: input.name,
      avatar_color: input.avatarColor || '#4ECDC4',
    });
    return id;
  }

  async updateKid(id: number, input: Partial<CreateKidInput>): Promise<void> {
    const updates: any = { updated_at: db.fn.now() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.avatarColor !== undefined) updates.avatar_color = input.avatarColor;

    await db('kids').where({ id }).update(updates);
  }

  async deleteKid(id: number): Promise<void> {
    await db('kids').where({ id }).delete();
  }

  // =====================
  // STICKERS
  // =====================

  async getStickerCount(kidId: number): Promise<number> {
    const result = await db('kid_stickers')
      .where({ kid_id: kidId })
      .count('id as count')
      .first();
    return Number(result?.count || 0);
  }

  async getStickers(kidId: number): Promise<KidSticker[]> {
    const stickers = await db('kid_stickers')
      .where({ kid_id: kidId })
      .orderBy('awarded_at', 'desc');
    return stickers.map(this.mapStickerFromDb);
  }

  async awardSticker(kidId: number, input: AwardStickerInput): Promise<number> {
    const [id] = await db('kid_stickers').insert({
      kid_id: kidId,
      reason: input.reason || null,
      awarded_by: input.awardedBy || null,
    });
    return id;
  }

  async removeSticker(stickerId: number): Promise<void> {
    await db('kid_stickers').where({ id: stickerId }).delete();
  }

  // =====================
  // REWARDS
  // =====================

  async getRewards(kidId: number): Promise<KidReward[]> {
    const rewards = await db('kid_rewards')
      .where({ kid_id: kidId })
      .orderBy('stickers_required', 'asc');
    return rewards.map(this.mapRewardFromDb);
  }

  async createReward(kidId: number, input: CreateRewardInput): Promise<number> {
    const [id] = await db('kid_rewards').insert({
      kid_id: kidId,
      name: input.name,
      stickers_required: input.stickersRequired,
    });
    return id;
  }

  async claimReward(rewardId: number): Promise<void> {
    await db('kid_rewards')
      .where({ id: rewardId })
      .update({
        is_claimed: true,
        claimed_at: db.fn.now(),
      });
  }

  async unclaimReward(rewardId: number): Promise<void> {
    await db('kid_rewards')
      .where({ id: rewardId })
      .update({
        is_claimed: false,
        claimed_at: null,
      });
  }

  async deleteReward(rewardId: number): Promise<void> {
    await db('kid_rewards').where({ id: rewardId }).delete();
  }

  // =====================
  // MAPPING FUNCTIONS
  // =====================

  private mapKidFromDb(row: any): Kid {
    return {
      id: row.id,
      name: row.name,
      avatarColor: row.avatar_color,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      stickerCount: row.stickerCount,
      rewards: row.rewards?.map((r: any) => ({
        id: r.id,
        kidId: r.kid_id || r.kidId,
        name: r.name,
        stickersRequired: r.stickers_required || r.stickersRequired,
        isClaimed: !!r.is_claimed || !!r.isClaimed,
        claimedAt: r.claimed_at || r.claimedAt,
        createdAt: r.created_at || r.createdAt,
      })),
    };
  }

  private mapStickerFromDb(row: any): KidSticker {
    return {
      id: row.id,
      kidId: row.kid_id,
      reason: row.reason,
      awardedBy: row.awarded_by,
      awardedAt: row.awarded_at,
    };
  }

  private mapRewardFromDb(row: any): KidReward {
    return {
      id: row.id,
      kidId: row.kid_id,
      name: row.name,
      stickersRequired: row.stickers_required,
      isClaimed: !!row.is_claimed,
      claimedAt: row.claimed_at,
      createdAt: row.created_at,
    };
  }
}
