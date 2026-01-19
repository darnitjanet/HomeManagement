import { db } from '../config/database';

export interface Package {
  id: number;
  name: string;
  tracking_number: string | null;
  carrier: string | null;
  carrier_url: string | null;
  status: string;
  order_date: string | null;
  expected_delivery: string | null;
  actual_delivery: string | null;
  order_number: string | null;
  vendor: string | null;
  cost: number | null;
  notes: string | null;
  notify_on_delivery: boolean;
  last_notified_at: string | null;
  is_archived: boolean;
  email_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePackageData {
  name: string;
  tracking_number?: string;
  carrier?: string;
  carrier_url?: string;
  status?: string;
  order_date?: string;
  expected_delivery?: string;
  order_number?: string;
  vendor?: string;
  cost?: number;
  notes?: string;
  notify_on_delivery?: boolean;
  email_id?: string;
}

export interface UpdatePackageData extends Partial<CreatePackageData> {
  actual_delivery?: string;
  is_archived?: boolean;
}

export interface PackageStats {
  total: number;
  active: number;
  arriving_soon: number;
  delivered_this_month: number;
  by_status: Record<string, number>;
}

// Carrier tracking URL templates
const CARRIER_URLS: Record<string, string> = {
  ups: 'https://www.ups.com/track?tracknum=',
  fedex: 'https://www.fedex.com/fedextrack/?trknbr=',
  usps: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=',
  dhl: 'https://www.dhl.com/us-en/home/tracking.html?tracking-id=',
  amazon: '', // Amazon doesn't have direct tracking links
};

export function getTrackingUrl(carrier: string | null, trackingNumber: string | null): string | null {
  if (!trackingNumber) return null;
  if (!carrier) return null;

  const carrierLower = carrier.toLowerCase();
  const baseUrl = CARRIER_URLS[carrierLower];

  if (baseUrl === undefined) return null;
  if (baseUrl === '') return null; // Amazon case

  return baseUrl + encodeURIComponent(trackingNumber);
}

function mapRow(row: any): Package {
  return {
    ...row,
    notify_on_delivery: Boolean(row.notify_on_delivery),
    is_archived: Boolean(row.is_archived),
  };
}

export async function getAllPackages(includeArchived = false): Promise<Package[]> {
  let query = db('packages').orderBy('expected_delivery', 'asc');

  if (!includeArchived) {
    query = query.where('is_archived', false);
  }

  const rows = await query;
  return rows.map(mapRow);
}

export async function getActivePackages(): Promise<Package[]> {
  const rows = await db('packages')
    .where('is_archived', false)
    .whereNot('status', 'delivered')
    .orderBy('expected_delivery', 'asc');

  return rows.map(mapRow);
}

export async function getArchivedPackages(): Promise<Package[]> {
  const rows = await db('packages')
    .where('is_archived', true)
    .orderBy('actual_delivery', 'desc');

  return rows.map(mapRow);
}

export async function getPackageById(id: number): Promise<Package | null> {
  const row = await db('packages').where('id', id).first();
  return row ? mapRow(row) : null;
}

export async function createPackage(data: CreatePackageData): Promise<Package> {
  const [id] = await db('packages').insert({
    name: data.name,
    tracking_number: data.tracking_number || null,
    carrier: data.carrier || null,
    carrier_url: data.carrier_url || null,
    status: data.status || 'ordered',
    order_date: data.order_date || null,
    expected_delivery: data.expected_delivery || null,
    order_number: data.order_number || null,
    vendor: data.vendor || null,
    cost: data.cost || null,
    notes: data.notes || null,
    notify_on_delivery: data.notify_on_delivery !== false,
    email_id: data.email_id || null,
  });

  return getPackageById(id) as Promise<Package>;
}

export async function findByEmailId(emailId: string): Promise<Package | null> {
  const row = await db('packages').where('email_id', emailId).first();
  return row ? mapRow(row) : null;
}

export async function updatePackage(id: number, data: UpdatePackageData): Promise<Package | null> {
  const updateData: any = { ...data, updated_at: db.fn.now() };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key];
    }
  });

  await db('packages').where('id', id).update(updateData);
  return getPackageById(id);
}

