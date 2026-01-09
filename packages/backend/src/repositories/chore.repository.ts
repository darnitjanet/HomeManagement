import { db } from '../config/database';
import {
  ChoreDefinition,
  ChoreInstance,
  CreateChoreDefinitionInput,
  UpdateChoreDefinitionInput,
  RecurrencePattern,
  Kid,
} from '../types';
import { KidRepository } from './kid.repository';

export class ChoreRepository {
  private kidRepo = new KidRepository();

  // =====================
  // CHORE DEFINITIONS
  // =====================

  async getAllDefinitions(): Promise<ChoreDefinition[]> {
    const definitions = await db('chore_definitions')
      .where({ is_active: true })
      .orderBy('name', 'asc');

    const result: ChoreDefinition[] = [];
    for (const def of definitions) {
      const mapped = await this.mapDefinitionFromDb(def);
      result.push(mapped);
    }
    return result;
  }

  async getDefinition(id: number): Promise<ChoreDefinition | null> {
    const definition = await db('chore_definitions').where({ id }).first();
    if (!definition) return null;
    return this.mapDefinitionFromDb(definition);
  }

  async createDefinition(input: CreateChoreDefinitionInput): Promise<ChoreDefinition> {
    const [id] = await db('chore_definitions').insert({
      name: input.name,
      description: input.description || null,
      icon: input.icon || null,
      category: input.category || null,
      estimated_minutes: input.estimatedMinutes || null,
      is_recurring: input.isRecurring !== false,
      recurrence_pattern: input.recurrencePattern ? JSON.stringify(input.recurrencePattern) : null,
      is_rotating: input.isRotating || false,
      rotation_kid_ids: input.rotationKidIds ? JSON.stringify(input.rotationKidIds) : null,
      current_rotation_index: 0,
      default_kid_id: input.defaultKidId || null,
      is_active: true,
    });

    // Create initial instance
    const definition = await this.getDefinition(id);
    if (definition) {
      await this.createInitialInstance(definition);
    }

    return definition!;
  }

  async updateDefinition(id: number, input: UpdateChoreDefinitionInput): Promise<ChoreDefinition | null> {
    const updates: any = { updated_at: db.fn.now() };

    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.icon !== undefined) updates.icon = input.icon;
    if (input.category !== undefined) updates.category = input.category;
    if (input.estimatedMinutes !== undefined) updates.estimated_minutes = input.estimatedMinutes;
    if (input.isRecurring !== undefined) updates.is_recurring = input.isRecurring;
    if (input.recurrencePattern !== undefined) {
      updates.recurrence_pattern = input.recurrencePattern ? JSON.stringify(input.recurrencePattern) : null;
    }
    if (input.isRotating !== undefined) updates.is_rotating = input.isRotating;
    if (input.rotationKidIds !== undefined) {
      updates.rotation_kid_ids = input.rotationKidIds ? JSON.stringify(input.rotationKidIds) : null;
    }
    if (input.defaultKidId !== undefined) updates.default_kid_id = input.defaultKidId;
    if (input.isActive !== undefined) updates.is_active = input.isActive;

