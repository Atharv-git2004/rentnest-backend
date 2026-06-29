import express from 'express';
import { 
    registerUser, 
    loginUser, 
    googleLogin, 
    toggleWishlist, 
    getWishlist 
} from '../controllers/authController.js'; 

import { protect } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// Auth Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin); 

// Wishlist Routes (Protect middleware നിർബന്ധമാണ്)
router.post('/wishlist/toggle', protect, toggleWishlist);
router.get('/wishlist', protect, getWishlist);

export default router;