import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  text: {
    type: String,
    default: '' // 💡 ശ്രദ്ധിക്കുക: 'required: true' മാറ്റി 'default' ആക്കി
  },
  // മെസ്സേജ് സ്റ്റാറ്റസ്
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },

  // 📞 NEW: കോൾ ലോഗുകൾ ട്രാക്ക് ചെയ്യാനുള്ള ഫീൽഡുകൾ
  messageType: { 
    type: String, 
    enum: ['text', 'call'], 
    default: 'text' 
  },
  callDetails: {
    callType: { type: String, enum: ['audio', 'video'] },
    status: { type: String, enum: ['missed', 'completed', 'rejected', 'busy'] },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number } // ഇൻ സെക്കൻഡ്സ് (Seconds)
  }

}, { timestamps: true });

export default mongoose.model('Message', messageSchema);