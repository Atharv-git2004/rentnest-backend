import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import User from '../models/User.js'; 
import Property from '../models/Property.js'; 

// 💡 നിങ്ങളുടെ പ്രോജക്റ്റിൽ Inquiry മോഡൽ ഉണ്ടെങ്കിൽ മാത്രം ഇത് അൺകമന്റ് ചെയ്യുക:
// import Inquiry from '../models/Inquiry.js'; 

const router = express.Router();

// 1. ADMIN DASHBOARD STATISTICS
router.get('/dashboard-stats', protect, admin, async (req, res) => {
  try {
    const [userCount, propertyCount, pendingCount, approvedCount] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments(),
      Property.countDocuments({ status: 'pending' }),
      Property.countDocuments({ status: 'approved' })
    ]);

    res.status(200).json({
      success: true,
      totalUsers: userCount,
      totalProperties: propertyCount,
      pendingProperties: pendingCount,
      approvedProperties: approvedCount,
      data: {
        totalUsers: userCount,
        totalProperties: propertyCount,
        pendingProperties: pendingCount,
        approvedProperties: approvedCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});

// 2. GET ALL INQUIRIES
router.get('/inquiries', protect, admin, async (req, res) => {
  try {
    // Inquiry മോഡൽ ഉണ്ടെങ്കിൽ ഇവിടെ അൺകമന്റ് ചെയ്യുക
    // const inquiries = await Inquiry.find().populate('user', 'name email').sort({ createdAt: -1 });
    const inquiries = []; 
    res.status(200).json(inquiries);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
});

// 3. MANAGE USERS - GET ALL USERS
router.get('/users', protect, admin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// 4. MANAGE USERS - UPDATE STATUS
router.put('/users/:id/status', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.status = req.body.status;
    await user.save();
    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status" });
  }
});

// 5. MANAGE USERS - DELETE USER
router.delete('/users/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export default router;