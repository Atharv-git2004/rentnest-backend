import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library'; 

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { 
    expiresIn: '30d' 
  });
};

// @desc    Register new user
export const registerUser = async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ 
      name, 
      email, 
      password, 
      role: role || 'owner', 
      phone: phone || '',
      wishlist: [] // പുതിയ യൂസർക്ക് വിഷ്‌ലിസ്റ്റ് അറേ ഉണ്ടാക്കുന്നു
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar, 
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error("Registration Error:", error); 
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
};

// @desc    Auth user & get token
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar, 
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
};

// @desc    Auth Google user & get token
export const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload; 

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name: name,
        email: email,
        password: Math.random().toString(36).slice(-8), 
        role: 'owner', 
        phone: '',
        avatar: picture || '',
        wishlist: [] 
      });
    } else if (!user.avatar && picture) {
      user.avatar = picture;
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || picture, 
      token: generateToken(user._id),
    });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ message: 'Google login failed', error: error.message });
  }
};

// ==========================================
// 💡 WISHLIST FUNCTIONS 
// ==========================================

// @desc    Toggle Wishlist (Add or Remove property)
export const toggleWishlist = async (req, res) => {
  try {
    const { propertyId } = req.body;
    
    if (!req.user || !req.user._id) {
       return res.status(401).json({ success: false, message: "Not authorized, user not found in request" });
    }

    const userId = req.user._id; 
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.wishlist) {
        user.wishlist = [];
    }

    // 💡 ഐഡികൾ കൃത്യമായി മാച്ച് ചെയ്യാൻ toString() ഉപയോഗിക്കുന്നു
    const isWishlisted = user.wishlist.some(id => id.toString() === propertyId.toString());

    if (isWishlisted) {
      // Remove from wishlist
      user.wishlist = user.wishlist.filter(id => id.toString() !== propertyId.toString());
    } else {
      // Add to wishlist
      user.wishlist.push(propertyId);
    }

    await user.save();
    res.status(200).json({ success: true, wishlist: user.wishlist });
  } catch (error) {
    console.error("Wishlist Toggle Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};

// @desc    Get User's Saved Wishlist
export const getWishlist = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ success: false, message: "Not authorized" });
    }

    const user = await User.findById(req.user._id).populate('wishlist');
    
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    // വിഷ്‌ലിസ്റ്റിൽ ചിലപ്പോൾ ഡിലീറ്റ് ആയിപ്പോയ പ്രോപ്പർട്ടികൾ (null) ഉണ്ടാകാം, അത് ഫിൽറ്റർ ചെയ്ത് മാറ്റുന്നു
    const validWishlist = (user.wishlist || []).filter(prop => prop !== null);
    
    res.status(200).json({ success: true, wishlist: validWishlist });
  } catch (error) {
    console.error("Get Wishlist Error:", error);
    res.status(500).json({ success: false, message: "Server Error", error: error.message });
  }
};