    await db('chore_definitions').where({ id }).update(updates);
    return this.getDefinition(id);
  }

  async deleteDefinition(id: number): Promise<void> {
    await db('chore_definitions').where({ id }).delete();
  }

  // =====================
  // CHORE INSTANCES
  // =====================

  async getInstance(id: number): Promise<ChoreInstance | null> {
    const instance = await db('chore_instances').where({ id }).first();
    if (!instance) return null;
    return this.mapInstanceFromDb(instance);
  }

  async getTodaysChores(): Promise<ChoreInstance[]> {
    const today = new Date().toISOString().split('T')[0];
    const instances = await db('chore_instances')
      .where('due_date', '<=', today)
      .whereNull('completed_at')
      .orderBy('due_date', 'asc');

    const result: ChoreInstance[] = [];
    for (const inst of instances) {
      result.push(await this.mapInstanceFromDb(inst));
    }
    return result;
  }

  async getUpcomingChores(days: number = 7): Promise<ChoreInstance[]> {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    const instances = await db('chore_instances')
      .where('due_date', '>=', today.toISOString().split('T')[0])
      .where('due_date', '<=', futureDate.toISOString().split('T')[0])
      .whereNull('completed_at')
      .orderBy('due_date', 'asc');

    const result: ChoreInstance[] = [];
    for (const inst of instances) {
      result.push(await this.mapInstanceFromDb(inst));
    }
    return result;
  }

  async getChoresByKid(kidId: number, includeCompleted: boolean = false): Promise<ChoreInstance[]> {
    let query = db('chore_instances')
      .where({ assigned_kid_id: kidId })
      .orderBy('due_date', 'asc');

    if (!includeCompleted) {
      query = query.whereNull('completed_at');
    }

    const instances = await query;
    const result: ChoreInstance[] = [];
    for (const inst of instances) {
      result.push(await this.mapInstanceFromDb(inst));
    }
    return result;
  }

  async createInstance(
    definitionId: number,
    kidId: number,
    dueDate: string,
    dueTime?: string
  ): Promise<number> {
    const [id] = await db('chore_instances').insert({
      chore_definition_id: definitionId,
      assigned_kid_id: kidId,
      due_date: dueDate,
      due_time: dueTime || null,
    });
    return id;
  }

  // =====================
  // COMPLETION & STICKER AWARD
  // =====================

  async completeChore(instanceId: number): Promise<ChoreInstance> {
    const instance = await this.getInstance(instanceId);
    if (!instance) {
      throw new Error('Chore instance not found');
    }
    if (instance.completedAt) {
      throw new Error('Chore already completed');
    }

    const definition = await this.getDefinition(instance.choreDefinitionId);
    if (!definition) {
      throw new Error('Chore definition not found');
    }

    // Award sticker to the assigned kid
    const stickerId = await this.kidRepo.awardSticker(instance.assignedKidId, {
      reason: `Completed chore: ${definition.name}`,
      awardedBy: 'chores-system',
    });

    // Update instance as completed
    await db('chore_instances')
      .where({ id: instanceId })
      .update({
        completed_at: db.fn.now(),
        sticker_id: stickerId,
        updated_at: db.fn.now(),
      });

    // Create next instance if recurring
    if (definition.isRecurring) {
      await this.createNextRecurrence(instance, definition);
    }

    return (await this.getInstance(instanceId))!;
  }

  async uncompleteChore(instanceId: number): Promise<ChoreInstance> {
    const instance = await this.getInstance(instanceId);
    if (!instance) {
      throw new Error('Chore instance not found');
    }
    if (!instance.completedAt) {
      throw new Error('Chore is not completed');
    }

    // Remove the sticker that was awarded
    if (instance.stickerId) {
      await this.kidRepo.removeSticker(instance.stickerId);
    }

    // Clear completion
    await db('chore_instances')
      .where({ id: instanceId })
      .update({
        completed_at: null,
        sticker_id: null,
        updated_at: db.fn.now(),
      });

    // Delete any future instances that were created from this completion
    const definition = await this.getDefinition(instance.choreDefinitionId);
    if (definition?.isRecurring) {
      // Delete the next pending instance for this definition
      await db('chore_instances')
        .where({ chore_definition_id: instance.choreDefinitionId })
        .where('due_date', '>', instance.dueDate)
        .whereNull('completed_at')
        .orderBy('due_date', 'asc')
        .limit(1)
        .delete();

      // Revert rotation index if rotating
      if (definition.isRotating && definition.rotationKidIds && definition.rotationKidIds.length > 1) {
        const prevIndex = (definition.currentRotationIndex - 1 + definition.rotationKidIds.length) % definition.rotationKidIds.length;
        await db('chore_definitions')
          .where({ id: definition.id })
          .update({ current_rotation_index: prevIndex });
      }
    }

    return (await this.getInstance(instanceId))!;
  }

  // =====================
  // ROTATION LOGIC
  // =====================

  private getNextKidInRotation(definition: ChoreDefinition): number {
    const kidIds = definition.rotationKidIds || [];
    if (kidIds.length === 0) {
      return definition.defaultKidId!;
    }
    if (kidIds.length === 1) {
      return kidIds[0];
    }

    // Get next kid in rotation
    const nextIndex = (definition.currentRotationIndex + 1) % kidIds.length;
    return kidIds[nextIndex];
  }

  private async advanceRotation(definitionId: number, currentIndex: number, totalKids: number): Promise<void> {
    const nextIndex = (currentIndex + 1) % totalKids;
    await db('chore_definitions')
      .where({ id: definitionId })
      .update({
        current_rotation_index: nextIndex,
        updated_at: db.fn.now(),
      });
  }

  async removeKidFromRotations(kidId: number): Promise<void> {
    // Find all definitions where this kid is in rotation
    const definitions = await db('chore_definitions')
      .whereNotNull('rotation_kid_ids');

    for (const def of definitions) {
      const kidIds: number[] = JSON.parse(def.rotation_kid_ids || '[]');
      const kidIndex = kidIds.indexOf(kidId);

      if (kidIndex !== -1) {
        // Remove kid from rotation
        kidIds.splice(kidIndex, 1);

        // Adjust rotation index if needed
        let newIndex = def.current_rotation_index;
        if (kidIndex <= def.current_rotation_index && def.current_rotation_index > 0) {
          newIndex = def.current_rotation_index - 1;
        }
        if (kidIds.length > 0 && newIndex >= kidIds.length) {
          newIndex = 0;
        }

        await db('chore_definitions')
          .where({ id: def.id })
          .update({
            rotation_kid_ids: kidIds.length > 0 ? JSON.stringify(kidIds) : null,
            current_rotation_index: newIndex,
            updated_at: db.fn.now(),
          });
      }
    }
  }

  // =====================
  // RECURRENCE LOGIC
  // =====================

  private async createInitialInstance(definition: ChoreDefinition): Promise<void> {
    // Determine first assigned kid
    let firstKidId: number | undefined;
    if (definition.isRotating && definition.rotationKidIds && definition.rotationKidIds.length > 0) {
      firstKidId = definition.rotationKidIds[0];
    } else {
      firstKidId = definition.defaultKidId;
    }

    if (!firstKidId) {
      return; // No kid to assign to
    }

    // Calculate first due date
    const dueDate = this.calculateFirstDueDate(definition.recurrencePattern);

    await this.createInstance(definition.id, firstKidId, dueDate);
  }

  private calculateFirstDueDate(pattern?: RecurrencePattern): string {
    const today = new Date();

    if (!pattern) {
      return today.toISOString().split('T')[0];
    }

    if (pattern.frequency === 'weekly' && pattern.days && pattern.days.length > 0) {
      // Find next occurrence of one of the specified days
      const currentDay = today.getDay();
      const sortedDays = [...pattern.days].sort((a, b) => a - b);

      for (const day of sortedDays) {
        if (day >= currentDay) {
          const diff = day - currentDay;
          const nextDate = new Date(today);
          nextDate.setDate(nextDate.getDate() + diff);
          return nextDate.toISOString().split('T')[0];
        }
      }

      // Wrap to next week
      const firstDay = sortedDays[0];
      const diff = 7 - currentDay + firstDay;
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + diff);
      return nextDate.toISOString().split('T')[0];
    }

    return today.toISOString().split('T')[0];
  }

  private async createNextRecurrence(instance: ChoreInstance, definition: ChoreDefinition): Promise<void> {
    if (!definition.isRecurring) return;

    // Calculate next due date
    const nextDate = this.calculateNextDueDate(instance.dueDate, definition.recurrencePattern);

    // Get next kid (rotated or same)
    let nextKidId: number;
    if (definition.isRotating && definition.rotationKidIds && definition.rotationKidIds.length > 1) {
      nextKidId = this.getNextKidInRotation(definition);
      await this.advanceRotation(definition.id, definition.currentRotationIndex, definition.rotationKidIds.length);
    } else {
      nextKidId = instance.assignedKidId;
    }

    await this.createInstance(definition.id, nextKidId, nextDate, instance.dueTime);
  }

  private calculateNextDueDate(currentDueDate: string, pattern?: RecurrencePattern): string {
    const current = new Date(currentDueDate);
    const interval = pattern?.interval || 1;

    if (!pattern) {
      // Default to daily
      current.setDate(current.getDate() + 1);
      return current.toISOString().split('T')[0];
    }

    switch (pattern.frequency) {
      case 'daily':
        current.setDate(current.getDate() + interval);
        break;

      case 'weekly':
        if (pattern.days && pattern.days.length > 0) {
          // Find next day in the pattern
          const currentDay = current.getDay();
          const sortedDays = [...pattern.days].sort((a, b) => a - b);

          // Find next day after current
          let nextDay = sortedDays.find((d) => d > currentDay);

          if (nextDay !== undefined) {
            // Next day is in current week
            current.setDate(current.getDate() + (nextDay - currentDay));
          } else {
            // Wrap to first day of next week(s)
            const firstDay = sortedDays[0];
            const daysUntilNextWeek = 7 - currentDay + firstDay + (interval - 1) * 7;
            current.setDate(current.getDate() + daysUntilNextWeek);
          }
        } else {
          // No specific days, just add weeks
          current.setDate(current.getDate() + 7 * interval);
        }
        break;

      case 'monthly':
        current.setMonth(current.getMonth() + interval);
        break;
    }

    return current.toISOString().split('T')[0];
  }

  // =====================
  // MAPPING FUNCTIONS
  // =====================

  private async mapDefinitionFromDb(row: any): Promise<ChoreDefinition> {
    const rotationKidIds = row.rotation_kid_ids ? JSON.parse(row.rotation_kid_ids) : undefined;

    // Get rotation kids info
    let rotationKids: Kid[] | undefined;
    if (rotationKidIds && rotationKidIds.length > 0) {
      rotationKids = [];
      for (const kidId of rotationKidIds) {
        const kid = await this.kidRepo.getKid(kidId);
        if (kid) rotationKids.push(kid);
      }
    }

    // Get next assigned kid
    let nextAssignedKid: Kid | undefined;
    if (row.is_rotating && rotationKidIds && rotationKidIds.length > 0) {
      const nextKidId = rotationKidIds[row.current_rotation_index % rotationKidIds.length];
      nextAssignedKid = await this.kidRepo.getKid(nextKidId) || undefined;
    } else if (row.default_kid_id) {
      nextAssignedKid = await this.kidRepo.getKid(row.default_kid_id) || undefined;
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      category: row.category,
      estimatedMinutes: row.estimated_minutes,
      isRecurring: !!row.is_recurring,
      recurrencePattern: row.recurrence_pattern ? JSON.parse(row.recurrence_pattern) : undefined,
      isRotating: !!row.is_rotating,
      rotationKidIds,
      currentRotationIndex: row.current_rotation_index || 0,
      defaultKidId: row.default_kid_id,
      isActive: !!row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      nextAssignedKid,
      rotationKids,
    };
  }

  private async mapInstanceFromDb(row: any): Promise<ChoreInstance> {
    const definition = await this.getDefinition(row.chore_definition_id);
    const assignedKid = await this.kidRepo.getKid(row.assigned_kid_id);

    return {
      id: row.id,
      choreDefinitionId: row.chore_definition_id,
      assignedKidId: row.assigned_kid_id,
      dueDate: row.due_date,
      dueTime: row.due_time,
      completedAt: row.completed_at,
      stickerId: row.sticker_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      choreDefinition: definition || undefined,
      assignedKid: assignedKid || undefined,
    };
  }
}
