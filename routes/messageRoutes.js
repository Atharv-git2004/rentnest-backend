import express from 'express'; // ശരിയായ ഇമ്പോർട്ട്
import { 
  sendMessage, 
  getConversations, 
  getMessages, 
  markMessagesAsRead,
  uploadFile,
  editMessage,
  deleteMessage
} from '../controllers/messageController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js'; 

const router = express.Router();

// 1. ഫയലുകൾ / ഓഡിയോ അപ്‌ലോഡ് ചെയ്യാനുള്ള റൂട്ട്
router.post('/upload', protect, upload.single('file'), uploadFile);

// 2. യൂസറുടെ ചാറ്റ് ലിസ്റ്റ് എടുക്കാനുള്ള റൂട്ട്
router.get('/conversations', protect, getConversations); 

// 3. പുതിയ മെസ്സേജ് അയക്കാനുള്ള റൂട്ട്
router.post('/', protect, sendMessage);

// 4. ഡൈനാമിക് റൂട്ടുകൾ (Dynamic Paths)
router.get('/:otherUserId', protect, getMessages); 
router.put('/:otherUserId/read', protect, markMessagesAsRead); 

// 5. മെസ്സേജ് എഡിറ്റ് ചെയ്യാനും ഡിലീറ്റ് ചെയ്യാനുമുള്ള റൂട്ടുകൾ
router.put('/:id', protect, editMessage);         // PUT /api/messages/:id
router.delete('/:id', protect, deleteMessage);    // DELETE /api/messages/:id

export default router;