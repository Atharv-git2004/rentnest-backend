// controllers/messageController.js

import Message from '../models/Message.js';
import User from '../models/User.js';

// @desc    Upload file (Image/Audio)
// 🆕 ഈ ഫംഗ്‌ഷൻ ആണ് മൾട്ടർ (Multer) വഴി വരുന്ന ഫയൽ കൈകാര്യം ചെയ്യുന്നത്
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // നിങ്ങൾ Cloudinary ഉപയോഗിക്കുന്നുണ്ടെങ്കിൽ ഇവിടുത്തെ ലോജിക് മാറ്റേണ്ടി വരും. 
    // ഇപ്പോൾ ഫയൽ ലോക്കൽ ആയി '/uploads' ഫോൾഡറിലേക്കാണ് സേവ് ആകുന്നത്.
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.status(200).json({ 
      success: true, 
      message: 'File uploaded successfully', 
      fileUrl 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send a new message or call log
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, propertyId, text, messageType, callDetails, fileUrl } = req.body;
    
    const senderId = req.user?._id || req.user?.id;

    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. User ID missing.' });
    }

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required.' });
    }

    // ടെക്സ്റ്റ്, ഇമേജ് അല്ലെങ്കിൽ ഓഡിയോ അല്ലാത്ത കേസിൽ വാലിഡേഷൻ
    if (messageType === 'text' && (!text || text.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Text is required for text messages.' });
    }

    const newMessage = new Message({ 
      senderId, 
      receiverId, 
      propertyId, 
      text: text || '',
      fileUrl: fileUrl || '', // ഫയൽ ലിങ്ക് ഉണ്ടെങ്കിൽ സേവ് ചെയ്യുന്നു
      status: 'sent',
      messageType: messageType || 'text',
      callDetails: messageType === 'call' ? callDetails : undefined
    });
    
    await defaultModel.save.call(newMessage); // Using default save

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get chat history and mark as 'read'
export const getMessages = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark specific messages as read
export const markMessagesAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user?._id || req.user?.id;

    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get conversation list
export const getConversations = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ createdAt: -1 });

    const conversationUsersIds = new Set();
    const lastMessagesMap = new Map();

    messages.forEach(msg => {
      const otherUserId = msg.senderId.toString() === userId.toString() 
        ? msg.receiverId.toString() 
        : msg.senderId.toString();
      
      if (otherUserId !== userId.toString()) {
        conversationUsersIds.add(otherUserId);
        if (!lastMessagesMap.has(otherUserId)) {
          lastMessagesMap.set(otherUserId, msg);
        }
      }
    });

    const users = await User.find({ 
      _id: { $in: Array.from(conversationUsersIds) } 
    }).select('name role');

    const data = await Promise.all(users.map(async (u) => {
      const lastMsg = lastMessagesMap.get(u._id.toString());
      
      let displayMessage = '';
      if (lastMsg) {
        if (lastMsg.messageType === 'call') {
          displayMessage = lastMsg.callDetails?.callType === 'video' ? '📹 Video Call' : '📞 Audio Call';
        } else if (lastMsg.messageType === 'image') {
          displayMessage = '📷 Image';
        } else if (lastMsg.messageType === 'audio') {
          displayMessage = '🎙️ Audio Message';
        } else {
          displayMessage = lastMsg.text;
        }
      }

      const unreadCount = await Message.countDocuments({
        senderId: u._id,
        receiverId: userId,
        status: { $ne: 'read' }
      });

      return {
        _id: u._id,
        name: u.name,
        role: u.role,
        lastMessage: displayMessage,
        createdAt: lastMsg ? lastMsg.createdAt : null,
        status: lastMsg ? lastMsg.status : 'read',
        unreadCount: unreadCount 
      };
    }));

    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};