import express from 'express';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// 💾 Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // ഫയലുകൾ ബാക്ക്-എൻഡിലെ uploads/ ഫോൾഡറിലേക്ക് പോകും
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// File filter to ensure only images are allowed
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ storage, fileFilter });

// 🚀 POST: /api/upload
router.post('/', upload.single('image'), (req, res) => {
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
});

export default router;