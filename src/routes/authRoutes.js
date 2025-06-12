const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  userRegisterValidation,
  employerRegisterValidation,
  loginValidation,
  forgotPasswordValidation,
  otpVerificationValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  adminLoginValidation,
  resendOTPValidation,
  changePasswordValidation,
  updateProfileValidation,
  validate,
  checkEmailExists
} = require('../utils/validations');

// User registration
router.post('/register/user', 
  userRegisterValidation, 
  validate, 
  checkEmailExists('user'),
  authController.registerUser
);

// Employer registration
router.post('/register/employer', 
  employerRegisterValidation, 
  validate, 
  checkEmailExists('employer'),
  authController.registerEmployer
);

// Regular login (user/employer)
router.post('/login', 
  loginValidation, 
  validate, 
  authController.login
);

// Admin login
router.post('/admin/login', 
  (req, res, next) => { req.body.userType = 'admin'; next(); },
  adminLoginValidation, 
  validate, 
  authController.login
);

// Refresh token
router.post('/refresh-token', 
  refreshTokenValidation, 
  validate, 
  authController.refreshToken
);

// Logout
router.post('/logout', authController.logout);

// Forgot password - sends OTP to email
router.post('/forgot-password', 
  forgotPasswordValidation, 
  validate, 
  authController.forgotPassword
);

// Verify OTP
router.post('/verify-otp', 
  otpVerificationValidation, 
  validate, 
  authController.verifyOTP
);

// Reset password with OTP
router.post('/reset-password', 
  resetPasswordValidation, 
  validate, 
  authController.resetPassword
);

// Resend OTP (if needed)
router.post('/resend-otp', 
  resendOTPValidation, 
  validate, 
  authController.resendOTP
);

// Change password (for logged-in users)
router.post('/change-password', 
  protect,
  changePasswordValidation, 
  validate, 
  authController.changePassword
);

// Get current user profile
router.get('/me', protect, authController.getMe);

// Update profile
router.put('/profile', 
  protect,
  updateProfileValidation,
  validate,
  authController.updateProfile
);

module.exports = router;