const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const { protect, optionalAuth } = require('../middleware/auth');

// @route   GET /api/questions
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { subject, search, sort = 'newest', page = 1, limit = 10 } = req.query;
    const filter = {};

    if (subject && subject !== 'All') filter.subject = subject;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    let sortObj = {};
    if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'popular') sortObj = { views: -1 };
    else if (sort === 'unanswered') filter.isResolved = false;

    const total = await Question.countDocuments(filter);
    const questions = await Question.find(filter)
      .populate('author', 'username badges reputation avatar')
      .populate('answerCount')
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      currentPage: Number(page),
      questions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   GET /api/questions/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'username badges reputation avatar bio');

    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });

    // Increment views
    question.views += 1;
    await question.save();

    // Get answers sorted by upvotes desc (most liked first)
    const answers = await Answer.find({ question: req.params.id })
      .populate('author', 'username badges reputation avatar')
      .sort({ isAccepted: -1, isCommunityVerified: -1 });

    // Sort by vote score
    const sortedAnswers = answers.sort((a, b) => {
      if (a.isAccepted && !b.isAccepted) return -1;
      if (!a.isAccepted && b.isAccepted) return 1;
      return (b.upvotes.length - b.downvotes.length) - (a.upvotes.length - a.downvotes.length);
    });

    res.json({ success: true, question, answers: sortedAnswers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/questions
router.post('/', protect, [
  body('title').trim().isLength({ min: 10, max: 200 }).withMessage('Title must be 10-200 characters'),
  body('body').isLength({ min: 20 }).withMessage('Question body must be at least 20 characters'),
  body('subject').notEmpty().withMessage('Subject is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { title, body, subject, tags } = req.body;
    const question = await Question.create({
      title, body, subject,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      author: req.user._id,
    });

    // Update user stats & badges
    const user = await User.findById(req.user._id);
    user.questionsAsked += 1;
    user.reputation += 2;
    const newBadges = user.checkAndAwardBadges();
    await user.save();

    await question.populate('author', 'username badges reputation avatar');

    res.status(201).json({ success: true, question, newBadges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/questions/:id/upvote
router.post('/:id/upvote', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });

    const userId = req.user._id.toString();
    const alreadyUpvoted = question.upvotes.map(id => id.toString()).includes(userId);

    if (alreadyUpvoted) {
      question.upvotes = question.upvotes.filter(id => id.toString() !== userId);
    } else {
      question.upvotes.push(req.user._id);
    }
    await question.save();
    res.json({ success: true, upvotes: question.upvotes.length, upvoted: !alreadyUpvoted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/questions/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });
    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    await Answer.deleteMany({ question: question._id });
    await question.deleteOne();
    res.json({ success: true, message: 'Question deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;