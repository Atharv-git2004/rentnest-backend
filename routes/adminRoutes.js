import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import User from '../models/User.js'; 
import Property from '../models/Property.js'; 

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
    console.error("Dashboard stats error:", error);
    res.status(500).json({ success: false, message: "Server Error fetching stats", error: error.message });
  }
});

// 2. GET ALL USERS (Sorted by newest first)
router.get('/users', protect, admin, async (req, res) => {
  try {
    // ഏറ്റവും പുതിയ യൂസർമാർ ആദ്യം വരാൻ .sort({ createdAt: -1 }) നൽകി
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users list" });
  }
});

// 3. UPDATE USER STATUS (Active / Blocked)
router.put('/users/:id/status', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 🛡️ Pro Protection: അഡ്മിൻ സ്വന്തം അക്കൗണ്ട് ബ്ലോക്ക് ചെയ്യാതിരിക്കാൻ
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Super-Admin account cannot be blocked!" });
    }

    user.status = req.body.status;
    await user.save();
    res.status(200).json({ success: true, message: `User status changed to ${req.body.status}` });
  } catch (error) {
    console.error("Update status error:", error);
    res.status(500).json({ success: false, message: "Failed to update user status" });
  }
});

// 4. DELETE USER PERMANENTLY
router.delete('/users/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 🛡️ Pro Protection: അഡ്മിൻ സ്വന്തം അക്കൗണ്ട് ഡിലീറ്റ് ചെയ്യാതിരിക്കാൻ
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Action Denied: You cannot delete your own admin account." });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "User permanently deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Failed to delete user" });
  }
});

// 5. GET ALL INQUIRIES
router.get('/inquiries', protect, admin, async (req, res) => {
  try {
    const inquiries = []; 
    res.status(200).json(inquiries);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error fetching inquiries", error: error.message });
  }
});

export default router;