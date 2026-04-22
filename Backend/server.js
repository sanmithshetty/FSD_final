require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Connect to MongoDB Atlas
connectDB();

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3000',
    'null' // for file:// protocol during dev
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/questions/:questionId/answers', require('./routes/answers'));
app.use('/api/users', require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: '✅ StudyHive API is running!', timestamp: new Date() });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 StudyHive server running on http://localhost:${PORT}`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/health`);
});