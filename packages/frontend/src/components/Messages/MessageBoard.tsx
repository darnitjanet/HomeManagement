import { useState, useEffect } from 'react';
import { Plus, Pin, Trash2, X, Check, Edit2, MessageSquare } from 'lucide-react';
import { messagesApi } from '../../services/api';
import './MessageBoard.css';

interface Message {
  id: number;
  author: string;
  content: string;
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

const STICKY_COLORS = [
  { value: '#eed6aa', label: 'Cream' },
  { value: '#fde2e2', label: 'Pink' },
  { value: '#d4edda', label: 'Green' },
  { value: '#cce5ff', label: 'Blue' },
  { value: '#fff3cd', label: 'Yellow' },
  { value: '#e2d6f3', label: 'Purple' },
];

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function MessageBoard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState({
    author: localStorage.getItem('messageBoardAuthor') || '',
    content: '',
    color: '#eed6aa',
  });

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await messagesApi.getAll();
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMessage = async () => {
    if (!newMessage.author.trim() || !newMessage.content.trim()) return;

    try {
      localStorage.setItem('messageBoardAuthor', newMessage.author.trim());
      const response = await messagesApi.create({
        author: newMessage.author.trim(),
        content: newMessage.content.trim(),
        color: newMessage.color,
      });
      if (response.data.success) {
        setMessages([response.data.data, ...messages.filter(m => !m.pinned), ...[]]);
        // Re-sort: pinned first, then by created_at desc
        loadMessages();
        setNewMessage({ author: newMessage.author, content: '', color: '#eed6aa' });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to create message:', error);
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage) return;

    try {
      const response = await messagesApi.update(editingMessage.id, {
        content: editingMessage.content,
        color: editingMessage.color,
      });
      if (response.data.success) {
        setMessages(messages.map(m => m.id === editingMessage.id ? response.data.data : m));
        setEditingMessage(null);
      }
    } catch (error) {
      console.error('Failed to update message:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await messagesApi.delete(id);
      if (response.data.success) {
        setMessages(messages.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleTogglePin = async (id: number) => {
    try {
      const response = await messagesApi.togglePin(id);
      if (response.data.success) {
        // Re-fetch to get correct ordering
        loadMessages();
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  if (loading) {
    return <div className="message-board loading">Loading messages...</div>;
  }

  return (
    <div className="message-board">
      <div className="message-board-header">
        <h2><MessageSquare size={24} /> Family Message Board</h2>
        <button
          className="new-message-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          aria-label={showAddForm ? 'Cancel' : 'New Message'}
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? 'Cancel' : 'New Message'}
        </button>
      </div>

      {showAddForm && (
        <div className="message-form" style={{ borderColor: newMessage.color }}>
          <input
            type="text"
            placeholder="Your name (e.g., Mom, Dad, Kids)"
            value={newMessage.author}
            onChange={e => setNewMessage({ ...newMessage, author: e.target.value })}
            maxLength={50}
          />
          <textarea
            placeholder="Write your message..."
            value={newMessage.content}
            onChange={e => setNewMessage({ ...newMessage, content: e.target.value })}
            rows={3}
            maxLength={500}
          />
          <div className="form-footer">
            <div className="color-picker">
              {STICKY_COLORS.map(c => (
                <button
                  key={c.value}
                  className={`color-swatch ${newMessage.color === c.value ? 'selected' : ''}`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setNewMessage({ ...newMessage, color: c.value })}
                  aria-label={c.label}
                  title={c.label}
                />
              ))}
            </div>
            <button
              className="submit-message-btn"
              onClick={handleAddMessage}
              disabled={!newMessage.author.trim() || !newMessage.content.trim()}
            >
              <Check size={18} /> Post
            </button>
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="no-messages">
          <MessageSquare size={48} />
          <p>No messages yet. Leave a note for your family!</p>
        </div>
      ) : (
        <div className="messages-grid">
          {messages.map(message => (
            <div
              key={message.id}
              className={`sticky-note ${message.pinned ? 'pinned' : ''}`}
              style={{ backgroundColor: message.color }}
            >
              {editingMessage?.id === message.id ? (
                <div className="sticky-note-edit">
                  <textarea
                    value={editingMessage.content}
                    onChange={e => setEditingMessage({ ...editingMessage, content: e.target.value })}
                    rows={3}
                  />
                  <div className="edit-color-picker">
                    {STICKY_COLORS.map(c => (
                      <button
                        key={c.value}
                        className={`color-swatch small ${editingMessage.color === c.value ? 'selected' : ''}`}
                        style={{ backgroundColor: c.value }}
                        onClick={() => setEditingMessage({ ...editingMessage, color: c.value })}
                        aria-label={c.label}
                      />
                    ))}
                  </div>
                  <div className="edit-actions">
                    <button className="cancel-edit-btn" onClick={() => setEditingMessage(null)}>
                      <X size={16} /> Cancel
                    </button>
                    <button className="save-edit-btn" onClick={handleUpdateMessage}>
                      <Check size={16} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="sticky-note-header">
                    <span className="sticky-author">{message.author}</span>
                    <span className="sticky-time">{getRelativeTime(message.created_at)}</span>
                  </div>
                  <div className="sticky-content">{message.content}</div>
                  <div className="sticky-actions">
                    <button
                      className={`action-btn pin-btn ${message.pinned ? 'active' : ''}`}
                      onClick={() => handleTogglePin(message.id)}
                      aria-label={message.pinned ? 'Unpin' : 'Pin'}
                      title={message.pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin size={16} />
                    </button>
                    <button
                      className="action-btn edit-btn"
                      onClick={() => setEditingMessage({ ...message })}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(message.id)}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
