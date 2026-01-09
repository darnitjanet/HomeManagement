import { Router, Request, Response } from 'express';
import * as noteRepository from '../repositories/note.repository';

const router = Router();

// GET /api/notes - Get all notes
router.get('/', async (req: Request, res: Response) => {
  try {
    const notes = await noteRepository.getAllNotes();
    res.json({ success: true, data: notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notes' });
  }
});

// GET /api/notes/:id - Get a specific note
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const note = await noteRepository.getNoteById(id);

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch note' });
  }
});

// POST /api/notes - Create a new note
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, content, color, pinned } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const note = await noteRepository.createNote({
      title: title.trim(),
      content,
      color,
      pinned,
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ success: false, error: 'Failed to create note' });
  }
});

// PUT /api/notes/:id - Update a note
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { title, content, color, pinned } = req.body;

    const note = await noteRepository.updateNote(id, {
      title,
      content,
      color,
      pinned,
    });

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ success: false, error: 'Failed to update note' });
  }
});

// PUT /api/notes/:id/pin - Toggle pin status
router.put('/:id/pin', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const note = await noteRepository.togglePinNote(id);

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({ success: true, data: note });
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle pin' });
  }
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await noteRepository.deleteNote(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ success: false, error: 'Failed to delete note' });
  }
});

export default router;
