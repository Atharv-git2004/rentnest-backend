// middleware/uploadMiddleware.js

import multer from 'multer';
import fs from 'fs';
import path from 'path';

// 1. ഫയലുകൾ സേവ് ചെയ്യാൻ ഒരു 'uploads' ഫോൾഡർ ഉണ്ടാക്കുന്നു (ഇല്ലെങ്കിൽ മാത്രം)
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. diskStorage ഉപയോഗിച്ച് ഫയൽ സെർവറിലേക്ക് സേവ് ചെയ്യുന്നു
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // ഫയലുകൾ സേവ് ചെയ്യേണ്ട ഫോൾഡർ
  },
  filename: (req, file, cb) => {
    // ഒരേ പേരിലുള്ള ഫയലുകൾ വരാതിരിക്കാൻ പേരിൻ്റെ കൂടെ സമയം (Date.now) ചേർക്കുന്നു
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // ഫയലിൻ്റെ എക്സ്റ്റൻഷൻ (ഉദാ: .mp3, .webm) നിലനിർത്താൻ
    cb(null, uniqueSuffix + path.extname(file.originalname)); 
  }
});

// 3. Multer സെറ്റപ്പ്
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB ആണ് പരമാവധി സൈസ്
  fileFilter: (req, file, cb) => {
    // ഇമേജ്, ഓഡിയോ, വീഡിയോ ഫയലുകൾ മാത്രം അനുവദിക്കുന്നു
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images, videos, and audio files are allowed!'), false);
    }
  }
});

export default upload;