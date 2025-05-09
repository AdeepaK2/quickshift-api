const { verifyToken } = require('../config/jwt');
const User = require('../models/user');
const Employer = require('../models/employer');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    let token;
    
    if (authHeader && authHeader.startsWith('Bearer')) {
      // Extract token
      token = authHeader.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }
    
    // Set user or employer to req object
    if (decoded.role === 'employer') {
      req.user = await Employer.findById(decoded.id).select('-password');
    } else {
      req.user = await User.findById(decoded.id).select('-password');
    }
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User or employer belonging to this token no longer exists'
      });
    }
    
    req.userType = decoded.role === 'employer' ? 'employer' : 'user';
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Role-based authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // For users
    if (req.userType === 'user' && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    
    // For employers
    if (req.userType === 'employer' && !roles.includes('employer')) {
      return res.status(403).json({
        success: false,
        message: 'Employers are not authorized to access this route'
      });
    }
    
    next();
  };
};