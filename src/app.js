const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Load environment-specific configuration
const path = require('path');
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
require('dotenv').config({ path: path.resolve(process.cwd(), envFile) });

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
const publicTestRoutes = require('./routes/publicTestRoutes');

// Initialize Express app
const app = express();

// Import debug controller


// Webhook routes (must come before body parsing middleware)
app.use('/api/webhooks', webhookRoutes);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS with proper options
const corsOptions = {
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', process.env.FRONTEND_URL, 'http://localhost:5000'].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires']
};
app.use(cors(corsOptions));

// Configure helmet with less restrictive settings for development
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(morgan('dev'));

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to QuickShift API' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/public', publicTestRoutes);
app.use('/api/auth', authRoutes);

// Debug route for admin login

app.use('/api/users', userRoutes);
app.use('/api/employers', employerRoutes);
app.use('/api/gig-requests', gigRequestRoutes);
app.use('/api/gig-applications', gigApplyRoutes);
app.use('/api/gig-completions', gigCompletionRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

module.exports = app;