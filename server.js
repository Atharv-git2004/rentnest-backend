// server.js

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url'; // 💡 Fix 1: Imported for ES Module compatibility
import { createServer } from 'http'; 
import { Server } from 'socket.io'; 
import fs from 'fs'; 

import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import messageRoutes from './routes/messageRoutes.js'; 

dotenv.config();

const app = express();
const httpServer = createServer(app); 

const allowedOrigins = [
  "http://localhost:5173", 
  "http://127.0.0.1:5173",
  "https://rentnest-xi.vercel.app",
  "https://rentnest-efshjnp3b-atharv2.vercel.app"
];

// Socket.io Setup
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 💡 Fix 1: The standard way to get __dirname in an ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 💡 Fix 2: Setting Cross-Origin Headers so audio/video can play properly in the browser!
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Accept-Ranges', 'bytes'); // Mandatory for audio seeking (Forward/Rewind)
  }
}));

// Routes
app.use('/api/users', authRoutes); 
app.use('/api/properties', propertyRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes); 

// SOCKET.IO CONNECTION
io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  
  if (userId && userId !== "undefined" && userId !== "null") {
    socket.join(userId); 
    console.log(`✅ User connected & joined room: ${userId}`);
  }

  socket.on('send-message', (data) => {
    try {
      const receiverId = data?.receiverId?._id ? data.receiverId._id.toString() : data?.receiverId?.toString();
      if (receiverId) {
        socket.to(receiverId).emit('receive-message', data);
      }
    } catch (error) {
      console.error("❌ Socket Send Message Error:", error);
    }
  });

  socket.on('mark-messages-read', ({ senderId, receiverId }) => {
    socket.to(senderId).emit('messages-read', { readerId: receiverId });
  });

  socket.on('typing', ({ senderId, receiverId }) => {
    socket.to(receiverId).emit('typing', { senderId });
  });

  socket.on('stop-typing', ({ senderId, receiverId }) => {
    socket.to(receiverId).emit('stop-typing', { senderId });
  });

  socket.on("call-user", (data) => {
    io.to(data.userToCall).emit("incoming-call", { 
      signal: data.signalData, 
      from: data.from,
      callType: data.callType 
    });
  });

  socket.on("accept-call", (data) => {
    io.to(data.to).emit("call-accepted", data.signal);
  });

  socket.on("end-call", (data) => {
    io.to(data.to).emit("call-ended");
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${userId}`);
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