import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url'; 
import { createServer } from 'http'; 
import { Server } from 'socket.io'; 
import fs from 'fs'; 

// 1. Routes Imports
import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import messageRoutes from './routes/messageRoutes.js'; 
import complaintRoutes from './routes/complaintRoutes.js'; 
import User from './models/User.js';

dotenv.config();

// 2. Initialize App and HTTP Server
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
  pingTimeout: 60000, 
  pingInterval: 25000
});

app.set('io', io);

// 3. Middlewares
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Robust JSON Body parser
app.use(express.json({ limit: '50mb', type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Accept-Ranges', 'bytes'); 
  }
}));

// =========================================================================
// 🐞 PRO API DEBUGGER: To view logs
// =========================================================================
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
    console.log(`\n--------------------------------------------------`);
    console.log(`📥 [API REQUEST] ${req.method} ${req.originalUrl}`);
    console.log(`🏷️  Headers Content-Type:`, req.headers['content-type']);
    if (Object.keys(req.body).length > 0) {
      console.log(`📦 Received Body Data:`, JSON.stringify(req.body, null, 2));
    }
    console.log(`--------------------------------------------------\n`);
  }
  next();
});

// JSON Syntax error catcher
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error("❌ Broken JSON syntax received from client:", err.message);
    return res.status(400).json({ success: false, message: "Malformed JSON data sent from client." });
  }
  next();
});

// 4. API Routes Configuration
app.use('/api/users', authRoutes); 
app.use('/api/properties', propertyRoutes); 
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes); 
app.use('/api/complaints', complaintRoutes); 

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

  // 📞 WEBRTC SECURE P2P SIGNALING
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

  socket.on("accept-call", (data) => {
    const callerToAnswer = cleanId(data?.to);
    if (!callerToAnswer) return;

    console.log(`✅ [Signaling] Call accepted, sending SDP Answer to: ${callerToAnswer}`);
    io.to(callerToAnswer).emit("call-accepted", { signal: data.signal });
  });

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

// 5. MONGODB CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✓ MongoDB Connected Successfully"))
  .catch((err) => console.error("MongoDB Error:", err));

app.get('/', (req, res) => res.send('RentNest API is running...'));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
});