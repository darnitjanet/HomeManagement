import { db } from '../config/database';

export interface PaybackAccount {
  id: number;
  kid_name: string;
  total_owed: number;
  total_paid: number;
  is_active: boolean;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface PaybackChore {
  id: number;
  account_id: number;
  description: string;
  amount: number;
  completed_date: string;
  created_at: string;
}

function mapAccount(row: any): PaybackAccount {
  return {
    ...row,
    total_owed: parseFloat(row.total_owed) || 0,
    total_paid: parseFloat(row.total_paid) || 0,
    balance: (parseFloat(row.total_owed) || 0) - (parseFloat(row.total_paid) || 0),
    is_active: Boolean(row.is_active),
  };
}

function mapChore(row: any): PaybackChore {
  return {
    ...row,
    amount: parseFloat(row.amount) || 0,
  };
}

export const paybackRepository = {
  async getAllAccounts(): Promise<PaybackAccount[]> {
    const rows = await db('payback_accounts').where('is_active', true).orderBy('kid_name');
    return rows.map(mapAccount);
  },

  async getAccount(id: number): Promise<PaybackAccount | null> {
    const row = await db('payback_accounts').where('id', id).first();
    if (!row) return null;
    return mapAccount(row);
  },

  async createAccount(data: { kid_name: string; total_owed?: number }): Promise<PaybackAccount> {
    const [id] = await db('payback_accounts').insert({
      kid_name: data.kid_name,
      total_owed: data.total_owed || 0,
      total_paid: 0,
    });
    return (await this.getAccount(id))!;
  },

  async updateAccount(id: number, data: { kid_name?: string; total_owed?: number }): Promise<PaybackAccount | null> {
    const updateData: any = { ...data, updated_at: db.fn.now() };
    await db('payback_accounts').where('id', id).update(updateData);
    return this.getAccount(id);
  },

  async addChore(accountId: number, data: { description: string; amount?: number; completed_date?: string }): Promise<PaybackChore> {
    const amount = data.amount ?? 1.00;
    const [id] = await db('payback_chores').insert({
      account_id: accountId,
      description: data.description,
      amount,
      completed_date: data.completed_date || new Date().toISOString().substring(0, 10),
    });

    // Increment total_paid on the account
    await db('payback_accounts')
      .where('id', accountId)
      .increment('total_paid', amount)
      .update({ updated_at: db.fn.now() });

    const row = await db('payback_chores').where('id', id).first();
    return mapChore(row);
  },

  async getChores(accountId: number): Promise<PaybackChore[]> {
    const rows = await db('payback_chores')
      .where('account_id', accountId)
      .orderBy('completed_date', 'desc')
      .orderBy('created_at', 'desc');
    return rows.map(mapChore);
  },

  async deleteChore(id: number): Promise<boolean> {
    const chore = await db('payback_chores').where('id', id).first();
    if (!chore) return false;

    // Decrement total_paid on the account
    await db('payback_accounts')
      .where('id', chore.account_id)
      .decrement('total_paid', parseFloat(chore.amount) || 0)
      .update({ updated_at: db.fn.now() });

    await db('payback_chores').where('id', id).delete();
    return true;
  },

  async resetAccount(id: number): Promise<PaybackAccount | null> {
    await db('payback_chores').where('account_id', id).delete();
    await db('payback_accounts').where('id', id).update({
      total_owed: 0,
      total_paid: 0,
      updated_at: db.fn.now(),
    });
    return this.getAccount(id);
  },
};
