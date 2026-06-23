import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// @desc    Upload file (Image/Audio/PDF)
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    // Cloudinary path or Local fallback
    const fileUrl = req.file.path || `/uploads/${req.file.filename}`;
    
    return res.status(200).json({ 
      success: true, 
      message: 'File uploaded successfully', 
      fileUrl 
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return res.status(500).json({ success: false, message: 'File upload failed: ' + error.message });
  }
};

// @desc    Send a new message or call log
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, propertyId, text, messageType, callDetails, fileUrl, audioDuration } = req.body;
    const senderId = req.user?._id || req.user?.id;

    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. User ID missing.' });
    }

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID is required.' });
    }

    if (messageType === 'text' && (!text || text.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Cannot send an empty text message.' });
    }

    const newMessage = new Message({ 
      senderId, 
      receiverId, 
      propertyId: propertyId || undefined, 
      text: text ? text.trim() : '',
      fileUrl: fileUrl || '', 
      audioDuration: messageType === 'audio' ? Number(audioDuration) : undefined, 
      status: 'sent',
      messageType: messageType || 'text',
      callDetails: (messageType === 'call' || messageType === 'call_log') ? {
        callType: callDetails?.callType || 'video',
        duration: Number(callDetails?.duration) || 0,
        status: callDetails?.status || 'missed'
      } : undefined
    });
    
    await newMessage.save(); 

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name role profilePic image')
      .populate('receiverId', 'name role profilePic image')
      .lean();

    return res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    console.error("❌ Error in sendMessage:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🆕 @desc    Edit an existing message with Real-time Socket Support
export const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    // സ്വന്തം മെസ്സേജ് മാത്രമേ എഡിറ്റ് ചെയ്യാൻ പാടുള്ളൂ എന്ന് ഉറപ്പാക്കുന്നു
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only edit your own messages.' });
    }

    // ഡിലീറ്റ് ചെയ്ത മെസ്സേജ് എഡിറ്റ് ചെയ്യാൻ അനുവദിക്കില്ല
    if (message.isDeleted) {
      return res.status(400).json({ success: false, message: 'Cannot edit a deleted message.' });
    }

    message.text = text.trim();
    message.isEdited = true;
    await message.save();

    const updatedMessage = await Message.findById(id)
      .populate('senderId', 'name role profilePic image')
      .populate('receiverId', 'name role profilePic image')
      .lean();

    // 🚀 PRO FIX: Socket.io വഴി റിയൽ-ടൈമിൽ മറ്റേയാൾക്ക് അപ്ഡേറ്റ് അയക്കുന്നു
    const io = req.app.get('io');
    if (io) {
      // Receiver-ന്റെ റൂമിലേക്ക് അയക്കുന്നു
      io.to(updatedMessage.receiverId._id.toString()).emit('receive-edit', updatedMessage);
      // Sender-ന്റെ ബാക്കി ഡിവൈസുകൾ ഉണ്ടെങ്കിൽ അവിടെയും അപ്ഡേറ്റ് ആകാൻ
      io.to(updatedMessage.senderId._id.toString()).emit('receive-edit', updatedMessage);
    }

    return res.status(200).json({ success: true, data: updatedMessage });
  } catch (error) {
    console.error("❌ Error in editMessage:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 🆕 @desc    Delete a message (Soft Delete) with Real-time Socket Support
export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    // സ്വന്തം മെസ്സേജ് മാത്രമേ ഡിലീറ്റ് ചെയ്യാൻ പാടുള്ളൂ എന്ന് ഉറപ്പാക്കുന്നു
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own messages.' });
    }

    // Soft delete ചെയ്യുന്നു (ഡാറ്റാബേസിൽ നിന്നും പൂർണ്ണമായി കളയാതെ ഫ്ലാഗ് വെക്കുന്നു)
    message.isDeleted = true;
    message.text = "This message was deleted"; 
    message.fileUrl = ""; // ഇമേജ് ആണെങ്കിൽ അത് ഹൈഡ് ചെയ്യാൻ
    await message.save();

    const deletedMessageData = {
      messageId: id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      text: message.text,
      isDeleted: true
    };

    // 🚀 PRO FIX: Socket.io വഴി റിയൽ-ടൈമിൽ മെസ്സേജ് ഡിലീറ്റ് ആയ വിവരം അയക്കുന്നു
    const io = req.app.get('io');
    if (io) {
      io.to(message.receiverId.toString()).emit('receive-delete', deletedMessageData);
      io.to(message.senderId.toString()).emit('receive-delete', deletedMessageData);
    }

    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    console.error("❌ Error in deleteMessage:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get chat history and mark as 'read'
export const getMessages = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { otherUserId } = req.params;

    if (!userId || !otherUserId) {
      return res.status(400).json({ success: false, message: 'Missing user parameters.' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('senderId', 'name role profilePic image')
    .populate('receiverId', 'name role profilePic image')
    .lean();

    Message.updateMany(
      { senderId: otherUserId, receiverId: userId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    ).catch(err => console.error("Async read update error:", err));

    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("❌ Error in getMessages:", error);
    return res.status(500).json({ success: false, message: error.message });
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

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get conversation list
export const getConversations = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ createdAt: -1 }).lean();

    const conversationUsersIds = new Set();
    const lastMessagesMap = new Map();

    messages.forEach(msg => {
      if (!msg.senderId || !msg.receiverId) return; 

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
    }).select('name role profilePic image').lean();

    const data = await Promise.all(users.map(async (u) => {
      const lastMsg = lastMessagesMap.get(u._id.toString());
      
      let displayMessage = '';
      if (lastMsg) {
        if (lastMsg.isDeleted) {
          displayMessage = '🚫 This message was deleted';
        } else if (lastMsg.messageType === 'call' || lastMsg.messageType === 'call_log') {
          displayMessage = lastMsg.callDetails?.callType === 'video' ? '📹 Video Call' : '📞 Audio Call';
        } else if (lastMsg.messageType === 'image') {
          displayMessage = '📷 Image';
        } else if (lastMsg.messageType === 'video') {
          displayMessage = '🎥 Video';
        } else if (lastMsg.messageType === 'audio') {
          displayMessage = '🎙️ Voice Message';
        } else if (lastMsg.messageType === 'pdf' || lastMsg.messageType === 'file') {
          displayMessage = '📄 Document';
        } else {
          displayMessage = lastMsg.text || '';
        }
      }

      const unreadCount = await Message.countDocuments({
        senderId: u._id,
        receiverId: userId,
        status: { $ne: 'read' }
      });

      return {
        _id: u._id,
        name: u.name || 'Unknown User',
        role: u.role,
        avatar: u.profilePic || u.image || '',
        lastMessage: displayMessage,
        createdAt: lastMsg ? lastMsg.createdAt : new Date(),
        status: lastMsg ? lastMsg.status : 'read',
        unreadCount
      };
    }));

    data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("❌ getConversations error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};