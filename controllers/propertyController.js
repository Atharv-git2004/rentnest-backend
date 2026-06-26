import Property from '../models/Property.js';
import jwt from 'jsonwebtoken'; // 💡 പുതിയതായി ചേർത്തത് (ടോക്കൺ ഡീകോഡ് ചെയ്യാൻ)
import User from '../models/User.js'; // 💡 പുതിയതായി ചേർത്തത് (യൂസറെ ഡാറ്റാബേസിൽ തിരയാൻ)

// @desc    Create a new property request
// @route   POST /api/properties
// @access  Private
export const createProperty = async (req, res) => {
  try {
    const { 
      title, location, price, type, bedrooms,
      bathrooms, houseImage, description, rooms, amenities
    } = req.body;

    if (!title || !location || !price) {
      return res.status(400).json({ success: false, message: 'Title, location, and price are required.' });
    }

    const property = new Property({
      title,
      location,
      price: Number(price),
      type: type || 'Apartment',
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      houseImage, 
      description,
      rooms: rooms || [], 
      amenities: amenities || [],
      owner: req.user._id,
      status: 'pending' 
    });

    const savedProperty = await property.save();
    res.status(201).json({
      success: true,
      message: 'Property listing submitted successfully. Waiting for Admin Approval.',
      data: savedProperty
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all approved listings for home page
// @route   GET /api/properties
// @access  Public
export const getLiveProperties = async (req, res) => {
  try {
    const properties = await Property.find({ status: 'approved' })
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      count: properties.length, 
      data: properties 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get listings owned by the logged-in user (Owner Dashboard)
// @route   GET /api/properties/owner
// @access  Private
export const getOwnerProperties = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: properties 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single property by ID
// @route   GET /api/properties/:id
// @access  Public / Private
export const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid Property ID format.' });
    }

    const property = await Property.findById(id).populate('owner', 'name email phone');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    // 💡 സൂപ്പർ ഫിക്സ്: മിഡിൽവെയർ വഴി req.user വന്നില്ലെങ്കിൽ ഹെഡറിലെ ടോക്കൺ വെച്ച് ആളെ സ്വയം തിരിച്ചറിയുന്നു
    let loggedInUser = req.user;

    if (!loggedInUser && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        loggedInUser = await User.findById(decoded.id).select('-password');
      } catch (err) {
        // ടോക്കൺ തെറ്റാണെങ്കിൽ അവരെ സാധാരണ പബ്ലിക് വിസിറ്റർ ആയി മാത്രം കണക്കാക്കും
      }
    }

    const ownerId = property.owner?._id || property.owner;

    const isOwner = loggedInUser && ownerId && ownerId.toString() === loggedInUser._id.toString();
    const isAdmin = loggedInUser && (loggedInUser.role === 'admin' || loggedInUser.role?.toLowerCase() === 'admin');

    // അപ്രൂവ്ഡ് അല്ലെങ്കിൽ Owner/Admin അല്ലാതെ മറ്റാർക്കും കൊടുക്കില്ല
    if (property.status !== 'approved' && !isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. This property is pending approval.' 
      });
    }

    res.status(200).json({
      success: true,
      data: property
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all pending requests (Admin Only)
// @route   GET /api/properties/admin/pending
// @access  Private (Admin)
export const getAdminPendingQueue = async (req, res) => {
  try {
    const pendingRequests = await Property.find({ status: 'pending' })
      .populate('owner', 'name email')
      .sort({ createdAt: 1 });

    res.status(200).json({ 
      success: true, 
      count: pendingRequests.length, 
      data: pendingRequests 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update status (Admin Only)
// @route   PUT /api/properties/admin/verify/:id
// @access  Private (Admin)
export const verifyPropertyListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; 

    if (!['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Use approved or rejected.' });
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      id,
      { status: action },
      { new: true, runValidators: true }
    ).populate('owner', 'name email');

    if (!updatedProperty) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    res.status(200).json({
      success: true,
      message: `Status updated successfully to: ${action}`,
      data: updatedProperty
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update/Edit Property (Owner Only)
// @route   PUT /api/properties/:id
// @access  Private
export const updateProperty = async (req, res) => {
  try {
    let property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    if (!property.owner || property.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Unauthorized access. Only the owner can edit this.' });
    }

    // 💡 സുരക്ഷാ ഫിക്സ്: ഫോമിൽ നിന്നും തെറ്റായി _id യോ owner ഐഡിയോ വന്നാൽ അത് ഒഴിവാക്കുന്നു
    const { _id, owner, createdAt, ...updateData } = req.body;

    property = await Property.findByIdAndUpdate(
      req.params.id,
      {
        ...updateData,
        status: 'pending' // എഡിറ്റ് ചെയ്താൽ വീണ്ടും അഡ്മിൻ അപ്രൂവൽ വേണം
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Property updated successfully. Wait for admin approval.',
      data: property
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private
export const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    const isOwner = property.owner && property.owner.toString() === req.user._id.toString();
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(401).json({ success: false, message: 'Unauthorized. You cannot delete this property.' });
    }

    await property.deleteOne();
    res.status(200).json({ success: true, message: 'Property removed successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};