import Complaint from '../models/Complaint.js';

// 1. പുതിയ പരാതി നൽകാൻ (User)
export const createComplaint = async (req, res) => {
  try {
    const { subject, description } = req.body;
    const complaint = await Complaint.create({ user: req.user.id, subject, description });
    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. എല്ലാ പരാതികളും കാണാൻ (Admin)
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. പരാതി തീർപ്പാക്കാൻ (Admin)
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status, adminResponse }, { new: true });
    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};