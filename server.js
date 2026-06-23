import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url'; 
import { createServer } from 'http'; 
import { Server } from 'socket.io'; 
import fs from 'fs'; 

import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import messageRoutes from './routes/messageRoutes.js'; 
import User from './models/User.js'; // 🚀 PRO FIX: വിളിക്കുന്ന ആളുടെ പേര് കണ്ടുപിടിക്കാൻ User മോഡൽ ഇമ്പോർട്ട് ചെയ്തു

dotenv.config();

const app = express();
const httpServer = createServer(app); 

const allowedOrigins = [
  "http://localhost:5173", 
  "http://127.0.0.1:5173",
  "https://rentnest-xi.vercel.app",
  "https://rentnest-efshjnp3b-atharv2.vercel.app"
];

// Socket.io Setup with optimized WebRTC timeouts
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000, // 💡 WebRTC SDP സിഗ്നൽ ജനറേറ്റ് ചെയ്യുമ്പോൾ കണക്ഷൻ ഡ്രോപ്പ് ആവാതിരിക്കാൻ
  pingInterval: 25000
});

// 🚀 PRO FIX: messageController-ൽ req.app.get('io') വർക്ക് ചെയ്യാൻ വേണ്ടി സോക്കറ്റ് ഇൻസ്റ്റൻസ് ഇവിടെ സെറ്റ് ചെയ്യുന്നു
app.set('io', io);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Accept-Ranges', 'bytes'); 
  }
}));

// Routes
app.use('/api/users', authRoutes); 
app.use('/api/properties', propertyRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes); 

// 🚀 PRO HELPER: Mongoose ObjectId ഒബ്‌ജക്റ്റുകളെ പക്കാ സ്ട്രിംഗ് ആക്കി മാറ്റാൻ
const cleanId = (id) => {
  if (!id) return null;
  return typeof id === 'object' ? (id._id?.toString() || id.id?.toString()) : id.toString().trim();
};

const activeUsers = new Map(); // userId -> socket.id

// ==========================================
// ⚡ SOCKET.IO REAL-TIME COMMUNICATION HUB
// ==========================================
io.on('connection', (socket) => {
  const rawUserId = socket.handshake.query.userId;
  const userId = cleanId(rawUserId);
  
  if (userId && userId !== "undefined" && userId !== "null") {
    // Ghost Socket Disconnection
    const existingSocketId = activeUsers.get(userId);
    if (existingSocketId && existingSocketId !== socket.id) {
      const existingSocket = io.sockets.sockets.get(existingSocketId);
      if (existingSocket) {
        existingSocket.disconnect(true);
      }
    }

    activeUsers.set(userId, socket.id);
    socket.join(userId); 
    console.log(`⚡ [Socket Hub] User Active: ${userId} (Socket: ${socket.id})`);
  }

  socket.on('send-message', (data) => {
    try {
      const receiverId = cleanId(data?.receiverId);
      if (receiverId) {
        socket.to(receiverId).emit('receive-message', data);
      }
    } catch (error) {
      console.error("Socket Send Message Error:", error);
    }
  });

  socket.on('mark-messages-read', ({ senderId, receiverId }) => {
    socket.to(cleanId(senderId)).emit('messages-read', { readerId: cleanId(receiverId) });
  });

  socket.on('typing', ({ senderId, receiverId }) => {
    socket.to(cleanId(receiverId)).emit('typing', { senderId: cleanId(senderId) });
  });

  socket.on('stop-typing', ({ senderId, receiverId }) => {
    socket.to(cleanId(receiverId)).emit('stop-typing', { senderId: cleanId(senderId) });
  });

  // ==========================================
  // 📞 WEBRTC SECURE P2P SIGNALING
  // ==========================================

  // 1. കോൾ വിളിക്കുമ്പോൾ (Call Initiated)
  socket.on("call-user", async (data) => {
    const targetUser = cleanId(data?.userToCall);
    const callerId = cleanId(data?.from);
    if (!targetUser || !callerId) return;

    console.log(`📞 [Signaling] Call requested: ${callerId} -> ${targetUser} (${data.callType})`);
    
    let resolvedCallerName = data.name || data.callerName;
    if (!resolvedCallerName || resolvedCallerName === "Unknown User") {
      try {
        const userDoc = await User.findById(callerId).select('name');
        if (userDoc) resolvedCallerName = userDoc.name;
      } catch (err) {
        console.error("Caller DB lookup error:", err.message);
      }
    }

    io.to(targetUser).emit("incoming-call", { 
      signal: data.signalData, 
      signalData: data.signalData, 
      from: callerId,
      callerName: resolvedCallerName || "User", 
      callType: data.callType || 'video'
    });
  });

  // 2. കോൾ എടുക്കുമ്പോൾ (Call Accepted)
  socket.on("accept-call", (data) => {
    const callerToAnswer = cleanId(data?.to);
    if (!callerToAnswer) return;

    console.log(`✅ [Signaling] Call accepted, sending SDP Answer to: ${callerToAnswer}`);
    
    io.to(callerToAnswer).emit("call-accepted", { signal: data.signal });
  });

  // 3. കോൾ കട്ടാക്കുമ്പോൾ (Call Hangup)
  socket.on("end-call", (data) => {
    const target = cleanId(data?.to);
    if (!target) return;

    console.log(`🚫 [Signaling] Hangup signal sent to: ${target}`);
    io.to(target).emit("call-ended");
  });

  socket.on('disconnect', () => {
    if (userId && activeUsers.get(userId) === socket.id) {
      activeUsers.delete(userId);
      console.log(`🔌 [Socket Hub] User Disconnected: ${userId}`);
    }
  });
});

// MONGODB CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✓ MongoDB Connected Successfully"))
  .catch((err) => console.error("MongoDB Error:", err));

app.get('/', (req, res) => res.send('RentNest API is running...'));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});