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
  },
  avatar: { // 💡 ഗൂഗിൾ പ്രൊഫൈൽ ചിത്രം സൂക്ഷിക്കാൻ പുതിയ ഫീൽഡ് ആഡ് ചെയ്തു
    type: String,
    default: ''
  }
}, { timestamps: true });

// 💡 Password Hashing Middleware
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 💡 പാസ്‌വേഡ് മാച്ച് ചെയ്യാനുള്ള മെത്തേഡ്
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;