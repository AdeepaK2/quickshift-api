const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import routes
const userRoutes = require('./routes/userRoutes');
const gigRequestRoutes = require('./routes/gigRequestRoutes');
const gigApplyRoutes = require('./routes/gigApplyRoutes');

// Initialize Express app
const app = express();

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
app.use('/api/users', userRoutes);
app.use('/api/gig-requests', gigRequestRoutes);
app.use('/api/gig-applications', gigApplyRoutes);

module.exports = app;