import { db } from '../config/database';

export interface Plant {
  id: number;
  name: string;
  species: string | null;
  location: string | null;
  watering_frequency_days: number;
  last_watered: string | null;
  next_water_date: string | null;
  sunlight_needs: string | null;
  image_url: string | null;
  notes: string | null;
  care_instructions: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WateringLog {
  id: number;
  plant_id: number;
  watered_date: string;
  notes: string | null;
  created_at: string;
}

export interface CreatePlantData {
  name: string;
  species?: string;
  location?: string;
  watering_frequency_days?: number;
  last_watered?: string;
  sunlight_needs?: string;
  image_url?: string;
  notes?: string;
  care_instructions?: string;
}

export interface UpdatePlantData {
  name?: string;
  species?: string | null;
  location?: string | null;
  watering_frequency_days?: number;
  last_watered?: string | null;
  next_water_date?: string | null;
  sunlight_needs?: string | null;
  image_url?: string | null;
  notes?: string | null;
  care_instructions?: string | null;
  is_active?: boolean;
}

// Calculate next water date based on last watered and frequency
function calculateNextWaterDate(lastWatered: string | null, frequencyDays: number): string {
  const baseDate = lastWatered ? new Date(lastWatered) : new Date();
  const nextDate = new Date(baseDate);
  nextDate.setDate(nextDate.getDate() + frequencyDays);
  return nextDate.toISOString().split('T')[0];
}

// Get all plants
export async function getAllPlants(includeInactive = false): Promise<Plant[]> {
  let query = db('plants').orderBy('next_water_date', 'asc');
  if (!includeInactive) {
    query = query.where('is_active', true);
  }
  return query;
}

// Get plant by ID
export async function getPlantById(id: number): Promise<Plant | null> {
  const plant = await db('plants').where({ id }).first();
  return plant || null;
}

// Get plants that need watering (next_water_date <= today)
export async function getPlantsNeedingWater(): Promise<Plant[]> {
  const today = new Date().toISOString().split('T')[0];
  return db('plants')
    .where('is_active', true)
    .where('next_water_date', '<=', today)
    .orderBy('next_water_date', 'asc');
}

// Get plants needing water within X days
export async function getPlantsNeedingWaterSoon(days: number): Promise<Plant[]> {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);

  return db('plants')
    .where('is_active', true)
    .where('next_water_date', '<=', futureDate.toISOString().split('T')[0])
    .orderBy('next_water_date', 'asc');
}

// Create a new plant
export async function createPlant(data: CreatePlantData): Promise<Plant> {
  const frequencyDays = data.watering_frequency_days || 7;
  const lastWatered = data.last_watered || null;
  const nextWaterDate = calculateNextWaterDate(lastWatered, frequencyDays);

  const [id] = await db('plants').insert({
    name: data.name,
    species: data.species || null,
    location: data.location || null,
    watering_frequency_days: frequencyDays,
    last_watered: lastWatered,
    next_water_date: nextWaterDate,
    sunlight_needs: data.sunlight_needs || null,
    image_url: data.image_url || null,
    notes: data.notes || null,
    care_instructions: data.care_instructions || null,
    is_active: true,
  });

  return getPlantById(id) as Promise<Plant>;
}

// Update a plant
export async function updatePlant(id: number, data: UpdatePlantData): Promise<Plant | null> {
  const updateData: any = { ...data, updated_at: new Date().toISOString() };

  // Recalculate next water date if frequency or last_watered changed
  if (data.watering_frequency_days !== undefined || data.last_watered !== undefined) {
    const plant = await getPlantById(id);
    if (plant) {
      const frequency = data.watering_frequency_days ?? plant.watering_frequency_days;
      const lastWatered = data.last_watered !== undefined ? data.last_watered : plant.last_watered;
      updateData.next_water_date = calculateNextWaterDate(lastWatered, frequency);
    }
  }

  await db('plants').where({ id }).update(updateData);
  return getPlantById(id);
}

// Delete a plant
export async function deletePlant(id: number): Promise<boolean> {
  const deleted = await db('plants').where({ id }).delete();
  return deleted > 0;
}

// Mark plant as watered
export async function waterPlant(id: number, notes?: string): Promise<Plant | null> {
  const plant = await getPlantById(id);
  if (!plant) return null;

  const today = new Date().toISOString().split('T')[0];
  const nextWaterDate = calculateNextWaterDate(today, plant.watering_frequency_days);

  // Update plant
  await db('plants').where({ id }).update({
    last_watered: today,
    next_water_date: nextWaterDate,
    updated_at: new Date().toISOString(),
  });

  // Add to watering log
  await db('plant_watering_log').insert({
    plant_id: id,
    watered_date: today,
    notes: notes || null,
  });

  return getPlantById(id);
}

// Get watering history for a plant
export async function getWateringHistory(plantId: number, limit = 20): Promise<WateringLog[]> {
  return db('plant_watering_log')
    .where({ plant_id: plantId })
    .orderBy('watered_date', 'desc')
    .limit(limit);
}

