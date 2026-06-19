import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { createServer } from 'http'; 
import { Server } from 'socket.io'; 

import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import messageRoutes from './routes/messageRoutes.js'; 

dotenv.config();

const app = express();
const httpServer = createServer(app); 

// 💡 നിങ്ങളുടെ ഫ്രണ്ട്എൻഡ് ലിങ്കുകൾ ഇവിടെ നൽകുക
const allowedOrigins = [
  "http://localhost:5173", 
  "http://127.0.0.1:5173",
  "https://your-frontend-link.vercel.app" // 👈 ഇവിടെ നിങ്ങളുടെ യഥാർത്ഥ Vercel/Netlify ലിങ്ക് കൊടുക്കുക
];

// Socket.io സജ്ജീകരണം
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const __dirname = path.resolve();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/users', authRoutes); 
app.use('/api/properties', propertyRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes); 

// --- ഒരൊറ്റ SOCKET.IO CONNECTION ---
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  console.log(`🔌 New connection attempt. UserID from client: ${userId}`);

  if (userId && userId !== "undefined" && userId !== "null") {
    socket.join(userId); 
    console.log(`✅ User joined room: ${userId}`);
  } else {
    console.log("⚠️ Guest connection (No UserID provided)");
  }

  // ==========================================
  // 1. CHAT LOGIC (മെസ്സേജുകൾക്കായി)
  // ==========================================
  
  socket.on('send-message', (data) => {
    const receiverId = (data.receiverId?._id || data.receiverId || '').toString();
    const senderId = (data.senderId?._id || data.senderId || '').toString();
    const text = data.text;

    console.log(`📩 Message from ${senderId} to ${receiverId}: ${text}`);

    io.to(receiverId).emit('receive-message', data);
    io.to(senderId).emit('receive-message', data);
  });

  socket.on('mark-messages-read', ({ senderId, receiverId }) => {
    io.to(senderId).emit('messages-read', { readerId: receiverId });
  });

  socket.on('typing', ({ senderId, receiverId }) => {
    io.to(receiverId).emit('typing', { senderId });
  });

  socket.on('stop-typing', ({ senderId, receiverId }) => {
    io.to(receiverId).emit('stop-typing', { senderId });
  });

  // ==========================================
  // 2. VIDEO/AUDIO CALL LOGIC (WebRTC - Simple Peer)
  // ==========================================

  socket.on("call-user", (data) => {
    console.log(`📞 Call signal from ${data.from} to ${data.userToCall}`);
    io.to(data.userToCall).emit("incoming-call", { 
      signal: data.signalData, 
      from: data.from 
    });
  });

  socket.on("accept-call", (data) => {
    console.log(`✅ Call accepted by someone, sending signal back to ${data.to}`);
    io.to(data.to).emit("call-accepted", data.signal);
  });

  socket.on("end-call", (data) => {
    console.log(`❌ Call ended for ${data.to}`);
    io.to(data.to).emit("call-ended");
  });

  // ==========================================
  // DISCONNECT LOGIC
  // ==========================================
  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// --- MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✓ MongoDB Connected Successfully"))
  .catch((err) => console.error("MongoDB Error:", err));

app.get('/', (req, res) => res.send('RentNest API is running...'));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});