const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username cannot exceed 20 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  avatar: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    maxlength: [200, 'Bio cannot exceed 200 characters'],
    default: '',
  },
  // Reputation system
  reputation: {
    type: Number,
    default: 0,
  },
  totalLikesReceived: {
    type: Number,
    default: 0,
  },
  answersVerified: {
    type: Number,
    default: 0,
  },
  // Badge system
  badges: [{
    name: {
      type: String,
      enum: [
        'newcomer',       // Just joined
        'curious',        // Asked first question
        'helper',         // Gave first answer
        'rising_star',    // 10+ likes on answers
        'expert',         // 50+ likes on answers
        'legend',         // 200+ likes on answers
        'verified_guru',  // 10+ verified answers
        'top_contributor',// Most helpful this month
        'streak_7',       // Active 7 days
      ]
    },
    awardedAt: { type: Date, default: Date.now },
    description: String
  }],
  questionsAsked: { type: Number, default: 0 },
  answersGiven: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Auto-award badges based on reputation
userSchema.methods.checkAndAwardBadges = function () {
  const currentBadgeNames = this.badges.map(b => b.name);
  const newBadges = [];

  const badgeRules = [
    { name: 'newcomer', condition: true, desc: 'Welcome to StudyHive!' },
    { name: 'curious', condition: this.questionsAsked >= 1, desc: 'Asked your first question' },
    { name: 'helper', condition: this.answersGiven >= 1, desc: 'Gave your first answer' },
    { name: 'rising_star', condition: this.totalLikesReceived >= 10, desc: 'Received 10+ likes on answers' },
    { name: 'expert', condition: this.totalLikesReceived >= 50, desc: 'Received 50+ likes on answers' },
    { name: 'legend', condition: this.totalLikesReceived >= 200, desc: 'Received 200+ likes — a true legend!' },
    { name: 'verified_guru', condition: this.answersVerified >= 10, desc: '10+ answers marked as verified' },
  ];

  for (const rule of badgeRules) {
    if (rule.condition && !currentBadgeNames.includes(rule.name)) {
      newBadges.push({ name: rule.name, description: rule.desc });
    }
  }

  if (newBadges.length > 0) {
    this.badges.push(...newBadges);
  }
  return newBadges;
};

module.exports = mongoose.model('User', userSchema);