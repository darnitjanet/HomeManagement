import { db } from '../config/database';

export interface Note {
  id: number;
  title: string;
  content: string | null;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteData {
  title: string;
  content?: string;
  color?: string;
  pinned?: boolean;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  color?: string;
  pinned?: boolean;
}

export async function getAllNotes(): Promise<Note[]> {
  return db('notes')
    .select('*')
    .orderBy('pinned', 'desc')
    .orderBy('updated_at', 'desc');
}

export async function getNoteById(id: number): Promise<Note | undefined> {
  return db('notes').where({ id }).first();
}

export async function createNote(data: CreateNoteData): Promise<Note> {
  const [id] = await db('notes').insert({
    title: data.title,
    content: data.content || null,
    color: data.color || '#5b768a',
    pinned: data.pinned || false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  return getNoteById(id) as Promise<Note>;
}

export async function updateNote(id: number, data: UpdateNoteData): Promise<Note | undefined> {
  await db('notes')
    .where({ id })
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    });

  return getNoteById(id);
}

export async function deleteNote(id: number): Promise<boolean> {
  const deleted = await db('notes').where({ id }).delete();
  return deleted > 0;
}

export async function togglePinNote(id: number): Promise<Note | undefined> {
  const note = await getNoteById(id);
  if (!note) return undefined;

  await db('notes')
    .where({ id })
    .update({
      pinned: !note.pinned,
      updated_at: new Date().toISOString(),
    });

  return getNoteById(id);
}
