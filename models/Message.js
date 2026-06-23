import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // 💡 ഒപ്റ്റിമൈസേഷൻ: ചാറ്റ് ഹിസ്റ്ററി വേഗത്തിൽ തിരയാൻ സഹായിക്കുന്നു
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // 💡 ഒപ്റ്റിമൈസേഷൻ: ചാറ്റ് ഹിസ്റ്ററി വേഗത്തിൽ തിരയാൻ സഹായിക്കുന്നു
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  text: {
    type: String,
    default: '' 
  },
  
  // ഇമേജ്, ഓഡിയോ ഫയലുകൾ സേവ് ചെയ്യാൻ
  fileUrl: {
    type: String, // ക്ലൗഡിനറി ലിങ്ക് അല്ലെങ്കിൽ ലോക്കൽ പാത്ത് സേവ് ചെയ്യാൻ
    default: ''
  },
  
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },

  messageType: { 
    type: String, 
    enum: ['text', 'call', 'image', 'audio', 'file'], 
    default: 'text' 
  },

  // 🆕 മെസ്സേജ് എഡിറ്റ് ചെയ്തിട്ടുണ്ടോ എന്ന് ട്രാക്ക് ചെയ്യാൻ
  isEdited: {
    type: Boolean,
    default: false
  },

  // 🆕 മെസ്സേജ് ഡിലീറ്റ് ചെയ്തിട്ടുണ്ടോ എന്ന് ട്രാക്ക് ചെയ്യാൻ (Soft Delete)
  isDeleted: {
    type: Boolean,
    default: false
  },

  // 📞 കോൾ ലോഗുകൾക്കും ഫയലുകൾക്കും വേണ്ടിയുള്ള ട്രാക്കിംഗ്
  callDetails: {
    callType: { type: String, enum: ['audio', 'video'] },
    status: { type: String, enum: ['missed', 'completed', 'rejected', 'busy'] },
    startTime: { type: Date },
    endTime: { type: Date },
    duration: { type: Number } // ഇൻ സെക്കൻഡ്സ് (Seconds)
  }

}, { timestamps: true });

// 💡 രണ്ട് ഉപയോക്താക്കൾ തമ്മിലുള്ള മെസ്സേജുകൾ വളരെ വേഗത്തിൽ ഫെച്ച് ചെയ്യാൻ Compound Index ചേർക്കുന്നു
messageSchema.index({ senderId: 1, receiverId: 1 });

export default mongoose.model('Message', messageSchema);