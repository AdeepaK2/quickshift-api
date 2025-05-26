const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
require('dotenv').config();

// Import routes
const userRoutes = require('./routes/userRoutes');
const employerRoutes = require('./routes/employerRoutes');
const gigRequestRoutes = require('./routes/gigRequestRoutes');
const gigApplyRoutes = require('./routes/gigApplyRoutes');
const gigCompletionRoutes = require('./routes/gigCompletionRoutes');
const ratingRoutes = require('./routes/ratingRoutes');

// Initialize Express app
const app = express();

// Connect to database
connectDB();

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
app.use('/api/employers', employerRoutes);
app.use('/api/gig-requests', gigRequestRoutes);
app.use('/api/gig-applications', gigApplyRoutes);
app.use('/api/gig-completions', gigCompletionRoutes);
app.use('/api/ratings', ratingRoutes);

// Define port
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});