import { Request, Response } from 'express';
import * as emergencyRepo from '../repositories/emergency.repository';

// =====================
// EMERGENCY CONTACTS
// =====================

export async function getAllEmergencyContacts(req: Request, res: Response) {
  try {
    const contacts = await emergencyRepo.getAllEmergencyContacts();
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    console.error('Get emergency contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getUpcomingBirthdays(req: Request, res: Response) {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const contacts = await emergencyRepo.getContactsWithUpcomingBirthdays(days);
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    console.error('Get upcoming birthdays error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createEmergencyContact(req: Request, res: Response) {
  try {
    const contact = await emergencyRepo.createEmergencyContact(req.body);
    res.json({ success: true, data: contact });
  } catch (error: any) {
    console.error('Create emergency contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateEmergencyContact(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const contact = await emergencyRepo.updateEmergencyContact(parseInt(id), req.body);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    res.json({ success: true, data: contact });
  } catch (error: any) {
    console.error('Update emergency contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteEmergencyContact(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await emergencyRepo.deleteEmergencyContact(parseInt(id));
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Contact not found' });
    }
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error: any) {
    console.error('Delete emergency contact error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// =====================
// EMERGENCY INFO
// =====================

export async function getAllEmergencyInfo(req: Request, res: Response) {
  try {
    const { category } = req.query;
    let info;
    if (category && typeof category === 'string') {
      info = await emergencyRepo.getEmergencyInfoByCategory(category);
    } else {
      info = await emergencyRepo.getAllEmergencyInfo();
    }
    res.json({ success: true, data: info });
  } catch (error: any) {
    console.error('Get emergency info error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createEmergencyInfo(req: Request, res: Response) {
  try {
    const info = await emergencyRepo.createEmergencyInfo(req.body);
    res.json({ success: true, data: info });
  } catch (error: any) {
    console.error('Create emergency info error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateEmergencyInfo(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const info = await emergencyRepo.updateEmergencyInfo(parseInt(id), req.body);
    if (!info) {
      return res.status(404).json({ success: false, message: 'Info not found' });
    }
    res.json({ success: true, data: info });
  } catch (error: any) {
    console.error('Update emergency info error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteEmergencyInfo(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await emergencyRepo.deleteEmergencyInfo(parseInt(id));
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Info not found' });
    }
    res.json({ success: true, message: 'Info deleted' });
  } catch (error: any) {
    console.error('Delete emergency info error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

// =====================
// FAMILY RULES
// =====================

export async function getAllFamilyRules(req: Request, res: Response) {
  try {
    const { category } = req.query;
    let rules;
    if (category && typeof category === 'string') {
      rules = await emergencyRepo.getFamilyRulesByCategory(category);
    } else {
      rules = await emergencyRepo.getAllFamilyRules();
    }
    res.json({ success: true, data: rules });
  } catch (error: any) {
    console.error('Get family rules error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createFamilyRule(req: Request, res: Response) {
  try {
    const rule = await emergencyRepo.createFamilyRule(req.body);
    res.json({ success: true, data: rule });
  } catch (error: any) {
    console.error('Create family rule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateFamilyRule(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const rule = await emergencyRepo.updateFamilyRule(parseInt(id), req.body);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, data: rule });
  } catch (error: any) {
    console.error('Update family rule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteFamilyRule(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await emergencyRepo.deleteFamilyRule(parseInt(id));
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({ success: true, message: 'Rule deleted' });
  } catch (error: any) {
    console.error('Delete family rule error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function reorderFamilyRules(req: Request, res: Response) {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds must be an array' });
    }
    await emergencyRepo.reorderFamilyRules(orderedIds);
    res.json({ success: true, message: 'Rules reordered' });
  } catch (error: any) {
    console.error('Reorder family rules error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
