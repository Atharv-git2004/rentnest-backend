// routes/messageRoutes.js

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
 * 💡 ഓർഡർ വളരെ പ്രധാനമാണ്!
 * എപ്പോഴും static paths (/upload, /conversations) ആദ്യം കൊടുക്കുക.
 * അതിനു ശേഷം മാത്രം dynamic paths (/:otherUserId) കൊടുക്കുക.
 */

// 1. ഫയലുകൾ / ഓഡിയോ അപ്‌ലോഡ് ചെയ്യാനുള്ള റൂട്ട് (Multer ഉപയോഗിച്ച്)
router.post('/upload', protect, upload.single('file'), uploadFile);

// 2. യൂസറുടെ ചാറ്റ് ലിസ്റ്റ് എടുക്കാനുള്ള റൂട്ട്
router.get('/conversations', protect, getConversations); 

// 3. പുതിയ മെസ്സേജ് അയക്കാനുള്ള റൂട്ട്
router.post('/', protect, sendMessage);

// 4. ഡൈനാമിക് റൂട്ടുകൾ (ഒരു പ്രത്യേക യൂസറുമായുള്ള ചാറ്റുകൾ എടുക്കാൻ)
router.get('/:otherUserId', protect, getMessages); 
router.put('/:otherUserId/read', protect, markMessagesAsRead); 

export default router;