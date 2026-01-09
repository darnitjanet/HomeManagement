import { Request, Response } from 'express';
import { ChoreRepository } from '../repositories/chore.repository';

const choreRepo = new ChoreRepository();

// =====================
// CHORE DEFINITIONS
// =====================

export async function getAllDefinitions(req: Request, res: Response) {
  try {
    const definitions = await choreRepo.getAllDefinitions();
    res.json({
      success: true,
      data: definitions,
    });
  } catch (error: any) {
    console.error('Get chore definitions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chore definitions',
      message: error.message,
    });
  }
}

export async function getDefinition(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const definition = await choreRepo.getDefinition(parseInt(id));

    if (!definition) {
      return res.status(404).json({
        success: false,
        error: 'Chore definition not found',
      });
    }

    res.json({
      success: true,
      data: definition,
    });
  } catch (error: any) {
    console.error('Get chore definition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chore definition',
      message: error.message,
    });
  }
}

export async function createDefinition(req: Request, res: Response) {
  try {
    const { name, description, icon, category, estimatedMinutes, isRecurring, recurrencePattern, isRotating, rotationKidIds, defaultKidId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Chore name is required',
      });
    }

    // Validate assignment
    if (!isRotating && !defaultKidId) {
      return res.status(400).json({
        success: false,
        error: 'Must specify either a default kid or enable rotation with kid IDs',
      });
    }

    if (isRotating && (!rotationKidIds || rotationKidIds.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Rotation requires at least one kid in the rotation list',
      });
    }

    const definition = await choreRepo.createDefinition({
      name,
      description,
      icon,
      category,
      estimatedMinutes,
      isRecurring,
      recurrencePattern,
      isRotating,
      rotationKidIds,
      defaultKidId,
    });

    res.status(201).json({
      success: true,
      data: definition,
      message: 'Chore created successfully',
    });
  } catch (error: any) {
    console.error('Create chore definition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chore definition',
      message: error.message,
    });
  }
}

export async function updateDefinition(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const definition = await choreRepo.updateDefinition(parseInt(id), req.body);

    if (!definition) {
      return res.status(404).json({
        success: false,
        error: 'Chore definition not found',
      });
    }

    res.json({
      success: true,
      data: definition,
      message: 'Chore updated successfully',
    });
  } catch (error: any) {
    console.error('Update chore definition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update chore definition',
      message: error.message,
    });
  }
}

export async function deleteDefinition(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await choreRepo.deleteDefinition(parseInt(id));

    res.json({
      success: true,
      message: 'Chore deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete chore definition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chore definition',
      message: error.message,
    });
  }
}

// =====================
// CHORE INSTANCES
// =====================

export async function getTodaysChores(req: Request, res: Response) {
  try {
    const chores = await choreRepo.getTodaysChores();
    res.json({
      success: true,
      data: chores,
    });
  } catch (error: any) {
    console.error('Get today\'s chores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve today\'s chores',
      message: error.message,
    });
  }
}

export async function getUpcomingChores(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const chores = await choreRepo.getUpcomingChores(days);
    res.json({
      success: true,
      data: chores,
    });
  } catch (error: any) {
    console.error('Get upcoming chores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve upcoming chores',
      message: error.message,
    });
  }
}

export async function getChoresByKid(req: Request, res: Response) {
  try {
    const { kidId } = req.params;
    const includeCompleted = req.query.includeCompleted === 'true';
    const chores = await choreRepo.getChoresByKid(parseInt(kidId), includeCompleted);
    res.json({
      success: true,
      data: chores,
    });
  } catch (error: any) {
    console.error('Get chores by kid error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chores for kid',
      message: error.message,
    });
  }
}

export async function getChoreInstance(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const instance = await choreRepo.getInstance(parseInt(id));

    if (!instance) {
      return res.status(404).json({
        success: false,
        error: 'Chore instance not found',
      });
    }

    res.json({
      success: true,
      data: instance,
    });
  } catch (error: any) {
    console.error('Get chore instance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chore instance',
      message: error.message,
    });
  }
}

// =====================
// COMPLETION
// =====================

export async function completeChore(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const instance = await choreRepo.completeChore(parseInt(id));

    res.json({
      success: true,
      data: instance,
      message: `Chore completed! ${instance.assignedKid?.name} earned a sticker!`,
    });
  } catch (error: any) {
    console.error('Complete chore error:', error);

    if (error.message === 'Chore instance not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message === 'Chore already completed') {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to complete chore',
      message: error.message,
    });
  }
}

export async function uncompleteChore(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const instance = await choreRepo.uncompleteChore(parseInt(id));

    res.json({
      success: true,
      data: instance,
      message: 'Chore completion undone. Sticker removed.',
    });
  } catch (error: any) {
    console.error('Uncomplete chore error:', error);

    if (error.message === 'Chore instance not found') {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.message === 'Chore is not completed') {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to undo chore completion',
      message: error.message,
    });
  }
}
