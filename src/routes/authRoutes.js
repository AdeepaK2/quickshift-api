const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  userRegisterValidation,
  employerRegisterValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  validate
} = require('../utils/validations');

// User registration
router.post('/register/user', userRegisterValidation, validate, authController.registerUser);

// Employer registration
router.post('/register/employer', employerRegisterValidation, validate, authController.registerEmployer);

// Login
router.post('/login', loginValidation, validate, authController.login);

// Refresh token
router.post('/refresh-token', refreshTokenValidation, validate, authController.refreshToken);

// Logout
router.post('/logout', authController.logout);

// Email verification
router.get('/verify-email/:token', authController.verifyEmail);

// Forgot password
router.post('/forgot-password', forgotPasswordValidation, validate, authController.forgotPassword);

// Reset password
router.post('/reset-password/:token', resetPasswordValidation, validate, authController.resetPassword);

// Get current user profile
router.get('/me', protect, authController.getMe);

module.exports = router;