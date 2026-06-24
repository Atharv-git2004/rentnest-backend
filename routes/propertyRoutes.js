import express from 'express';
import { 
    createProperty, 
    getLiveProperties, 
    getOwnerProperties, // 💡 ഇത് getOwnerProperties എന്നാക്കി മാറ്റി
    getPropertyById, 
    getAdminPendingQueue, 
    verifyPropertyListing, 
    deleteProperty 
} from '../controllers/propertyController.js';
import { protect, admin, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 🌐 Public Route: ഹോം പേജിൽ അപ്രൂവ്ഡ് ആയ ലൈവ് പ്രോപ്പർട്ടികൾ കാണാൻ
router.get('/', getLiveProperties);

// 🔒 Private Route: ലോഗിൻ ചെയ്ത ഓണർക്ക് സ്വന്തം ലിസ്റ്റിംഗുകൾ മാത്രം കാണാൻ
// 💡 തിരുത്തിയത്: ഫ്രണ്ട്‌എൻഡിൽ നിന്ന് വിളിക്കുന്ന അതേ പേര് ('/owner') തന്നെ ഇവിടെ നൽകി
router.get('/owner', protect, getOwnerProperties);

// 🔒 Private Route: പുതിയ പ്രോപ്പർട്ടി ലിസ്റ്റിംഗ് ആഡ് ചെയ്യാൻ
router.post('/', protect, createProperty);

// 👑 Admin Route: അഡ്മിന് മാത്രം പെൻഡിംഗ് റിക്വസ്റ്റുകൾ കാണാൻ
// (💡 ശ്രദ്ധിക്കുക: ഈ റൂട്ടും /:id-ക്ക് മുകളിൽ തന്നെ കിടക്കണം)
router.get('/admin/pending', protect, admin, getAdminPendingQueue);

// 👑 Admin Route: അഡ്മിന് ലിസ്റ്റിംഗ് Approve ചെയ്യാനോ Reject ചെയ്യാനോ
router.put('/admin/verify/:id', protect, admin, verifyPropertyListing);

// 🔍 Single Property Route: പ്രോപ്പർട്ടി ഡീറ്റെയിൽസ് കാണാൻ (ലോഗിൻ ചെയ്യാത്തവർക്കും കാണാം)
router.get('/:id', optionalProtect, getPropertyById);

// 🔒 Private Route: സ്വന്തം പ്രോപ്പർട്ടി ഓണർക്കോ അല്ലെങ്കിൽ അഡ്മിനോ ഡിലീറ്റ് ചെയ്യാൻ
router.delete('/:id', protect, deleteProperty);

export default router;