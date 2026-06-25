import Complaint from '../models/Complaint.js';

// 1. പുതിയ പരാതി നൽകാൻ (User)
export const createComplaint = async (req, res) => {
  try {
    // ഫ്രണ്ട്-എൻഡിൽ നിന്ന് 'title' എന്നോ 'subject' എന്നോ വന്നാലും അത് എടുക്കാൻ
    const { subject, title, description } = req.body;
    const complaintSubject = subject || title;

    // യൂസർ ലോഗിൻ ചെയ്തിട്ടുണ്ടോ എന്ന് ഉറപ്പുവരുത്താൻ (ഇല്ലെങ്കിൽ 500 error വരാതിരിക്കാൻ)
    if (!req.user || !req.user.id) {
      console.warn("⚠️ Complaint Creation Failed: User ID is missing. Is Auth Middleware applied?");
      return res.status(401).json({ success: false, message: "User not authenticated. Please log in again." });
    }

    const complaint = await Complaint.create({ 
      user: req.user.id, 
      subject: complaintSubject, 
      description 
    });

    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    console.error("❌ Error in createComplaint:", error); // ഈ ലൈൻ എറർ എന്താണെന്ന് ടെർമിനലിൽ കാണിക്കും
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. എല്ലാ പരാതികളും കാണാൻ (Admin)
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find().populate('user', 'name email').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: complaints });
  } catch (error) {
    console.error("❌ Error in getAllComplaints:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. പരാതി തീർപ്പാക്കാൻ (Admin)
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id, 
      { status, adminResponse }, 
      { new: true }
    );
    res.status(200).json({ success: true, data: complaint });
  } catch (error) {
    console.error("❌ Error in updateComplaintStatus:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};