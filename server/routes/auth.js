

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');

const router = express.Router();
console.log('AUTH.JS FILE LOADED');

const allowedDomains = ['itbhu.ac.in', 'iitbhu.ac.in'];


function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      message: 'Please log in first.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.userId = decoded.userId;
    next();

  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired login session. Please log in again.'
    });
  }
}


router.post('/signup', async (req, res) => {

  let user;

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailParts = normalizedEmail.split('@');

    if (
      emailParts.length !== 2 ||
      !allowedDomains.includes(emailParts[1])
    ) {
      return res.status(400).json({
        message: 'Use your @itbhu.ac.in or @iitbhu.ac.in email.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters.',
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate a secure verification token.
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store only the hash, not the original token.
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      isVerified: false,
      verificationTokenHash,
      verificationTokenExpires: new Date(
        Date.now() + 60 * 60 * 1000
      ), // Expires in 1 hour
    });
    console.log('USER CREATED CHECK:', {
  id: user._id.toString(),
  email: user.email,
  isVerified: user.isVerified,
  hasTokenHash: Boolean(user.verificationTokenHash),
  tokenExpiry: user.verificationTokenExpires,
  database: User.db.name,
  collection: User.collection.name,
});

    const verificationLink =
      `http://localhost:5000/api/auth/verify-email` +
      `?token=${verificationToken}` +
      `&email=${encodeURIComponent(normalizedEmail)}`;

    await sendEmail({
      to: normalizedEmail,
      subject: 'kudka email to verify karo',
      text:
        `Hi ${user.name},\n\n` +
        `kisi or ko pehle dhundne se pehle tum tum hi ho na ye to pehle hame dhundene do ,so pls verify using this \n${verificationLink}\n\n` +
        `This link expires in 1 hour.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
          <h2>Welcome buddy!</h2>
          <p>Hi ${user.name.replace(/[&<>"']/g, '')},</p>
          <p>Please verify your college email to continue.</p>
          <p>
            <a href="${verificationLink}"
               style="display:inline-block;padding:12px 20px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;">
              Verify my email
            </a>
          </p>
          <p>This link expires in 1 hour.</p>
          <p>If you did not create this account, you can ignore this email.</p>
        </div>
      `,
    });

    console.log('Verification email sent to:', normalizedEmail);

    return res.status(201).json({
      message: 'Account created! Check your college email for the verification link.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Signup error:', error.message);

    // Avoid leaving a newly created account stuck if email delivery fails.
    if (user && !user.isVerified) {
      try {
        await User.deleteOne({
          _id: user._id,
          isVerified: false,
        });
      } catch (cleanupError) {
        console.error('Account cleanup failed:', cleanupError.message);
      }
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists.',
      });
    }

    return res.status(500).json({
      message: 'Could not complete signup or send the verification email. Please try again.',
    });
  }
});

// Verify the email when the student clicks the emailed link.

router.get('/verify-email', async (req, res) => {
 

  try {
    const { token, email } = req.query;

    // 1. Validate the verification link
    if (
      typeof token !== 'string' ||
      typeof email !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).send('Invalid verification link.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Hash the token received from the email
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // 3. Diagnostic information
    const savedUser = await User.findOne({
      email: normalizedEmail,
    });

    console.log('Saved user diagnostic:', {
      accountFound: Boolean(savedUser),
      isVerified: savedUser?.isVerified,
      hasTokenHash: Boolean(savedUser?.verificationTokenHash),
      tokenExpiry: savedUser?.verificationTokenExpires ?? null,
      expiryIsFuture:
        savedUser?.verificationTokenExpires > new Date(),
    });

    // 4. Find the user with a valid, unexpired token
    const user = await User.findOne({
      email: normalizedEmail,
      verificationTokenHash: tokenHash,
      verificationTokenExpires: { $gt: new Date() },
      isVerified: false,
    });

    console.log('Verification lookup:', {
      email: normalizedEmail,
      tokenProvided: Boolean(token),
      userFound: Boolean(user),
    });

    // 5. Reject invalid, expired, or already-used links
    if (!user) {
      return res
        .status(400)
        .send(
          'This verification link is invalid, expired, or already used.'
        );
    }

    // 6. Mark the user's email as verified
    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

   

    // 7. Redirect to the frontend login page
    const frontendUrl = (
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ).replace(/\/+$/, '');

    return res.redirect(`${frontendUrl}/login`);

  } catch (error) {
    console.error('Email verification error:', error.message);

    return res
      .status(500)
      .send('Could not verify your email. Please try again.');
  }
});

// Login existing users
router.post('/login', async (req, res) => {
    console.log('LOGIN ROUTE REACHED');
  try {
    const { email, password } = req.body;

    // 1. Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    // 2. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Find user in MongoDB
    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    // 4. Check password against stored hash
    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    // 5. Require email verification
    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your college email before logging in.',
      });
    }

    // 6. Login successful
   
    // 6. Login successful: generate an authentication token
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Something went wrong. Please try again.',
    });
  }
});