export async function updateStatus(id: number, status: string): Promise<Package | null> {
  const updateData: any = {
    status,
    updated_at: db.fn.now(),
  };

  // If marking as delivered, set actual delivery date
  if (status === 'delivered') {
    updateData.actual_delivery = new Date().toISOString().split('T')[0];
  }

  await db('packages').where('id', id).update(updateData);
  return getPackageById(id);
}

export async function archivePackage(id: number): Promise<Package | null> {
  await db('packages').where('id', id).update({
    is_archived: true,
    updated_at: db.fn.now(),
  });
  return getPackageById(id);
}

export async function deletePackage(id: number): Promise<boolean> {
  const deleted = await db('packages').where('id', id).delete();
  return deleted > 0;
}

export async function getPackagesArrivingSoon(days = 3): Promise<Package[]> {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);

  const todayStr = today.toISOString().split('T')[0];
  const futureStr = futureDate.toISOString().split('T')[0];

  const rows = await db('packages')
    .where('is_archived', false)
    .whereNot('status', 'delivered')
    .whereNotNull('expected_delivery')
    .whereBetween('expected_delivery', [todayStr, futureStr])
    .orderBy('expected_delivery', 'asc');

  return rows.map(mapRow);
}

export async function getPackagesForNotification(): Promise<Package[]> {
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const rows = await db('packages')
    .where('is_archived', false)
    .where('notify_on_delivery', true)
    .whereNot('status', 'delivered')
    .where(function() {
      // Packages arriving today, tomorrow, or overdue (past expected delivery)
      this.where('expected_delivery', '<=', tomorrowStr)
        .orWhereNull('expected_delivery');
    })
    .where(function() {
      this.whereNull('last_notified_at')
        .orWhere('last_notified_at', '<', todayStr);
    });

  return rows.map(mapRow);
}

export async function markNotified(id: number): Promise<void> {
  await db('packages').where('id', id).update({
    last_notified_at: db.fn.now(),
  });
}

export async function getStats(): Promise<PackageStats> {
  const today = new Date();
  const threeDaysLater = new Date();
  threeDaysLater.setDate(today.getDate() + 3);

  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const todayStr = today.toISOString().split('T')[0];
  const threeDaysStr = threeDaysLater.toISOString().split('T')[0];
  const firstOfMonthStr = firstOfMonth.toISOString().split('T')[0];

  // Total active packages
  const totalResult = await db('packages')
    .where('is_archived', false)
    .count('* as count')
    .first();

  // Active (not delivered)
  const activeResult = await db('packages')
    .where('is_archived', false)
    .whereNot('status', 'delivered')
    .count('* as count')
    .first();

  // Arriving soon (next 3 days)
  const arrivingSoonResult = await db('packages')
    .where('is_archived', false)
    .whereNot('status', 'delivered')
    .whereNotNull('expected_delivery')
    .whereBetween('expected_delivery', [todayStr, threeDaysStr])
    .count('* as count')
    .first();

  // Delivered this month
  const deliveredResult = await db('packages')
    .where('status', 'delivered')
    .where('actual_delivery', '>=', firstOfMonthStr)
    .count('* as count')
    .first();

  // By status
  const statusCounts = await db('packages')
    .where('is_archived', false)
    .select('status')
    .count('* as count')
    .groupBy('status');

  const byStatus: Record<string, number> = {};
  statusCounts.forEach((row: any) => {
    byStatus[row.status] = Number(row.count);
  });

  return {
    total: Number(totalResult?.count || 0),
    active: Number(activeResult?.count || 0),
    arriving_soon: Number(arrivingSoonResult?.count || 0),
    delivered_this_month: Number(deliveredResult?.count || 0),
    by_status: byStatus,
  };
}

export const CARRIERS = [
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'usps', label: 'USPS' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'dhl', label: 'DHL' },
  { value: 'other', label: 'Other' },
];

export const STATUSES = [
  { value: 'ordered', label: 'Ordered' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'exception', label: 'Exception' },
];
