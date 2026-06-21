import express from 'express';
import { 
  sendMessage, 
  getConversations, 
  getMessages, 
  markMessagesAsRead,
  uploadFile 
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js'; 

const router = express.Router();

/**
 * 💡 ORDER MATTERS IN EXPRESS!
 * Always put static paths (like /upload or /conversations) 
 * BEFORE dynamic paths (like /:otherUserId).
 */

// 1. Upload Route
router.post('/upload', protect, upload.single('file'), uploadFile);

// 2. Conversations List
router.get('/conversations', protect, getConversations); 

// 3. Send Message
router.post('/', protect, sendMessage);

// 4. Dynamic/Parameter Routes (Must come LAST)
router.get('/:otherUserId', protect, getMessages); 
router.put('/:otherUserId/read', protect, markMessagesAsRead); 

export default router;