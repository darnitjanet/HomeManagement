import { db } from '../config/database';
import { Asset, AssetTag, CreateAssetInput, UpdateAssetInput } from '../types';

export class AssetRepository {
  // =====================
  // ASSET CRUD
  // =====================

  async getAllAssets(): Promise<Asset[]> {
        const assets = await db('assets').orderBy('name', 'asc');

    // Get tags for all assets
    const assetIds = assets.map((a: any) => a.id);
    const tagAssignments = await db('asset_tag_assignments')
      .whereIn('asset_id', assetIds)
      .join('asset_tags', 'asset_tag_assignments.tag_id', 'asset_tags.id')
      .select(
        'asset_tag_assignments.asset_id',
        'asset_tags.id',
        'asset_tags.name',
        'asset_tags.color',
        'asset_tags.priority'
      );

    return assets.map((asset: any) => ({
      ...this.mapAssetFromDb(asset),
      tags: tagAssignments
        .filter((t: any) => t.asset_id === asset.id)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          priority: t.priority,
        })),
    }));
  }

  async getAsset(id: number): Promise<Asset | null> {
        const asset = await db('assets').where({ id }).first();
    if (!asset) return null;

    const tags = await db('asset_tag_assignments')
      .where({ asset_id: id })
      .join('asset_tags', 'asset_tag_assignments.tag_id', 'asset_tags.id')
      .select('asset_tags.*');

    return {
      ...this.mapAssetFromDb(asset),
      tags,
    };
  }

  async searchAssets(query: string): Promise<Asset[]> {
        const assets = await db('assets')
      .where('name', 'like', `%${query}%`)
      .orWhere('description', 'like', `%${query}%`)
      .orWhere('brand', 'like', `%${query}%`)
      .orWhere('model', 'like', `%${query}%`)
      .orWhere('serial_number', 'like', `%${query}%`)
      .orderBy('name', 'asc');

    return assets.map((a: any) => this.mapAssetFromDb(a));
  }

  async filterAssets(filters: {
    category?: string;
    location?: string;
    condition?: string;
  }): Promise<Asset[]> {
        let query = db('assets');

    if (filters.category) {
      query = query.where('category', filters.category);
    }
    if (filters.location) {
      query = query.where('location', filters.location);
    }
    if (filters.condition) {
      query = query.where('condition', filters.condition);
    }

    const assets = await query.orderBy('name', 'asc');

    // Get tags
    const assetIds = assets.map((a: any) => a.id);
    const tagAssignments = await db('asset_tag_assignments')
      .whereIn('asset_id', assetIds)
      .join('asset_tags', 'asset_tag_assignments.tag_id', 'asset_tags.id')
      .select(
        'asset_tag_assignments.asset_id',
        'asset_tags.id',
        'asset_tags.name',
        'asset_tags.color',
        'asset_tags.priority'
      );

    return assets.map((asset: any) => ({
      ...this.mapAssetFromDb(asset),
      tags: tagAssignments
        .filter((t: any) => t.asset_id === asset.id)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          color: t.color,
          priority: t.priority,
        })),
    }));
  }

  async getAssetsByTag(tagId: number): Promise<Asset[]> {
        const assets = await db('assets')
      .join('asset_tag_assignments', 'assets.id', 'asset_tag_assignments.asset_id')
      .where('asset_tag_assignments.tag_id', tagId)
      .select('assets.*')
      .orderBy('name', 'asc');

    return assets.map((a: any) => this.mapAssetFromDb(a));
  }

  async createAsset(input: CreateAssetInput): Promise<number> {
        const [id] = await db('assets').insert({
      name: input.name,
      description: input.description,
      category: input.category,
      location: input.location,
      brand: input.brand,
      model: input.model,
      serial_number: input.serialNumber,
      purchase_price: input.purchasePrice,
      purchase_date: input.purchaseDate,
      current_value: input.currentValue,
      condition: input.condition,
      image_url: input.imageUrl,
      receipt_url: input.receiptUrl,
      notes: input.notes,
      warranty_expiration_date: input.warrantyExpirationDate,
      warranty_provider: input.warrantyProvider,
      warranty_type: input.warrantyType,
      warranty_document_url: input.warrantyDocumentUrl,
    });
    return id;
  }

  async updateAsset(id: number, input: UpdateAssetInput): Promise<void> {
        const updates: any = { updated_at: db.fn.now() };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.category !== undefined) updates.category = input.category;
    if (input.location !== undefined) updates.location = input.location;
    if (input.brand !== undefined) updates.brand = input.brand;
    if (input.model !== undefined) updates.model = input.model;
    if (input.serialNumber !== undefined) updates.serial_number = input.serialNumber;
    if (input.purchasePrice !== undefined) updates.purchase_price = input.purchasePrice;
    if (input.purchaseDate !== undefined) updates.purchase_date = input.purchaseDate;
    if (input.currentValue !== undefined) updates.current_value = input.currentValue;
    if (input.condition !== undefined) updates.condition = input.condition;
    if (input.imageUrl !== undefined) updates.image_url = input.imageUrl;
    if (input.receiptUrl !== undefined) updates.receipt_url = input.receiptUrl;
    if (input.notes !== undefined) updates.notes = input.notes;
    if (input.warrantyExpirationDate !== undefined) updates.warranty_expiration_date = input.warrantyExpirationDate;
    if (input.warrantyProvider !== undefined) updates.warranty_provider = input.warrantyProvider;
    if (input.warrantyType !== undefined) updates.warranty_type = input.warrantyType;
    if (input.warrantyDocumentUrl !== undefined) updates.warranty_document_url = input.warrantyDocumentUrl;

    await db('assets').where({ id }).update(updates);
  }

  async deleteAsset(id: number): Promise<void> {
        await db('assets').where({ id }).delete();
  }

  // =====================
  // SUMMARY / STATS
  // =====================

  async getTotalValue(): Promise<{ totalPurchaseValue: number; totalCurrentValue: number; assetCount: number }> {
        const result = await db('assets')
      .sum('purchase_price as totalPurchaseValue')
      .sum('current_value as totalCurrentValue')
      .count('id as assetCount')
      .first();

    return {
      totalPurchaseValue: Number(result?.totalPurchaseValue) || 0,
      totalCurrentValue: Number(result?.totalCurrentValue) || 0,
      assetCount: Number(result?.assetCount) || 0,
    };
  }

  async getValueByCategory(): Promise<Array<{ category: string; totalValue: number; count: number }>> {
        const results = await db('assets')
      .select('category')
      .sum('current_value as totalValue')
      .count('id as count')
      .groupBy('category')
      .orderBy('totalValue', 'desc');

    return results.map((r: any) => ({
      category: r.category || 'Uncategorized',
      totalValue: Number(r.totalValue) || 0,
      count: Number(r.count) || 0,
    }));
  }

  async getValueByLocation(): Promise<Array<{ location: string; totalValue: number; count: number }>> {
        const results = await db('assets')
      .select('location')
      .sum('current_value as totalValue')
      .count('id as count')
      .groupBy('location')
      .orderBy('totalValue', 'desc');

    return results.map((r: any) => ({
      location: r.location || 'Unspecified',
      totalValue: Number(r.totalValue) || 0,
      count: Number(r.count) || 0,
    }));
  }

  // =====================
  // TAG MANAGEMENT
  // =====================

  async getAllTags(): Promise<AssetTag[]> {
        return db('asset_tags').orderBy('priority', 'desc').orderBy('name', 'asc');
  }

  async createTag(name: string, color: string, priority: number): Promise<number> {
        const [id] = await db('asset_tags').insert({ name, color, priority });
    return id;
  }

  async updateTag(id: number, updates: Partial<AssetTag>): Promise<void> {
        await db('asset_tags').where({ id }).update(updates);
  }

  async deleteTag(id: number): Promise<void> {
        await db('asset_tags').where({ id }).delete();
  }

  async addTagToAsset(assetId: number, tagId: number): Promise<void> {
        await db('asset_tag_assignments')
      .insert({ asset_id: assetId, tag_id: tagId })
      .onConflict(['asset_id', 'tag_id'])
      .ignore();
  }

  async removeTagFromAsset(assetId: number, tagId: number): Promise<void> {
        await db('asset_tag_assignments')
      .where({ asset_id: assetId, tag_id: tagId })
      .delete();
  }

  // =====================
  // HELPERS
  // =====================

  private mapAssetFromDb(row: any): Asset {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      location: row.location,
      brand: row.brand,
      model: row.model,
      serialNumber: row.serial_number,
      purchasePrice: row.purchase_price ? Number(row.purchase_price) : undefined,
      purchaseDate: row.purchase_date,
      currentValue: row.current_value ? Number(row.current_value) : undefined,
      condition: row.condition,
      imageUrl: row.image_url,
      receiptUrl: row.receipt_url,
      notes: row.notes,
      warrantyExpirationDate: row.warranty_expiration_date,
      warrantyProvider: row.warranty_provider,
      warrantyType: row.warranty_type,
      warrantyDocumentUrl: row.warranty_document_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // =====================
  // WARRANTY QUERIES
  // =====================

  async getAssetsWithExpiringWarranties(daysAhead: number): Promise<Asset[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const assets = await db('assets')
      .whereNotNull('warranty_expiration_date')
      .where('warranty_expiration_date', '>=', todayStr)
      .where('warranty_expiration_date', '<=', futureDateStr)
      .orderBy('warranty_expiration_date', 'asc');

    return assets.map((a: any) => this.mapAssetFromDb(a));
  }
}
