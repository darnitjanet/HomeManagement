import { db } from '../config/database';

export interface Message {
  id: number;
  author: string;
  content: string;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface MessageInput {
  author: string;
  content: string;
  color?: string;
}

interface MessageUpdate {
  content?: string;
  color?: string;
}

function mapRow(row: any): Message {
  return {
    ...row,
    pinned: Boolean(row.pinned),
  };
}

export const messageRepository = {
  async getAllMessages(): Promise<Message[]> {
    const rows = await db('messages')
      .orderBy('pinned', 'desc')
      .orderBy('created_at', 'desc');
    return rows.map(mapRow);
  },

  async getMessage(id: number): Promise<Message | null> {
    const row = await db('messages').where({ id }).first();
    return row ? mapRow(row) : null;
  },

  async createMessage(data: MessageInput): Promise<Message> {
    const [id] = await db('messages').insert({
      author: data.author,
      content: data.content,
      color: data.color || '#eed6aa',
    });
    return this.getMessage(id) as Promise<Message>;
  },

  async updateMessage(id: number, data: MessageUpdate): Promise<Message | null> {
    await db('messages').where({ id }).update({
      ...data,
      updated_at: db.fn.now(),
    });
    return this.getMessage(id);
  },

  async deleteMessage(id: number): Promise<boolean> {
    const count = await db('messages').where({ id }).delete();
    return count > 0;
  },

  async togglePin(id: number): Promise<Message | null> {
    const message = await this.getMessage(id);
    if (!message) return null;

    await db('messages').where({ id }).update({
      pinned: !message.pinned,
      updated_at: db.fn.now(),
    });
    return this.getMessage(id);
  },
};
