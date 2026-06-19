import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  phone: { 
    type: String, 
    required: false,
    default: ''
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    required: true, 
    default: 'owner' 
  }
}, { timestamps: true });

// 💡 Password Hashing Middleware (next ഒഴിവാക്കി)
userSchema.pre('save', async function () {
  // പാസ്‌വേഡ് മാറിയിട്ടില്ലെങ്കിൽ ഈ ഫങ്ക്ഷനിൽ നിന്ന് പുറത്തുകടക്കുക (return മാത്രം മതി)
  if (!this.isModified('password')) {
    return;
  }

  // പാസ്‌വേഡ് ഹാഷ് ചെയ്യുന്നു (async ആയതുകൊണ്ട് ഇത് കഴിയുമ്പോൾ തനിയെ സേവ് ആയിക്കോളും)
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 💡 പാസ്‌വേഡ് മാച്ച് ചെയ്യാനുള്ള മെത്തേഡ്
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;