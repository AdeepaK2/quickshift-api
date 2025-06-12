const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    required: true,
    enum: ['password_reset', 'account_verification', 'login_verification']
  },
  userType: {
    type: String,
    required: true,
    enum: ['user', 'employer', 'admin']
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: 3
  },  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 20 * 60 * 1000) // 20 minutes from now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
otpSchema.index({ email: 1, purpose: 1 });
otpSchema.index({ otp: 1 });
// TTL index to automatically delete expired documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to generate 6-digit OTP
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Method to create OTP
otpSchema.statics.createOTP = async function(email, purpose, userType) {
  // Delete any existing OTPs for this email and purpose
  await this.deleteMany({ email, purpose });
    const otp = this.generateOTP();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes
  
  return await this.create({
    email,
    otp,
    purpose,
    userType,
    expiresAt
  });
};

// Method to verify OTP
otpSchema.statics.verifyOTP = async function(email, otp, purpose) {
  // For password reset, first try to find an OTP that's already been used but still valid
  // This handles the case where user has already verified OTP but is now using it to reset password
  let otpDoc;
  
  if (purpose === 'password_reset') {
    otpDoc = await this.findOne({
      email,
      otp,
      purpose,
      expiresAt: { $gt: new Date() }
    });
  } else {
    // For other purposes, only allow unused OTPs
    otpDoc = await this.findOne({
      email,
      otp,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
  }
  
  if (!otpDoc) {
    return { success: false, message: 'Invalid or expired OTP' };
  }
  
  if (otpDoc.attempts >= 3) {
    return { success: false, message: 'Maximum attempts exceeded' };
  }
  
  // Mark as used for initial verification
  // For password reset, we'll allow the same OTP to be used in both verify-otp and reset-password
  if (!otpDoc.isUsed) {
    otpDoc.isUsed = true;
    await otpDoc.save();
  }
  
  return { success: true, message: 'OTP verified successfully' };
};

// Method to increment attempts
otpSchema.methods.incrementAttempts = async function() {
  this.attempts += 1;
  await this.save();
};

const OTP = mongoose.model('OTP', otpSchema);

module.exports = OTP;