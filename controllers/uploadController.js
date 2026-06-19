// 🚀 ഇമേജ് അപ്‌ലോഡ് ലോജിക് കൺട്രോളറിലേക്ക് മാറ്റുന്നു
export const uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // ഫ്രണ്ട്-എൻഡിലേക്ക് തിരിച്ചു നൽകുന്ന Image URL
    const imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    
    res.status(200).json({ 
      success: true, 
      url: imageUrl 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};