router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select(
      'name email realName year branch bio gender partnerPreference'
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    const profileComplete = Boolean(
      user.realName?.trim() &&
      user.year &&
      user.branch?.trim() &&
      user.gender &&
      user.partnerPreference
    );

    return res.status(200).json({
      profileComplete,
      profile: {
        name: user.realName || user.name,
        year: user.year || '',
        branch: user.branch || '',
        bio: user.bio || '',
        gender: user.gender || '',
        partnerPreference: user.partnerPreference || 'Any',
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);

    return res.status(500).json({
      message: 'Could not fetch your profile.',
    });
  }
});


router.post('/profile', authenticateToken, async (req, res) => {
  console.log('PROFILE ROUTE HIT');
  try {
    const {
      realName,
      year,
      branch,
      bio = '',
      gender,
      partnerPreference = 'Any',
    } = req.body;

    console.log('Profile request received:', {
  gender,
  partnerPreference,
});

    if (!realName?.trim() || !year || !branch?.trim()) {
      return res.status(400).json({
        message: 'Real name, year, and branch are required.',
      });
    }

    const validYears = [
      '1st Year',
      '2nd Year',
      '3rd Year',
      '4th Year',
      '5th Year',
    ];

    if (!validYears.includes(year)) {
      return res.status(400).json({
        message: 'Please select a valid academic year.',
      });
    }

    if (!['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({
        message: 'Please select a valid gender.',
      });
    }

    if (!['Male', 'Female', 'Other', 'Any'].includes(partnerPreference)) {
      return res.status(400).json({
        message: 'Please select a valid partner preference.',
      });
    }

    if (typeof bio !== 'string' || bio.length > 160) {
      return res.status(400).json({
        message: 'Bio must be 160 characters or fewer.',
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    user.realName = realName.trim();
    user.year = year;
    user.branch = branch.trim();
    user.bio = bio.trim();
    user.gender = gender;
    user.partnerPreference = partnerPreference;

    await user.save();
    console.log('Saved profile:', {
  gender: user.gender,
  partnerPreference: user.partnerPreference,
});

    return res.status(200).json({
      message: 'Profile saved successfully!',
      profile: {
        name: user.realName,
        year: user.year,
        branch: user.branch,
        bio: user.bio,
        gender: user.gender,
        partnerPreference: user.partnerPreference,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);

    return res.status(500).json({
      message: 'Could not save your profile.',
    });
  }
});


router.get('/discover', authenticateToken, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId)
      .select('gender partnerPreference')
      .lean();

    if (!currentUser) {
      return res.status(404).json({
        message: 'User not found.',
      });
    }

    if (!currentUser.gender || !currentUser.partnerPreference) {
      return res.status(400).json({
        message: 'Complete your gender and partner preferences first.',
      });
    }

    const filter = {
      _id: { $ne: currentUser._id },
      isVerified: true,
      gender: { $exists: true, $nin: ['', null] },
      year: { $exists: true, $nin: ['', null] },
      branch: { $exists: true, $nin: ['', null] },
      $and: [
        {
          $or: [
            { realName: { $exists: true, $nin: ['', null] } },
            { name: { $exists: true, $nin: ['', null] } },
          ],
        },
      ],
    };

    // Filter by the logged-in student's preference.
    if (currentUser.partnerPreference !== 'Any') {
      filter.gender = currentUser.partnerPreference;
    }

    // Get one random eligible student.
    const students = await User.aggregate([
      { $match: filter },
      { $sample: { size: 1 } },
      {
        $project: {
          name: 1,
          realName: 1,
          year: 1,
          branch: 1,
          bio: 1,
        },
      },
    ]);

    if (students.length === 0) {
      return res.status(200).json({
        profile: null,
        message: 'No eligible students found. Try again later.',
      });
    }

    const student = students[0];

    return res.status(200).json({
      profile: {
        id: student._id.toString(),
        name: student.realName || student.name,
        branch: student.branch,
        year: student.year,
        bio: student.bio || '',
      },
    });
  } catch (error) {
    console.error('Discover students error:', error);

    return res.status(500).json({
      message: 'Could not discover a student.',
    });
  }
});

router.get('/test-route', (req, res) => {
  res.json({ message: 'Auth router is working!' });
});


router.delete('/account', authenticateToken, async (req, res) => {
  console.log("delete account route hit for userId:", req.userId);
  try {
    const user = await User.findByIdAndDelete(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'Account not found.' });
    }

    return res.status(200).json({
      message: 'Account deleted successfully.',
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    return res.status(500).json({
      message: 'Could not delete account.',
    });
  }
});


module.exports = router;
