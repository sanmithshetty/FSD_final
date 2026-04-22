const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');

// @route   GET /api/users/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('username reputation badges avatar totalLikesReceived answersVerified answersGiven questionsAsked')
      .sort({ reputation: -1 })
      .limit(20);
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/users/:username
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const questions = await Question.find({ author: user._id })
      .select('title subject createdAt upvotes isResolved')
      .sort({ createdAt: -1 })
      .limit(5);

    const answers = await Answer.find({ author: user._id })
      .populate('question', 'title subject')
      .select('body upvotes isAccepted isCommunityVerified createdAt question')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ success: true, user, recentQuestions: questions, recentAnswers: answers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;