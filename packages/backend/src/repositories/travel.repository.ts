import { db } from '../config/database';

export interface TravelPlace {
  id: number;
  name: string;
  country: string | null;
  countryCode: string | null;
  state: string | null;
  stateCode: string | null;
  latitude: number;
  longitude: number;
  visitDate: string | null;
  visitEndDate: string | null;
  tripId: number | null;
  tripName: string | null;
  notes: string | null;
  highlights: string | null;
  rating: number | null;
  companions: string | null;
  expenses: string | null;
  photoUrls: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TravelTrip {
  id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlaceInput {
  name: string;
  country?: string;
  countryCode?: string;
  state?: string;
  stateCode?: string;
  latitude: number;
  longitude: number;
  visitDate?: string;
  visitEndDate?: string;
  tripId?: number;
  tripName?: string;
  notes?: string;
  highlights?: string;
  rating?: number;
  companions?: string;
  expenses?: string;
  photoUrls?: string;
}

export interface UpdatePlaceInput {
  name?: string;
  country?: string;
  countryCode?: string;
  state?: string;
  stateCode?: string;
  latitude?: number;
  longitude?: number;
  visitDate?: string;
  visitEndDate?: string;
  tripId?: number | null;
  tripName?: string;
  notes?: string;
  highlights?: string;
  rating?: number;
  companions?: string;
  expenses?: string;
  photoUrls?: string;
}

export interface CreateTripInput {
  name: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface UpdateTripInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export interface TravelStats {
  totalPlaces: number;
  countriesVisited: number;
  usStatesVisited: number;
  totalTrips: number;
}

export interface PackingItem {
  id: number;
  tripId: number;
  name: string;
  category: string | null;
  quantity: number;
  packed: boolean;
  sortOrder: number;
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePackingItemInput {
  tripId: number;
  name: string;
  category?: string;
  quantity?: number;
  packed?: boolean;
  sortOrder?: number;
  assignee?: string;
}

export interface UpdatePackingItemInput {
  name?: string;
  category?: string;
  quantity?: number;
  packed?: boolean;
  sortOrder?: number;
  assignee?: string;
}

function mapPlaceFromDb(row: any): TravelPlace {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    countryCode: row.country_code,
    state: row.state,
    stateCode: row.state_code,
    latitude: row.latitude,
    longitude: row.longitude,
    visitDate: row.visit_date,
    visitEndDate: row.visit_end_date,
    tripId: row.trip_id,
    tripName: row.trip_name,
    notes: row.notes,
    highlights: row.highlights,
    rating: row.rating,
    companions: row.companions,
    expenses: row.expenses,
    photoUrls: row.photo_urls,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTripFromDb(row: any): TravelTrip {
  return {
    id: row.id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPackingItemFromDb(row: any): PackingItem {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    category: row.category,
    quantity: row.quantity,
    packed: Boolean(row.packed),
    sortOrder: row.sort_order,
    assignee: row.assignee,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Places

export async function getAllPlaces(): Promise<TravelPlace[]> {
  const rows = await db('travel_places').orderBy('visit_date', 'desc');
  return rows.map(mapPlaceFromDb);
}

export async function getPlace(id: number): Promise<TravelPlace | null> {
  const row = await db('travel_places').where({ id }).first();
  return row ? mapPlaceFromDb(row) : null;
}

export async function createPlace(data: CreatePlaceInput): Promise<number> {
  const [id] = await db('travel_places').insert({
    name: data.name,
    country: data.country || null,
    country_code: data.countryCode || null,
    state: data.state || null,
    state_code: data.stateCode || null,
    latitude: data.latitude,
    longitude: data.longitude,
    visit_date: data.visitDate || null,
    visit_end_date: data.visitEndDate || null,
    trip_id: data.tripId || null,
    trip_name: data.tripName || null,
    notes: data.notes || null,
    highlights: data.highlights || null,
    rating: data.rating || null,
    companions: data.companions || null,
    expenses: data.expenses || null,
    photo_urls: data.photoUrls || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return id;
}

export async function updatePlace(id: number, data: UpdatePlaceInput): Promise<void> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.country !== undefined) updateData.country = data.country;
  if (data.countryCode !== undefined) updateData.country_code = data.countryCode;
  if (data.state !== undefined) updateData.state = data.state;
  if (data.stateCode !== undefined) updateData.state_code = data.stateCode;
  if (data.latitude !== undefined) updateData.latitude = data.latitude;
  if (data.longitude !== undefined) updateData.longitude = data.longitude;
  if (data.visitDate !== undefined) updateData.visit_date = data.visitDate;
  if (data.visitEndDate !== undefined) updateData.visit_end_date = data.visitEndDate;
  if (data.tripId !== undefined) updateData.trip_id = data.tripId;
  if (data.tripName !== undefined) updateData.trip_name = data.tripName;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.highlights !== undefined) updateData.highlights = data.highlights;
  if (data.rating !== undefined) updateData.rating = data.rating;
  if (data.companions !== undefined) updateData.companions = data.companions;
  if (data.expenses !== undefined) updateData.expenses = data.expenses;
  if (data.photoUrls !== undefined) updateData.photo_urls = data.photoUrls;

  await db('travel_places').where({ id }).update(updateData);
}

export async function deletePlace(id: number): Promise<void> {
  await db('travel_places').where({ id }).delete();
}

export async function searchPlaces(query: string): Promise<TravelPlace[]> {
  const rows = await db('travel_places')
    .where('name', 'like', `%${query}%`)
    .orWhere('country', 'like', `%${query}%`)
    .orWhere('state', 'like', `%${query}%`)
    .orWhere('notes', 'like', `%${query}%`)
    .orderBy('visit_date', 'desc');
  return rows.map(mapPlaceFromDb);
}

export async function getPlacesByTrip(tripId: number): Promise<TravelPlace[]> {
  const rows = await db('travel_places')
    .where({ trip_id: tripId })
    .orderBy('visit_date', 'asc');
  return rows.map(mapPlaceFromDb);
}

export async function getPlacesByCountry(countryCode: string): Promise<TravelPlace[]> {
  const rows = await db('travel_places')
    .where({ country_code: countryCode })
    .orderBy('visit_date', 'desc');
  return rows.map(mapPlaceFromDb);
}

// Trips

export async function getAllTrips(): Promise<TravelTrip[]> {
  const rows = await db('travel_trips').orderBy('start_date', 'desc');
  return rows.map(mapTripFromDb);
}

export async function getTrip(id: number): Promise<TravelTrip | null> {
  const row = await db('travel_trips').where({ id }).first();
  return row ? mapTripFromDb(row) : null;
}

export async function createTrip(data: CreateTripInput): Promise<number> {
  const [id] = await db('travel_trips').insert({
    name: data.name,
    start_date: data.startDate || null,
    end_date: data.endDate || null,
    description: data.description || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return id;
}

export async function updateTrip(id: number, data: UpdateTripInput): Promise<void> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.startDate !== undefined) updateData.start_date = data.startDate;
  if (data.endDate !== undefined) updateData.end_date = data.endDate;
  if (data.description !== undefined) updateData.description = data.description;

  await db('travel_trips').where({ id }).update(updateData);
}

export async function deleteTrip(id: number): Promise<void> {
  // Places linked to this trip will have trip_id set to NULL due to ON DELETE SET NULL
  await db('travel_trips').where({ id }).delete();
}

// Stats

export async function getStats(): Promise<TravelStats> {
  const totalPlaces = await db('travel_places').count('id as count').first();
  const totalTrips = await db('travel_trips').count('id as count').first();

  const countries = await db('travel_places')
    .distinct('country_code')
    .whereNotNull('country_code');

  const usStates = await db('travel_places')
    .distinct('state_code')
    .where('country_code', 'US')
    .whereNotNull('state_code');

  return {
    totalPlaces: Number(totalPlaces?.count || 0),
    countriesVisited: countries.length,
    usStatesVisited: usStates.length,
    totalTrips: Number(totalTrips?.count || 0),
  };
}

// Packing Items

export async function getPackingItemsByTrip(tripId: number, assignee?: string): Promise<PackingItem[]> {
  let query = db('packing_items').where({ trip_id: tripId });
  if (assignee) {
    query = query.where({ assignee });
  }
  const rows = await query.orderBy(['category', 'sort_order', 'name']);
  return rows.map(mapPackingItemFromDb);
}

export async function getPackingItem(id: number): Promise<PackingItem | null> {
  const row = await db('packing_items').where({ id }).first();
  return row ? mapPackingItemFromDb(row) : null;
}

export async function createPackingItem(data: CreatePackingItemInput): Promise<number> {
  const [id] = await db('packing_items').insert({
    trip_id: data.tripId,
    name: data.name,
    category: data.category || null,
    quantity: data.quantity || 1,
    packed: data.packed || false,
    sort_order: data.sortOrder || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  return id;
}

export async function createPackingItems(items: CreatePackingItemInput[]): Promise<number[]> {
  const now = new Date().toISOString();
  const insertData = items.map(item => ({
    trip_id: item.tripId,
    name: item.name,
    category: item.category || null,
    quantity: item.quantity || 1,
    packed: item.packed || false,
    sort_order: item.sortOrder || 0,
    created_at: now,
    updated_at: now,
  }));

  const ids = await db('packing_items').insert(insertData);
  return Array.isArray(ids) ? ids : [ids];
}

export async function updatePackingItem(id: number, data: UpdatePackingItemInput): Promise<void> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.packed !== undefined) updateData.packed = data.packed;
  if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

  await db('packing_items').where({ id }).update(updateData);
}

export async function togglePackingItem(id: number): Promise<boolean> {
  const item = await db('packing_items').where({ id }).first();
  if (!item) return false;

  const newPacked = !item.packed;
  await db('packing_items').where({ id }).update({
    packed: newPacked,
    updated_at: new Date().toISOString(),
  });
  return newPacked;
}

export async function deletePackingItem(id: number): Promise<void> {
  await db('packing_items').where({ id }).delete();
}

export async function deletePackingItemsByTrip(tripId: number): Promise<void> {
  await db('packing_items').where({ trip_id: tripId }).delete();
}

export async function getPackingProgress(tripId: number): Promise<{ total: number; packed: number }> {
  const total = await db('packing_items').where({ trip_id: tripId }).count('id as count').first();
  const packed = await db('packing_items').where({ trip_id: tripId, packed: true }).count('id as count').first();

  return {
    total: Number(total?.count || 0),
    packed: Number(packed?.count || 0),
  };
}
