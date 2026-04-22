const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  body: {
    type: String,
    required: [true, 'Answer body is required'],
    minlength: [10, 'Answer must be at least 10 characters'],
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Verification: question author can mark one answer as accepted
  isAccepted: { type: Boolean, default: false },
  // Community verification: if 5+ users upvote, auto-flag as community verified
  isCommunityVerified: { type: Boolean, default: false },
}, { timestamps: true });

// Virtual: net votes
answerSchema.virtual('voteScore').get(function () {
  return this.upvotes.length - this.downvotes.length;
});

// Auto community-verify if upvotes cross threshold
answerSchema.pre('save', function (next) {
  if (this.upvotes.length >= 5) {
    this.isCommunityVerified = true;
  }
  next();
});

module.exports = mongoose.model('Answer', answerSchema);