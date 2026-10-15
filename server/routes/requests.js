

const express = require('express');
const PartnerRequest = require('../models/PartnerRequest');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Verify the logged-in student
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: 'Please log in first.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired login session.',
    });
  }
}

// Send a partner request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const senderId = String(req.userId);

    if (!recipientId) {
      return res.status(400).json({
        message: 'Recipient ID is required.',
      });
    }

    if (String(recipientId) === senderId) {
      return res.status(400).json({
        message: 'You cannot send a request to yourself.',
      });
    }

    const recipient = await User.findOne({
      _id: recipientId,
      isVerified: true,
      realName: { $exists: true, $ne: '' },
      year: { $exists: true, $ne: '' },
      branch: { $exists: true, $ne: '' },
    });

    if (!recipient) {
      return res.status(404).json({
        message: 'Student not found or profile is incomplete.',
      });
    }

    // Either student being connected blocks new requests.
    const existingConnection = await PartnerRequest.findOne({
      status: 'accepted',
      $or: [
        { sender: req.userId },
        { recipient: req.userId },
        { sender: recipientId },
        { recipient: recipientId },
      ],
    });

    if (existingConnection) {
      return res.status(409).json({
        message: 'You or this student already have a Garba partner.',
      });
    }

    // Allow requests to multiple people, but only one pending
    // request between the same two students.
    const existingPendingRequest = await PartnerRequest.findOne({
      status: 'pending',
      $or: [
        { sender: req.userId, recipient: recipientId },
        { sender: recipientId, recipient: req.userId },
      ],
    });

    if (existingPendingRequest) {
      return res.status(409).json({
        message: 'A pending request between you and this student already exists.',
      });
    }

    const request = await PartnerRequest.create({
      sender: req.userId,
      recipient: recipientId,
    });

    return res.status(201).json({
      message: 'Partner request sent successfully!',
      request: {
        id: request._id,
        recipient: request.recipient,
        status: request.status,
      },
    });
  } catch (error) {
    console.error('Send request error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid student ID.',
      });
    }

    return res.status(500).json({
      message: 'Could not send partner request.',
    });
  }
});


// Get incoming requests for the logged-in student
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const receivedRequests = await PartnerRequest.find({
      recipient: req.userId,
      status: 'pending',
    })
      .populate('sender', 'realName name year branch')
      .sort({ createdAt: -1 });

    const formattedRequests = receivedRequests
      .filter((request) => request.sender)
      .map((request) => {
        const sender = request.sender;
        const name = sender.realName || sender.name || 'Student';

        return {
          id: request._id,
          senderId: sender._id,
          name,
          year: sender.year || '',
          branch: sender.branch || '',
          initials: name
            .trim()
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase(),
          status: request.status,
          createdAt: request.createdAt,
        };
      });

    return res.status(200).json({
      requests: formattedRequests,
    });
  } catch (error) {
    console.error('Fetch incoming requests error:', error);

    return res.status(500).json({
      message: 'Could not load incoming requests.',
    });
  }
});


// Get IDs of students the logged-in student has requested
router.get('/sent', authenticateToken, async (req, res) => {
  try {
    const sentRequests = await PartnerRequest.find({
      sender: req.userId,
      status: { $in: ['pending', 'accepted'] },
    }).select('recipient status');

    return res.status(200).json({
      recipientIds: sentRequests.map((request) =>
        String(request.recipient)
      ),
    });
  } catch (error) {
    console.error('Fetch sent requests error:', error);

    return res.status(500).json({
      message: 'Could not load sent requests.',
    });
  }
});


// Get accepted connections for the logged-in student
router.get('/connections', authenticateToken, async (req, res) => {
  try {
    const connections = await PartnerRequest.find({
      status: 'accepted',
      $or: [
        { sender: req.userId },
        { recipient: req.userId },
      ],
    }).select('sender recipient');

    const connectedIds = connections.map((request) => {
      const senderId = String(request.sender);
      const recipientId = String(request.recipient);

      return senderId === String(req.userId)
        ? recipientId
        : senderId;
    });

    return res.status(200).json({
      connectedIds: [...new Set(connectedIds)],
    });
  } catch (error) {
    console.error('Fetch connections error:', error);

    return res.status(500).json({
      message: 'Could not load connections.',
    });
  }
});


// Accept or decline an incoming partner request
router.put('/:id/respond', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({
        message: 'Status must be accepted or declined.',
      });
    }

    const request = await PartnerRequest.findOne({
      _id: req.params.id,
      recipient: req.userId,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({
        message: 'Pending request not found.',
      });
    }

    if (status === 'accepted') {
      // Check whether either student has already connected
      // with someone else.
      const existingConnection = await PartnerRequest.findOne({
        _id: { $ne: request._id },
        status: 'accepted',
        $or: [
          { sender: request.sender },
          { recipient: request.sender },
          { sender: request.recipient },
          { recipient: request.recipient },
        ],
      });

      if (existingConnection) {
        request.status = 'declined';
        await request.save();

        return res.status(409).json({
          message: 'One of these students already has a Garba partner. This request can no longer be accepted.',
        });
      }

      // Connect the two students.
      request.status = 'accepted';
      await request.save();

      // Close every other pending request involving either
      // student, in either direction.
      await PartnerRequest.updateMany(
        {
          _id: { $ne: request._id },
          status: 'pending',
          $or: [
            { sender: request.sender },
            { recipient: request.sender },
            { sender: request.recipient },
            { recipient: request.recipient },
          ],
        },
        { $set: { status: 'declined' } }
      );
    } else {
      request.status = 'declined';
      await request.save();
    }

    return res.status(200).json({
      message:
        status === 'accepted'
          ? 'Partner request accepted! You are now connected.'
          : 'Partner request declined.',
      request: {
        id: request._id,
        status: request.status,
      },
    });
  } catch (error) {
    console.error('Respond to request error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        message: 'Invalid request ID.',
      });
    }

    return res.status(500).json({
      message: 'Could not update the partner request.',
    });
  }
});

module.exports = router;
