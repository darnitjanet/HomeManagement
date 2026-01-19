import { db } from '../config/database';

// Emergency Contacts
export interface EmergencyContact {
  id: number;
  name: string;
  relationship: string | null;
  phone: string | null;
  phone_secondary: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  birthday: string | null; // Format: MM-DD
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmergencyContactData {
  name: string;
  relationship?: string;
  phone?: string;
  phone_secondary?: string;
  email?: string;
  address?: string;
  notes?: string;
  birthday?: string; // Format: MM-DD
  priority?: number;
}

// Emergency Info
export interface EmergencyInfo {
  id: number;
  category: string;
  label: string;
  value: string;
  notes: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmergencyInfoData {
  category: string;
  label: string;
  value: string;
  notes?: string;
  priority?: number;
}

// Family Rules
export interface FamilyRule {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFamilyRuleData {
  title: string;
  description?: string;
  category?: string;
  priority?: number;
}

// =====================
// EMERGENCY CONTACTS
// =====================

export async function getAllEmergencyContacts(): Promise<EmergencyContact[]> {
  return db('emergency_contacts')
    .where({ is_active: true })
    .orderBy('priority', 'asc')
    .orderBy('name', 'asc');
}

export async function getEmergencyContactById(id: number): Promise<EmergencyContact | null> {
  const contact = await db('emergency_contacts').where({ id }).first();
  return contact || null;
}

export async function createEmergencyContact(data: CreateEmergencyContactData): Promise<EmergencyContact> {
  const [id] = await db('emergency_contacts').insert({
    name: data.name,
    relationship: data.relationship || null,
    phone: data.phone || null,
    phone_secondary: data.phone_secondary || null,
    email: data.email || null,
    address: data.address || null,
    notes: data.notes || null,
    birthday: data.birthday || null,
    priority: data.priority || 0,
    is_active: true,
  });

  return getEmergencyContactById(id) as Promise<EmergencyContact>;
}

export async function updateEmergencyContact(
  id: number,
  data: Partial<CreateEmergencyContactData & { is_active?: boolean }>
): Promise<EmergencyContact | null> {
  await db('emergency_contacts')
    .where({ id })
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    });
  return getEmergencyContactById(id);
}

export async function deleteEmergencyContact(id: number): Promise<boolean> {
  const deleted = await db('emergency_contacts').where({ id }).delete();
  return deleted > 0;
}

export async function getContactsWithUpcomingBirthdays(daysAhead: number = 7): Promise<EmergencyContact[]> {
  const contacts = await db('emergency_contacts')
    .whereNotNull('birthday')
    .where({ is_active: true });

  const today = new Date();
  const upcoming: EmergencyContact[] = [];

  for (const contact of contacts) {
    if (!contact.birthday) continue;

    const [month, day] = contact.birthday.split('-').map(Number);
    const thisYear = today.getFullYear();

    // Create date for this year's birthday
    let birthdayDate = new Date(thisYear, month - 1, day);

    // If birthday already passed this year, check next year
    if (birthdayDate < today) {
      birthdayDate = new Date(thisYear + 1, month - 1, day);
    }

    const daysUntil = Math.ceil((birthdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil >= 0 && daysUntil <= daysAhead) {
      upcoming.push({ ...contact, daysUntil } as any);
    }
  }

  // Sort by days until birthday
  return upcoming.sort((a: any, b: any) => a.daysUntil - b.daysUntil);
}

// =====================
// EMERGENCY INFO
// =====================

export async function getAllEmergencyInfo(): Promise<EmergencyInfo[]> {
  return db('emergency_info')
    .where({ is_active: true })
    .orderBy('category', 'asc')
    .orderBy('priority', 'asc');
}

export async function getEmergencyInfoByCategory(category: string): Promise<EmergencyInfo[]> {
  return db('emergency_info')
    .where({ category, is_active: true })
    .orderBy('priority', 'asc');
}

export async function getEmergencyInfoById(id: number): Promise<EmergencyInfo | null> {
  const info = await db('emergency_info').where({ id }).first();
  return info || null;
}

export async function createEmergencyInfo(data: CreateEmergencyInfoData): Promise<EmergencyInfo> {
  const [id] = await db('emergency_info').insert({
    category: data.category,
    label: data.label,
    value: data.value,
    notes: data.notes || null,
    priority: data.priority || 0,
    is_active: true,
  });

  return getEmergencyInfoById(id) as Promise<EmergencyInfo>;
}

export async function updateEmergencyInfo(
  id: number,
  data: Partial<CreateEmergencyInfoData & { is_active?: boolean }>
): Promise<EmergencyInfo | null> {
  await db('emergency_info')
    .where({ id })
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    });
  return getEmergencyInfoById(id);
}

export async function deleteEmergencyInfo(id: number): Promise<boolean> {
  const deleted = await db('emergency_info').where({ id }).delete();
  return deleted > 0;
}

// =====================
// FAMILY RULES
// =====================

export async function getAllFamilyRules(): Promise<FamilyRule[]> {
  return db('family_rules')
    .where({ is_active: true })
    .orderBy('priority', 'asc')
    .orderBy('title', 'asc');
}

export async function getFamilyRulesByCategory(category: string): Promise<FamilyRule[]> {
  return db('family_rules')
    .where({ category, is_active: true })
    .orderBy('priority', 'asc');
}

export async function getFamilyRuleById(id: number): Promise<FamilyRule | null> {
  const rule = await db('family_rules').where({ id }).first();
  return rule || null;
}

export async function createFamilyRule(data: CreateFamilyRuleData): Promise<FamilyRule> {
  const [id] = await db('family_rules').insert({
    title: data.title,
    description: data.description || null,
    category: data.category || null,
    priority: data.priority || 0,
    is_active: true,
  });

  return getFamilyRuleById(id) as Promise<FamilyRule>;
}

export async function updateFamilyRule(
  id: number,
  data: Partial<CreateFamilyRuleData & { is_active?: boolean }>
): Promise<FamilyRule | null> {
  await db('family_rules')
    .where({ id })
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    });
  return getFamilyRuleById(id);
}

export async function deleteFamilyRule(id: number): Promise<boolean> {
  const deleted = await db('family_rules').where({ id }).delete();
  return deleted > 0;
}

export async function reorderFamilyRules(orderedIds: number[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db('family_rules')
      .where({ id: orderedIds[i] })
      .update({ priority: i, updated_at: new Date().toISOString() });
  }
}
