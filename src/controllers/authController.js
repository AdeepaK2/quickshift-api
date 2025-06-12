const User = require('../models/user');
const Employer = require('../models/employer');
const RefreshToken = require('../models/refreshToken');
const OTP = require('../models/otp');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../config/jwt');
const emailService = require('../services/emailService');
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
    
    // Create new user without verification token
    const user = new User({
      ...req.body,
      isVerified: true // Auto-verify since we removed email verification
    });
    
    await user.save();
    
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
    
    // Return user data without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
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
    
    // Create new employer without verification token
    const employer = new Employer({
      ...req.body,
      isVerified: true // Auto-verify since we removed email verification
    });
    
    await employer.save();
    
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
    
    // Return employer data without password
    const employerResponse = employer.toObject();
    delete employerResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'Employer registered successfully',
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
 * Login user, employer, or admin
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    let user;
    let model;
    
    // Check if it's an employer, admin, or user login
    if (userType === 'employer') {
      user = await Employer.findOne({ email });
      model = 'Employer';
    } else if (userType === 'admin') {
      user = await User.findOne({ 
        email, 
        role: { $in: ['admin', 'super_admin'] } 
      });
      model = 'User';
    } else {
      user = await User.findOne({ 
        email,
        role: 'job_seeker' 
      });
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
        userType: userType || 'user',
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
 * Request password reset OTP
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body;
    
    let user;
    let actualUserType;
    
    // Check if it's an employer, admin, or user
    if (userType === 'employer') {
      user = await Employer.findOne({ email });
      actualUserType = 'employer';
    } else if (userType === 'admin') {
      user = await User.findOne({ 
        email, 
        role: { $in: ['admin', 'super_admin'] } 
      });
      actualUserType = 'admin';
    } else {
      user = await User.findOne({ 
        email,
        role: 'job_seeker' 
      });
      actualUserType = 'user';
    }
    
    // Always return success even if email doesn't exist (security)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive an OTP'
      });
    }
    
    // Generate OTP
    const otpDoc = await OTP.createOTP(email, 'password_reset', actualUserType);
    
    // Send OTP email
    await emailService.sendPasswordResetOTP(user, otpDoc.otp, actualUserType);
    
    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive an OTP'
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
 * Verify OTP
 * @route POST /api/auth/verify-otp
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;
    
    const result = await OTP.verifyOTP(email, otp, purpose);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
};

/**
 * Reset password (requires OTP verification first)
 * @route POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, password, userType } = req.body;
    
    // Verify OTP first - using the special password reset flow
    const otpResult = await OTP.verifyOTP(email, otp, 'password_reset');
    if (!otpResult.success) {
      // Enhanced error message for better UX
      const errorMessage = otpResult.message === 'Invalid or expired OTP' 
        ? 'Your verification code has expired. Please request a new code.'
        : otpResult.message;
      
      return res.status(400).json({
        success: false,
        message: errorMessage
      });
    }
    
    let user;
    let model;
    
    // Find user based on type
    if (userType === 'employer') {
      user = await Employer.findOne({ email });
      model = 'Employer';
    } else if (userType === 'admin') {
      user = await User.findOne({ 
        email, 
        role: { $in: ['admin', 'super_admin'] } 
      });
      model = 'User';
    } else {
      user = await User.findOne({ 
        email,
        role: 'job_seeker' 
      });
      model = 'User';
    }
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }
      // Update password
    user.password = password;
    await user.save();
    
    // Invalidate all refresh tokens for this user
    await RefreshToken.deleteMany({ 
      userId: user._id, 
      userModel: model
    });
    
    // Generate new tokens so user remains logged in after password reset
    const payload = createTokenPayload(user, userType || (model === 'Employer' ? 'employer' : 'user'));
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    
    // Save new refresh token to database
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
      message: 'Password reset successfully',
      data: {
        user: userResponse,
        userType: userType || (model === 'Employer' ? 'employer' : 'user'),
        tokens: {
          accessToken,
          refreshToken
        }
      }
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
 * Resend OTP
 * @route POST /api/auth/resend-otp
 */
exports.resendOTP = async (req, res) => {
  try {
    const { email, purpose, userType } = req.body;
    
    let user;
    let actualUserType;
    
    // Check if it's an employer, admin, or user
    if (userType === 'employer') {
      user = await Employer.findOne({ email });
      actualUserType = 'employer';
    } else if (userType === 'admin') {
      user = await User.findOne({ 
        email, 
        role: { $in: ['admin', 'super_admin'] } 
      });
      actualUserType = 'admin';
    } else {
      user = await User.findOne({ 
        email,
        role: 'job_seeker' 
      });
      actualUserType = 'user';
    }
    
    // Always return success even if email doesn't exist (security)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive an OTP'
      });
    }
    
    // Generate new OTP
    const otpDoc = await OTP.createOTP(email, purpose, actualUserType);
    
    // Send OTP email based on purpose
    if (purpose === 'password_reset') {
      await emailService.sendPasswordResetOTP(user, otpDoc.otp, actualUserType);
    } else if (purpose === 'login_verification') {
      await emailService.sendLoginOTP(user, otpDoc.otp, actualUserType);
    }
    
    res.status(200).json({
      success: true,
      message: 'OTP has been resent to your email'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      error: error.message
    });
  }
};

/**
 * Change password for logged-in users
 * @route POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    
    // Check if current password is correct
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Invalidate all refresh tokens for this user
    const userModel = req.userType === 'employer' ? 'Employer' : 'User';
    await RefreshToken.deleteMany({ 
      userId: user._id, 
      userModel: userModel
    });
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/auth/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const updates = req.body;
    
    // Remove fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.role;
    delete updates._id;
    delete updates.__v;
    delete updates.createdAt;
    delete updates.updatedAt;
    
    // Update user fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    });
    
    user.updatedAt = Date.now();
    await user.save();
    
    // Return updated user data without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
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