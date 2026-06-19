import express from 'express';
// authController-ൽ നിന്നും googleLogin കൂടി ഇംപോർട്ട് ചെയ്യുന്നു
import { registerUser, loginUser, googleLogin } from '../controllers/authController.js'; 

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// 💡 ഗൂഗിൾ ലോഗിനായി പുതിയ റൂട്ട് ചേർക്കുന്നു
router.post('/google', googleLogin); 

export default router;