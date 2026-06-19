import mongoose from 'mongoose';

// 🔄 ഫ്രണ്ട്-എൻഡിൽ നിന്ന് വരുന്ന റൂമുകളുടെ അറേ സേവ് ചെയ്യാനുള്ള സബ്-ഷീമ
const roomDetailSchema = new mongoose.Schema({
  roomType: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    required: [true, 'Please add a room image URL'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, { _id: false });

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a property title'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Please add the location'],
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Please add the monthly rent price']
  },
  type: {
    type: String,
    enum: ['Apartment', 'Villa', 'Independent House', 'Studio'],
    default: 'Apartment'
  },
  bedrooms: {
    type: Number,
    required: [true, 'Please add the number of bedrooms']
  },
  bathrooms: {
    type: Number,
    required: [true, 'Please add the number of bathrooms']
  },
  houseImage: {
    type: String,
    required: [true, 'Please add the main house image URL'],
    default: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=500&q=80'
  },
  description: {
    type: String,
    required: [true, 'Please add a short description'],
    trim: true
  },
  
  // 🏠 💡 ഫ്രണ്ട്-എൻഡിലെ ഡയനാമിക് റൂം സെക്ഷനുകൾ (Living Room, Kitchen etc.) ഇവിടെ കൃത്യമായി സേവ് ചെയ്യപ്പെടും
  rooms: {
    type: [roomDetailSchema],
    default: []
  },

  amenities: {
    type: [String], 
    default: []
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending' 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🔄 BACKWARD COMPATIBILITY VIRTUALS: 
// ആപ്പിലെ മറ്റേതെങ്കിലും പഴയ ഫ്രണ്ട്-എൻഡ് പേജുകൾ 'image' അല്ലെങ്കിൽ 'bhk' എന്ന് വിളിച്ചാൽ കോഡ് ബ്രേക്ക് ആകാതിരിക്കാൻ
propertySchema.virtual('image').get(function () {
  return this.houseImage;
});

propertySchema.virtual('bhk').get(function () {
  return this.bedrooms;
});

const Property = mongoose.model('Property', propertySchema);
export default Property;