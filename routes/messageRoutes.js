import express from 'express';
import { sendMessage, getConversations, getMessages } from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/conversations', protect, getConversations); // ചാറ്റ് ലിസ്റ്റ് എടുക്കാൻ
router.get('/:otherUserId', protect, getMessages); // സിംഗിൾ ചാറ്റ് ഹിസ്റ്ററി എടുക്കാൻ

export default router;