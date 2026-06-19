import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 1. ലോഗിൻ ചെയ്തവർക്ക് മാത്രം അനുവാദം നൽകുന്ന മിഡിൽവെയർ
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// 2. അഡ്മിന് മാത്രം അനുവാദം നൽകുന്ന മിഡിൽവെയർ
export const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

// 3. ഓപ്ഷണൽ മിഡിൽവെയർ (ലോഗിൻ ചെയ്യാത്തവർക്കും ഉപയോഗിക്കാം)
export const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      console.error('Optional token verification failed');
    }
  }
  next();
};