const { verifyToken } = require('../config/jwt');
const User = require('../models/user');
const Employer = require('../models/employer');
const Admin = require('../models/admin');

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
      // Set user, admin or employer to req object
    if (decoded.role === 'employer') {
      req.user = await Employer.findById(decoded.id).select('-password');
      req.userType = 'employer';
    } else if (decoded.role === 'admin' || decoded.role === 'super_admin') {
      req.user = await Admin.findById(decoded.id).select('-password');
      req.userType = 'admin';
    } else {
      req.user = await User.findById(decoded.id).select('-password');
      req.userType = 'user';
    }
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Account belonging to this token no longer exists'
      });
    }
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
    
    // For admins - check if admin or super_admin roles are allowed
    if (req.userType === 'admin') {
      const adminRoles = ['admin', 'super_admin'];
      const hasAdminRole = roles.some(role => adminRoles.includes(role));
      
      if (!hasAdminRole) {
        return res.status(403).json({
          success: false,
          message: 'Admin access not authorized for this route'
        });
      }
      
      // If specific admin role is required, check it
      if (roles.includes('super_admin') && !roles.includes('admin') && req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Super admin access required'
        });
      }
    }
    
    next();
  };
};

// Admin-only authorization
exports.adminOnly = (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Super admin only authorization
exports.superAdminOnly = (req, res, next) => {
  if (req.userType !== 'admin' || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required'
    });
  }
  next();
};