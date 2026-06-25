import express from 'express';
import { createComplaint, getAllComplaints, updateComplaintStatus } from '../controllers/complaintController.js';
import { protect } from '../middleware/authMiddleware.js'; // ഓതന്റിക്കേഷൻ നിർബന്ധമാണ്

const router = express.Router();

router.post('/', protect, createComplaint);        // യൂസർ പരാതി നൽകുന്നു
router.get('/', protect, getAllComplaints);      // അഡ്മിൻ കാണുന്നു
router.put('/:id', protect, updateComplaintStatus); // അഡ്മിൻ മറുപടി നൽകുന്നു

export default router;