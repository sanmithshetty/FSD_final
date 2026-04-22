const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

// @route   POST /api/auth/register
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'username';
      return res.status(400).json({ success: false, message: `This ${field} is already taken.` });
    }

    const user = await User.create({ username, email, password });
    // Award newcomer badge
    user.badges.push({ name: 'newcomer', description: 'Welcome to StudyHive!' });
    await user.save();

    const token = signToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to StudyHive 🎉',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        reputation: user.reputation,
        badges: user.badges,
        avatar: user.avatar,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   POST /api/auth/login
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = signToken(user._id);
    res.json({
      success: true,
      message: `Welcome back, ${user.username}! 👋`,
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        reputation: user.reputation,
        badges: user.badges,
        avatar: user.avatar,
        bio: user.bio,
        questionsAsked: user.questionsAsked,
        answersGiven: user.answersGiven,
        totalLikesReceived: user.totalLikesReceived,
        answersVerified: user.answersVerified,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, user });
});

// @route   PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { bio, avatar },
      { new: true, runValidators: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;