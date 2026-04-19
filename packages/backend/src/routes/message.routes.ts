import { Router } from 'express';
import * as messageController from '../controllers/message.controller';

const router = Router();

// Get all messages
router.get('/', messageController.getAllMessages);

// Create a new message
router.post('/', messageController.createMessage);

// Update a message
router.put('/:id', messageController.updateMessage);

// Delete a message
router.delete('/:id', messageController.deleteMessage);

// Toggle pin status
router.put('/:id/pin', messageController.togglePin);

export default router;
