const { body, validationResult } = require('express-validator');

// User validation rules
const userRegisterValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required'),
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please provide a valid phone number')
];

// Employer validation rules
const employerRegisterValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('companyName')
    .trim()
    .notEmpty().withMessage('Company name is required'),
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please provide a valid phone number')
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('userType')
    .optional()
    .isIn(['user', 'employer', 'admin']).withMessage('Invalid user type')
];

// Password reset request validation
const forgotPasswordValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('userType')
    .optional()
    .isIn(['user', 'employer', 'admin']).withMessage('Invalid user type')
];

// OTP verification validation
const otpVerificationValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
  body('purpose')
    .isIn(['password_reset', 'account_verification', 'login_verification'])
    .withMessage('Invalid OTP purpose')
];

// Password reset validation (with OTP)
const resetPasswordValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),
  body('userType')
    .optional()
    .isIn(['user', 'employer', 'admin']).withMessage('Invalid user type')
];

// Refresh token validation
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty().withMessage('Refresh token is required')
];

// Admin login validation
const adminLoginValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  body('userType')
    .equals('admin').withMessage('User type must be admin')
];

// Resend OTP validation
const resendOTPValidation = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('purpose')
    .isIn(['password_reset', 'account_verification', 'login_verification'])
    .withMessage('Invalid OTP purpose'),
  body('userType')
    .optional()
    .isIn(['user', 'employer', 'admin']).withMessage('Invalid user type')
];

// Change password validation (for logged-in users)
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])/).withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('confirmNewPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New password confirmation does not match new password');
      }
      return true;
    })
];

// Update profile validation
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty().withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty().withMessage('Last name cannot be empty'),
  body('phone')
    .optional()
    .isMobilePhone().withMessage('Please provide a valid phone number'),
  body('companyName')
    .optional()
    .trim()
    .notEmpty().withMessage('Company name cannot be empty')
];

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Custom validation helper for checking if email exists
const checkEmailExists = (userType = 'user') => {
  return async (req, res, next) => {
    try {
      const { email } = req.body;
      let user;
      
      if (userType === 'employer') {
        const Employer = require('../models/employer');
        user = await Employer.findOne({ email });
      } else if (userType === 'admin') {
        const User = require('../models/user');
        user = await User.findOne({ 
          email, 
          role: { $in: ['admin', 'super_admin'] } 
        });
      } else {
        const User = require('../models/user');
        user = await User.findOne({ 
          email,
          role: 'job_seeker' 
        });
      }
      
      if (user) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
      
      next();
    } catch (error) {
      console.error('Email validation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Validation error'
      });
    }
  };
};

module.exports = {
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
};