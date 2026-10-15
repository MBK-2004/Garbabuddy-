
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Message = require('../models/Message');
const PartnerRequest = require('../models/PartnerRequest');
const User = require('../models/User');

const router = express.Router();

// Verify the user's login token
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Please log in first.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }

    req.userId = decoded.userId;
    next();
  });
}

// Check whether two students are confirmed partners
async function areConnected(userA, userB) {
  return PartnerRequest.exists({
    status: 'accepted',
    $or: [
      { sender: userA, recipient: userB },
      { sender: userB, recipient: userA },
    ],
  });
}

// Get the logged-in student's confirmed partners
router.get('/partners', authenticateToken, async (req, res) => {
  try {
    const requests = await PartnerRequest.find({
      status: 'accepted',
      $or: [
        { sender: req.userId },
        { recipient: req.userId },
      ],
    });

    const partnerIds = requests.map((request) =>
      request.sender.toString() === req.userId
        ? request.recipient
        : request.sender
    );

    const partners = await User.find({
      _id: { $in: partnerIds },
    }).select('_id realName name year branch');

    res.json({ partners });
  } catch (error) {
    console.error('Load chat partners error:', error);
    res.status(500).json({ message: 'Could not load chat partners.' });
  }
});

// Get messages with one confirmed partner
router.get('/:partnerId/messages', authenticateToken, async (req, res) => {
  try {
    const { partnerId } = req.params;

    if (!mongoose.isValidObjectId(partnerId)) {
      return res.status(400).json({ message: 'Invalid partner ID.' });
    }

    if (partnerId === req.userId) {
      return res.status(400).json({ message: 'Invalid partner.' });
    }

    const connected = await areConnected(req.userId, partnerId);

    if (!connected) {
      return res.status(403).json({
        message: 'Chat is available only to confirmed partners.',
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: partnerId },
        { sender: partnerId, recipient: req.userId },
      ],
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error) {
    console.error('Load messages error:', error);
    res.status(500).json({ message: 'Could not load messages.' });
  }
});

// Send a message to one confirmed partner
router.post('/:partnerId/messages', authenticateToken, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';

    if (!mongoose.isValidObjectId(partnerId)) {
      return res.status(400).json({ message: 'Invalid partner ID.' });
    }

    if (partnerId === req.userId) {
      return res.status(400).json({ message: 'You cannot message yourself.' });
    }

    if (!text || text.length > 2000) {
      return res.status(400).json({
        message: 'Message must contain 1–2000 characters.',
      });
    }

    const connected = await areConnected(req.userId, partnerId);

    if (!connected) {
      return res.status(403).json({
        message: 'You can message only your confirmed partner.',
      });
    }

    const message = await Message.create({
      sender: req.userId,
      recipient: partnerId,
      text,
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Could not send message.' });
  }
});

router.delete('/:partnerId/messages', authenticateToken, async (req, res) => {
  try {
    const { partnerId } = req.params;

    if (!mongoose.isValidObjectId(partnerId)) {
      return res.status(400).json({ message: 'Invalid partner ID.' });
    }

    if (partnerId === req.userId) {
      return res.status(400).json({ message: 'Invalid partner.' });
    }

    // Only confirmed partners can delete their conversation.
    const connected = await areConnected(req.userId, partnerId);

    if (!connected) {
      return res.status(403).json({
        message: 'Only confirmed partners can delete this chat.',
      });
    }

    const result = await Message.deleteMany({
      $or: [
        { sender: req.userId, recipient: partnerId },
        { sender: partnerId, recipient: req.userId },
      ],
    });

    res.json({
      message: 'Chat messages deleted for both partners.',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Could not delete chat messages.' });
  }
});


module.exports = router;
