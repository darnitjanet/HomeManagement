import { Request, Response } from 'express';
import { messageRepository } from '../repositories/message.repository';

export async function getAllMessages(req: Request, res: Response) {
  try {
    const messages = await messageRepository.getAllMessages();
    res.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('Error getting messages:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createMessage(req: Request, res: Response) {
  try {
    const { author, content, color } = req.body;

    if (!author || !author.trim()) {
      return res.status(400).json({ success: false, message: 'Author is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const message = await messageRepository.createMessage({
      author: author.trim(),
      content: content.trim(),
      color,
    });
    res.status(201).json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error creating message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateMessage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const { content, color } = req.body;

    const message = await messageRepository.updateMessage(id, { content, color });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error updating message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deleteMessage(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const deleted = await messageRepository.deleteMessage(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, message: 'Message deleted' });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function togglePin(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const message = await messageRepository.togglePin(id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({ success: true, data: message });
  } catch (error: any) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}
