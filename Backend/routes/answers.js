const express = require('express');
const router = express.Router({ mergeParams: true });
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/questions/:questionId/answers
router.post('/', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });

    const answer = await Answer.create({
      body: req.body.body,
      question: req.params.questionId,
      author: req.user._id,
    });

    // Update user stats & badges
    const user = await User.findById(req.user._id);
    user.answersGiven += 1;
    user.reputation += 5;
    const newBadges = user.checkAndAwardBadges();
    await user.save();

    await answer.populate('author', 'username badges reputation avatar');

    res.status(201).json({ success: true, answer, newBadges });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/questions/:questionId/answers/:answerId/vote
router.post('/:answerId/vote', protect, async (req, res) => {
  try {
    const { type } = req.body; // 'up' or 'down'
    const answer = await Answer.findById(req.params.answerId);
    if (!answer) return res.status(404).json({ success: false, message: 'Answer not found.' });

    if (answer.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "You can't vote on your own answer." });
    }

    const userId = req.user._id.toString();

    if (type === 'up') {
      const alreadyUp = answer.upvotes.map(id => id.toString()).includes(userId);
      // Remove from downvotes if present
      answer.downvotes = answer.downvotes.filter(id => id.toString() !== userId);
      if (alreadyUp) {
        answer.upvotes = answer.upvotes.filter(id => id.toString() !== userId);
      } else {
        answer.upvotes.push(req.user._id);
        // Update answer author's reputation & likes
        const authorUser = await User.findById(answer.author);
        if (authorUser) {
          authorUser.totalLikesReceived += 1;
          authorUser.reputation += 10;
          const newBadges = authorUser.checkAndAwardBadges();
          await authorUser.save();
        }
      }
    } else if (type === 'down') {
      const alreadyDown = answer.downvotes.map(id => id.toString()).includes(userId);
      answer.upvotes = answer.upvotes.filter(id => id.toString() !== userId);
      if (alreadyDown) {
        answer.downvotes = answer.downvotes.filter(id => id.toString() !== userId);
      } else {
        answer.downvotes.push(req.user._id);
        const authorUser = await User.findById(answer.author);
        if (authorUser) {
          authorUser.reputation = Math.max(0, authorUser.reputation - 2);
          await authorUser.save();
        }
      }
    }

    await answer.save();
    res.json({
      success: true,
      upvotes: answer.upvotes.length,
      downvotes: answer.downvotes.length,
      isCommunityVerified: answer.isCommunityVerified,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   POST /api/questions/:questionId/answers/:answerId/accept
// Only the question author can accept an answer
router.post('/:answerId/accept', protect, async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });

    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the question author can accept an answer.' });
    }

    const answer = await Answer.findById(req.params.answerId);
    if (!answer) return res.status(404).json({ success: false, message: 'Answer not found.' });

    // Toggle acceptance
    const wasAccepted = answer.isAccepted;

    // Unaccept all other answers
    await Answer.updateMany({ question: req.params.questionId }, { isAccepted: false });

    if (!wasAccepted) {
      answer.isAccepted = true;
      question.isResolved = true;
      question.acceptedAnswer = answer._id;

      // Reward answer author
      const authorUser = await User.findById(answer.author);
      if (authorUser) {
        authorUser.answersVerified += 1;
        authorUser.reputation += 15;
        const newBadges = authorUser.checkAndAwardBadges();
        await authorUser.save();
      }
    } else {
      question.isResolved = false;
      question.acceptedAnswer = null;
    }

    await answer.save();
    await question.save();

    res.json({ success: true, isAccepted: answer.isAccepted, message: answer.isAccepted ? '✅ Answer accepted!' : 'Acceptance removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route   DELETE /api/questions/:questionId/answers/:answerId
router.delete('/:answerId', protect, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.answerId);
    if (!answer) return res.status(404).json({ success: false, message: 'Answer not found.' });
    if (answer.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    await answer.deleteOne();
    res.json({ success: true, message: 'Answer deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;