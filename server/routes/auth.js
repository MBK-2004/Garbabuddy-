

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();
console.log('AUTH.JS FILE LOADED');

const allowedDomains = ['itbhu.ac.in', 'iitbhu.ac.in'];

router.post('/signup', async (req, res) => {
    console.log('SIGNUP ROUTE CALLED');
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
      subject: 'Verify your Garba Buddy email',
      text:
        `Hi ${user.name},\n\n` +
        `Please verify your email using this link:\n${verificationLink}\n\n` +
        `This link expires in 1 hour.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto; padding: 24px;">
          <h2>Welcome to Garba Buddy!</h2>
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
    console.log('VERIFY EMAIL ROUTE CALLED');
  try {
    const { token, email } = req.query;

    if (
      typeof token !== 'string' ||
      typeof email !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(token)
    ) {
      return res.status(400).send('Invalid verification link.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

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

    if (!user) {
      return res
        .status(400)
        .send('This verification link is invalid, expired, or already used.');
    }

    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpires = undefined;

    await user.save();

    return res.send(`
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Email Verified - Garba Buddy</title>
        </head>
        <body style="font-family:Arial,sans-serif;text-align:center;padding:48px 20px;">
          <h1>Email verified!</h1>
          <p>Your Garba Buddy email has been verified successfully.</p>
          <p>You can return to Garba Buddy now.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Email verification error:', error.message);
    return res.status(500).send('Could not verify your email. Please try again.');
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
    return res.status(200).json({
      message: 'Login successful!',
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

module.exports = router;
