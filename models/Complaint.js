import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true }, // പരാതിയുടെ വിഷയം
  description: { type: String, required: true }, // വിശദാംശങ്ങൾ
  status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' },
  adminResponse: { type: String, default: '' } // അഡ്മിന്റെ മറുപടി
}, { timestamps: true });

export default mongoose.model('Complaint', complaintSchema);