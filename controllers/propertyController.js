import Property from '../models/Property.js';

// @desc    Create a new property request
// @route   POST /api/properties
// @access  Private
export const createProperty = async (req, res) => {
  try {
    const { 
      title, location, price, type, bedrooms,
      bathrooms, houseImage, description, rooms, amenities
    } = req.body;

    // ഇൻപുട്ട് വാലിഡേഷൻ
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
// @access  Public (approved) / Private (pending listings accessible by Owner/Admin)
export const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    // MongoDB ID വാലിഡേഷൻ
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid Property ID format.' });
    }

    const property = await Property.findById(id).populate('owner', 'name email phone');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const ownerId = property.owner?._id || property.owner;

    // യൂസർ ലോഗിൻ ചെയ്തിട്ടുണ്ടെങ്കിൽ മാത്രം ഓണർ/അഡ്മിൻ ചെക്കുകൾ നടത്തുന്നു
    const isOwner = req.user && ownerId && ownerId.toString() === req.user._id.toString();
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role?.toLowerCase() === 'admin');

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
    const isOwner = property.owner.toString() === req.user._id.toString();
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