// Get all watering logs (for statistics)
export async function getAllWateringLogs(days = 30): Promise<WateringLog[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return db('plant_watering_log')
    .where('watered_date', '>=', startDate.toISOString().split('T')[0])
    .orderBy('watered_date', 'desc');
}

// Get plant statistics
export async function getPlantStats(): Promise<{
  totalPlants: number;
  needsWaterToday: number;
  needsWaterSoon: number;
  wateredThisWeek: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const [totalPlants] = await db('plants').where('is_active', true).count('id as count');
  const [needsWaterToday] = await db('plants')
    .where('is_active', true)
    .where('next_water_date', '<=', today)
    .count('id as count');
  const [needsWaterSoon] = await db('plants')
    .where('is_active', true)
    .where('next_water_date', '<=', threeDaysFromNow.toISOString().split('T')[0])
    .where('next_water_date', '>', today)
    .count('id as count');
  const [wateredThisWeek] = await db('plant_watering_log')
    .where('watered_date', '>=', weekAgo.toISOString().split('T')[0])
    .countDistinct('plant_id as count');

  return {
    totalPlants: Number(totalPlants.count),
    needsWaterToday: Number(needsWaterToday.count),
    needsWaterSoon: Number(needsWaterSoon.count),
    wateredThisWeek: Number(wateredThisWeek.count),
  };
}

// Common plant care suggestions
export const PLANT_CARE_SUGGESTIONS: Record<string, { frequency: number; sunlight: string; care: string }> = {
  'Pothos': { frequency: 7, sunlight: 'Low to Bright Indirect', care: 'Let soil dry between waterings. Very forgiving!' },
  'Snake Plant': { frequency: 14, sunlight: 'Low to Bright Indirect', care: 'Drought tolerant. Water sparingly.' },
  'Monstera': { frequency: 7, sunlight: 'Bright Indirect', care: 'Keep soil slightly moist. Loves humidity.' },
  'Peace Lily': { frequency: 7, sunlight: 'Low to Medium', care: 'Keep soil moist. Will droop when thirsty.' },
  'Spider Plant': { frequency: 7, sunlight: 'Bright Indirect', care: 'Let soil dry slightly between waterings.' },
  'Fiddle Leaf Fig': { frequency: 10, sunlight: 'Bright Indirect', care: 'Consistent watering. Sensitive to changes.' },
  'Rubber Plant': { frequency: 10, sunlight: 'Bright Indirect', care: 'Let top inch of soil dry between waterings.' },
  'ZZ Plant': { frequency: 14, sunlight: 'Low to Bright Indirect', care: 'Very drought tolerant. Easy care!' },
  'Aloe Vera': { frequency: 14, sunlight: 'Bright Direct', care: 'Let soil dry completely between waterings.' },
  'Succulent': { frequency: 14, sunlight: 'Bright Direct', care: 'Drought tolerant. Water sparingly.' },
  'Cactus': { frequency: 21, sunlight: 'Bright Direct', care: 'Very little water needed. Full sun.' },
  'Fern': { frequency: 5, sunlight: 'Medium Indirect', care: 'Keep soil consistently moist. Loves humidity.' },
  'Orchid': { frequency: 7, sunlight: 'Bright Indirect', care: 'Water when roots turn silvery. Good drainage.' },
  'Philodendron': { frequency: 7, sunlight: 'Medium to Bright Indirect', care: 'Let top inch dry between waterings.' },
  'Chinese Evergreen': { frequency: 10, sunlight: 'Low to Medium', care: 'Let soil dry slightly. Tolerates low light.' },
  'Dracaena': { frequency: 10, sunlight: 'Low to Bright Indirect', care: 'Let soil dry between waterings.' },
  'Jade Plant': { frequency: 14, sunlight: 'Bright Direct', care: 'Let soil dry completely. Succulent care.' },
  'Boston Fern': { frequency: 5, sunlight: 'Bright Indirect', care: 'Keep soil moist. Mist frequently.' },
  'Calathea': { frequency: 7, sunlight: 'Medium Indirect', care: 'Keep soil moist. Use filtered water.' },
  'Bird of Paradise': { frequency: 7, sunlight: 'Bright Direct', care: 'Keep soil moist in summer, drier in winter.' },
  'Dragon Tree': { frequency: 10, sunlight: 'Medium to Bright Indirect', care: 'Let soil dry between waterings. Tolerates low light.' },
};

export function getPlantCareSuggestion(species: string): { frequency: number; sunlight: string; care: string } | null {
  // Try exact match first
  if (PLANT_CARE_SUGGESTIONS[species]) {
    return PLANT_CARE_SUGGESTIONS[species];
  }

  // Try partial match
  const lowerSpecies = species.toLowerCase();
  for (const [name, suggestion] of Object.entries(PLANT_CARE_SUGGESTIONS)) {
    if (name.toLowerCase().includes(lowerSpecies) || lowerSpecies.includes(name.toLowerCase())) {
      return suggestion;
    }
  }

  return null;
}
