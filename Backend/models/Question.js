const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Question title is required'],
    trim: true,
    minlength: [10, 'Title must be at least 10 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  body: {
    type: String,
    required: [true, 'Question body is required'],
    minlength: [20, 'Question body must be at least 20 characters'],
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    enum: [
      'Mathematics', 'Physics', 'Chemistry', 'Biology',
      'Computer Science', 'History', 'Geography', 'Economics',
      'English', 'Hindi', 'Other'
    ],
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  views: { type: Number, default: 0 },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isResolved: { type: Boolean, default: false },
  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer',
    default: null,
  },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual: answer count
questionSchema.virtual('answerCount', {
  ref: 'Answer',
  localField: '_id',
  foreignField: 'question',
  count: true,
});

module.exports = mongoose.model('Question', questionSchema);