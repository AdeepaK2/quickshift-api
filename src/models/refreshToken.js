const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: true
  },  userModel: {
    type: String,
    required: true,
    enum: ['User', 'Employer', 'Admin']
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '30d' // Automatically delete documents after 30 days
  }
});

// Index for faster queries
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ token: 1 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;