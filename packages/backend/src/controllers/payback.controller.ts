import { Request, Response } from 'express';
import { paybackRepository } from '../repositories/payback.repository';

export async function getAllAccounts(req: Request, res: Response) {
  try {
    const accounts = await paybackRepository.getAllAccounts();
    res.json({ success: true, data: accounts });
  } catch (error: any) {
    console.error('Error getting payback accounts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getAccount(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const account = await paybackRepository.getAccount(id);

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    res.json({ success: true, data: account });
  } catch (error: any) {
    console.error('Error getting payback account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createAccount(req: Request, res: Response) {
  try {
    const { kid_name, total_owed } = req.body;

    if (!kid_name) {
      return res.status(400).json({ success: false, message: 'Kid name is required' });
    }

    const account = await paybackRepository.createAccount({ kid_name, total_owed });
    res.status(201).json({ success: true, data: account });
  } catch (error: any) {
    console.error('Error creating payback account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateAccount(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { kid_name, total_owed } = req.body;

    const account = await paybackRepository.updateAccount(id, { kid_name, total_owed });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    res.json({ success: true, data: account });
  } catch (error: any) {
    console.error('Error updating payback account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function addChore(req: Request, res: Response) {
  try {
    const accountId = parseInt(req.params.id);
    const { description, amount, completed_date } = req.body;

    if (!description) {
      return res.status(400).json({ success: false, message: 'Chore description is required' });
    }

    const account = await paybackRepository.getAccount(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const chore = await paybackRepository.addChore(accountId, { description, amount, completed_date });
    res.status(201).json({ success: true, data: chore });
  } catch (error: any) {
    console.error('Error adding payback chore:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getChores(req: Request, res: Response) {
  try {
    const accountId = parseInt(req.params.id);
    const chores = await paybackRepository.getChores(accountId);
    res.json({ success: true, data: chores });
  } catch (error: any) {
    console.error('Error getting payback chores:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteChore(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const deleted = await paybackRepository.deleteChore(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Chore not found' });
    }

    res.json({ success: true, message: 'Chore deleted' });
  } catch (error: any) {
    console.error('Error deleting payback chore:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function resetAccount(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const account = await paybackRepository.resetAccount(id);

    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    res.json({ success: true, data: account });
  } catch (error: any) {
    console.error('Error resetting payback account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
