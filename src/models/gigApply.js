const mongoose = require('mongoose');

const gigApplySchema = new mongoose.Schema({
  // User applying for the gig
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Gig being applied for
  gigRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GigRequest',
    required: true
  },
  
  // Selected time slots the user is applying for
  timeSlots: [{
    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    }
  }],
  
  // Application status
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'hired', 'rejected'],
    default: 'applied'
  },
  
  // Cover letter or additional information
  coverLetter: {
    type: String,
    trim: true
  },
  
  // Application timestamp
  appliedAt: {
    type: Date,
    default: Date.now
  },
    // Additional fields
  resume: {
    type: String  // URL or path to resume file
  },
  
  // Flag for instant/one-click applications
  isInstantApply: {
    type: Boolean,
    default: false
  },
  
  // Response from employer
  employerFeedback: {
    type: String,
    trim: true
  },
  
  // Updates and notifications
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index to ensure a user can only apply once to a specific gig
gigApplySchema.index({ user: 1, gigRequest: 1 }, { unique: true });

// Method to check if application can be modified
gigApplySchema.methods.canBeModified = function() {
  return ['applied', 'shortlisted'].includes(this.status);
};

const GigApply = mongoose.model('GigApply', gigApplySchema);

module.exports = GigApply;