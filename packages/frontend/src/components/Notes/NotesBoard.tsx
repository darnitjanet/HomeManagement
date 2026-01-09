import { useState, useEffect } from 'react';
import { Plus, Pin, Trash2, X, Check } from 'lucide-react';
import { notesApi } from '../../services/api';
import './NotesBoard.css';

interface Note {
  id: number;
  title: string;
  content: string | null;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

const NOTE_COLORS = [
  '#5b768a', // slate (default)
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
];

export function NotesBoard() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: '#5b768a' });

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await notesApi.getAllNotes();
      if (response.data.success) {
        setNotes(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.title.trim()) return;

    try {
      const response = await notesApi.createNote(newNote);
      if (response.data.success) {
        setNotes([response.data.data, ...notes]);
        setNewNote({ title: '', content: '', color: '#5b768a' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNote) return;

    try {
      const response = await notesApi.updateNote(editingNote.id, {
        title: editingNote.title,
        content: editingNote.content || undefined,
        color: editingNote.color,
      });
      if (response.data.success) {
        setNotes(notes.map(n => n.id === editingNote.id ? response.data.data : n));
        setEditingNote(null);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleTogglePin = async (note: Note) => {
    try {
      const response = await notesApi.togglePin(note.id);
      if (response.data.success) {
        loadNotes(); // Reload to get correct order
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await notesApi.deleteNote(id);
      setNotes(notes.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  if (loading) {
    return <div className="notes-board loading">Loading notes...</div>;
  }

  return (
    <div className="notes-board">
      <div className="notes-header">
        <h3>Family Notes</h3>
        <button className="add-note-btn" onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
        </button>
      </div>

      {showAddForm && (
        <div className="note-form">
          <input
            type="text"
            placeholder="Note title..."
            value={newNote.title}
            onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
            autoFocus
          />
          <textarea
            placeholder="Note content (optional)..."
            value={newNote.content}
            onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
            rows={2}
          />
          <div className="form-footer">
            <div className="color-picker">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-option ${newNote.color === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewNote({ ...newNote, color })}
                />
              ))}
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowAddForm(false)}>
                <X size={16} />
              </button>
              <button className="save-btn" onClick={handleAddNote}>
                <Check size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="notes-grid">
        {notes.map((note) => (
          <div
            key={note.id}
            className={`note-card ${note.pinned ? 'pinned' : ''}`}
            style={{ borderLeftColor: note.color }}
          >
            {editingNote?.id === note.id ? (
              <div className="note-edit">
                <input
                  type="text"
                  value={editingNote.title}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                />
                <textarea
                  value={editingNote.content || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  rows={2}
                />
                <div className="edit-actions">
                  <button onClick={() => setEditingNote(null)}><X size={14} /></button>
                  <button onClick={handleUpdateNote}><Check size={14} /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="note-content" onClick={() => setEditingNote(note)}>
                  <div className="note-title">{note.title}</div>
                  {note.content && <div className="note-text">{note.content}</div>}
                </div>
                <div className="note-actions">
                  <button
                    className={`pin-btn ${note.pinned ? 'active' : ''}`}
                    onClick={() => handleTogglePin(note)}
                  >
                    <Pin size={14} />
                  </button>
                  <button className="delete-btn" onClick={() => handleDeleteNote(note.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {notes.length === 0 && !showAddForm && (
        <div className="no-notes">
          <p>No notes yet. Click + to add one!</p>
        </div>
      )}
    </div>
  );
}
