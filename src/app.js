const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const userRoutes = require('./routes/userRoutes');
const gigRequestRoutes = require('./routes/gigRequestRoutes');
const gigApplyRoutes = require('./routes/gigApplyRoutes');
const gigCompletionRoutes = require('./routes/gigCompletionRoutes');
const authRoutes = require('./routes/authRoutes');
const employerRoutes = require('./routes/employerRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

// Initialize Express app
const app = express();

// Webhook routes (must come before body parsing middleware)
app.use('/api/webhooks', webhookRoutes);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to QuickShift API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/gig-requests', gigRequestRoutes);
app.use('/api/gig-applications', gigApplyRoutes);
app.use('/api/gig-completions', gigCompletionRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

module.exports = app;