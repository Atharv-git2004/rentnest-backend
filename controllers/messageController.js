import Message from '../models/Message.js';
import User from '../models/User.js';

// @desc    Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, propertyId, text } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !text) {
      return res.status(400).json({ success: false, message: 'Receiver ID and text are required.' });
    }

    // status: 'sent' എന്ന് ഡിഫോൾട്ട് ആയി സേവ് ആകുന്നു
    const newMessage = new Message({ senderId, receiverId, propertyId, text, status: 'sent' });
    await newMessage.save();

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get chat history and mark as 'read'
export const getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    // 1. മെസ്സേജുകൾ എടുക്കുന്നു
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    // 2. ഈ യൂസർക്ക് വന്ന എല്ലാ 'sent' മെസ്സേജുകളും 'read' ആക്കുന്നു (Blue Tick Logic)
    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, status: { $ne: 'read' } },
      { $set: { status: 'read' } }
    );

    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark specific messages as read (Manual update if needed)
export const markMessagesAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user._id;

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
    const userId = req.user._id;

    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ createdAt: -1 });

    const conversationUsersIds = new Set();
    const lastMessagesMap = new Map();

    messages.forEach(msg => {
      const otherUserId = msg.senderId.toString() === userId.toString() 
        ? msg.receiverId.toString() 
        : msg.senderId.toString();
      
      // 💡 സ്വയം മെസ്സേജ് അയച്ച ഡാറ്റ ഉണ്ടെങ്കിൽ അത് ഒഴിവാക്കുന്നു
      if (otherUserId !== userId.toString()) {
        conversationUsersIds.add(otherUserId);
        if (!lastMessagesMap.has(otherUserId)) {
          lastMessagesMap.set(otherUserId, msg);
        }
      }
    });

    // 💡 $ne (Not Equal) ഉപയോഗിച്ച് ലിസ്റ്റിൽ നിന്ന് ലോഗിൻ ചെയ്ത യൂസറെ പൂർണ്ണമായും ഫിൽറ്റർ ചെയ്യുന്നു
    const users = await User.find({ 
      _id: { 
        $in: Array.from(conversationUsersIds),
        $ne: userId 
      } 
    }).select('name role');

    const data = users.map(u => {
      const lastMsg = lastMessagesMap.get(u._id.toString());
      return {
        _id: u._id,
        name: u.name,
        role: u.role,
        lastMessage: lastMsg ? lastMsg.text : '',
        createdAt: lastMsg ? lastMsg.createdAt : null,
        status: lastMsg ? lastMsg.status : 'read' 
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};