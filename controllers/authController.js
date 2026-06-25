import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library'; 

// Google OAuth Client ഇൻഷിയലൈസ് ചെയ്യുന്നു
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// JWT ടോക്കൺ ജനറേറ്റ് ചെയ്യുന്ന ഫങ്ഷൻ
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { 
    expiresIn: '30d' 
  });
};

// @desc    Register new user
// @route   POST /api/users/register
// @access  Public
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
      phone: phone || ''     
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar, // 💡 ഇവിടെയും അバター ഉൾപ്പെടുത്തി
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
// @route   POST /api/users/login
// @access  Public
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
        avatar: user.avatar, // 💡 നോർമൽ ലോഗിൻ ചെയ്യുമ്പോഴും ഫ്രണ്ട്-എൻഡിലേക്ക് അവതാർ അയക്കുന്നു
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
// @route   POST /api/users/google
// @access  Public
export const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    // 1. ഫ്രണ്ട്-എൻഡിൽ നിന്ന് വന്ന ഗൂഗിൾ ടോക്കൺ വെരിഫൈ ചെയ്യുന്നു
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture } = payload; // 💡 ഗൂഗിളിൽ നിന്നുള്ള 'picture' കൂടി ഇവിടെ എടുക്കുന്നു

    // 2. ഈ ഇമെയിലുള്ള യൂസർ ഡാറ്റാബേസിൽ നിലവിലുണ്ടോ എന്ന് പരിശോധിക്കുന്നു
    let user = await User.findOne({ email });

    if (!user) {
      // യൂസർ ഇല്ലെങ്കിൽ ഗൂഗിൾ വിവരങ്ങളും പ്രൊഫൈൽ ചിത്രവും വെച്ച് പുതിയൊരു അക്കൗണ്ട് ക്രിയേറ്റ് ചെയ്യുന്നു
      user = await User.create({
        name: name,
        email: email,
        password: Math.random().toString(36).slice(-8), 
        role: 'owner', 
        phone: '',
        avatar: picture || '' // 💡 പുതിയ യൂസറാണെങ്കിൽ ഗൂഗിൾ പിക്ചർ ഡാറ്റാബേസിൽ സേവ് ചെയ്യുന്നു
      });
    } else if (!user.avatar && picture) {
      // നിലവിലുള്ള യൂസർ ആണെങ്കിലും ഡാറ്റാബേസിൽ ഫോട്ടോ ഇല്ലെങ്കിൽ പുതിയ ഫോട്ടോ അപ്ഡേറ്റ് ചെയ്യും
      user.avatar = picture;
      await user.save();
    }

    // 3. ഫ്രണ്ട്-എൻഡിലേക്ക് അവതാർ ഉൾപ്പെടെയുള്ള വിവരങ്ങൾ തിരികെ അയക്കുന്നു
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || picture, // 💡 ഫ്രണ്ട്-എൻഡിലേക്ക് പ്രൊഫൈൽ ലിങ്ക് അയക്കുന്നു
      token: generateToken(user._id),
    });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({ message: 'Google login failed', error: error.message });
  }
};