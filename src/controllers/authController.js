const User = require('../models/user');
const Employer = require('../models/employer');
const RefreshToken = require('../models/refreshToken');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../config/jwt');
const emailService = require('../services/emailService');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Helper function to create payload for JWT
 */
const createTokenPayload = (user, userType) => {
  return {
    id: user._id,
    role: userType === 'employer' ? 'employer' : user.role
  };
};

/**
 * Register a new user (job seeker)
 * @route POST /api/auth/register/user
 */
exports.registerUser = async (req, res) => {
  try {
    // Check if user with email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }
    
    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    // Create new user with verification token
    const user = new User({
      ...req.body,
      verificationToken,
      verificationExpires
    });
    
    await user.save();
    
    // Send verification email
    await emailService.sendVerificationEmail(user, verificationToken, 'user');
    
    // Generate tokens
    const payload = createTokenPayload(user, 'user');
    
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Save refresh token to database
    await new RefreshToken({
      token: refreshToken,
      userId: user._id,
      userModel: 'User',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }).save();
    
    // Send welcome email
    await emailService.sendWelcomeEmail(user, 'user');
    
    // Return user data without password and tokens
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.verificationToken;
    delete userResponse.verificationExpires;
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email.',
      data: {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message
    });
  }
};

/**
 * Register a new employer
 * @route POST /api/auth/register/employer
 */
exports.registerEmployer = async (req, res) => {
  try {
    // Check if employer with email already exists
    const existingEmployer = await Employer.findOne({ email: req.body.email });
    if (existingEmployer) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }
    
    // Create verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    // Create new employer with verification token
    const employer = new Employer({
      ...req.body,
      verificationToken,
      verificationExpires
    });
    
    await employer.save();
    
    // Send verification email
    await emailService.sendVerificationEmail(employer, verificationToken, 'employer');
    
    // Generate tokens
    const payload = createTokenPayload(employer, 'employer');
    
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Save refresh token to database
    await new RefreshToken({
      token: refreshToken,
      userId: employer._id,
      userModel: 'Employer',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }).save();
    
    // Send welcome email
    await emailService.sendWelcomeEmail(employer, 'employer');
    
    // Return employer data without password and tokens
    const employerResponse = employer.toObject();
    delete employerResponse.password;
    delete employerResponse.verificationToken;
    delete employerResponse.verificationExpires;
    
    res.status(201).json({
      success: true,
      message: 'Employer registered successfully. Please verify your email.',
      data: {
        employer: employerResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Employer registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register employer',
      error: error.message
    });
  }
};

/**
 * Login user or employer
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    let user;
    let model;
    
    // Check if it's an employer or user login
    if (userType === 'employer') {
      user = await Employer.findOne({ email });
      model = 'Employer';
    } else {
      user = await User.findOne({ email });
      model = 'User';
    }
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Update last login time
    user.lastLoginAt = Date.now();
    await user.save();
    
    // Generate tokens
    const payload = createTokenPayload(user, userType);
    
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Save refresh token to database
    await new RefreshToken({
      token: refreshToken,
      userId: user._id,
      userModel: model,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }).save();
    
    // Return user data without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Find the refresh token in the database
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
    
    if (!tokenDoc) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Check if token is expired
    if (new Date() > tokenDoc.expiresAt) {
      await RefreshToken.deleteOne({ _id: tokenDoc._id });
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired'
      });
    }
    
    // Verify the token
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      await RefreshToken.deleteOne({ _id: tokenDoc._id });
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    // Find the user
    let user;
    if (tokenDoc.userModel === 'Employer') {
      user = await Employer.findById(tokenDoc.userId);
    } else {
      user = await User.findById(tokenDoc.userId);
    }
    
    if (!user) {
      await RefreshToken.deleteOne({ _id: tokenDoc._id });
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate new tokens
    const payload = createTokenPayload(user, tokenDoc.userModel === 'Employer' ? 'employer' : 'user');
    
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    
    // Update refresh token in database
    tokenDoc.token = newRefreshToken;
    tokenDoc.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await tokenDoc.save();
    
    res.status(200).json({
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      }
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message
    });
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Delete refresh token from database
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error.message
    });
  }
};

/**
 * Verify email
 * @route GET /api/auth/verify-email/:token
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    
    // Try to find user with the token
    let user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() }
    });
    
    let userType = 'user';
    
    // If not found in users, try employers
    if (!user) {
      user = await Employer.findOne({
        verificationToken: token,
        verificationExpires: { $gt: Date.now() }
      });
      userType = 'employer';
    }
    
    // If still not found or token expired
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }
    
    // Update user verification status
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      error: error.message
    });
  }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body;
    
    let user;
    
    // Check if it's an employer or user
    if (userType === 'employer') {
      user = await Employer.findOne({ email });
    } else {
      user = await User.findOne({ email });
    }
    
    // Always return success even if email doesn't exist (security)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    
    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();
    
    // Send reset email
    await emailService.sendPasswordResetEmail(user, resetToken, userType);
    
    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // Try to find user with the token
    let user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    let userType = 'user';
    
    // If not found in users, try employers
    if (!user) {
      user = await Employer.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });
      userType = 'employer';
    }
    
    // If still not found or token expired
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }
    
    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    // Invalidate all refresh tokens for this user
    await RefreshToken.deleteMany({ 
      userId: user._id, 
      userModel: userType === 'employer' ? 'Employer' : 'User' 
    });
    
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      error: error.message
    });
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};