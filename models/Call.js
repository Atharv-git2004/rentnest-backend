import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'connected', 'missed', 'ended'],
    default: 'initiated'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // സെക്കൻഡിൽ
    default: 0
  }
}, {
  timestamps: true // createdAt, updatedAt എന്നിവ ഓട്ടോമാറ്റിക് ആയി ലഭിക്കും
});

// കോൾ ഹിസ്റ്ററി ക്വറികൾ വേഗത്തിലാക്കാൻ ഇൻഡക്സിംഗ് (Indexing)
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ receiver: 1, createdAt: -1 });

const Call = mongoose.model('Call', callSchema);

export default Call;