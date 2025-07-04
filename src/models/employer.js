const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const employerSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  profilePicture: {
    type: String
  },
  location: {
    type: String,
    trim: true
  },
  companyDescription: {
    type: String,
    trim: true
  },
  industryType: {
    type: String,
    trim: true
  },
  companySize: {
    type: String,
    enum: ['1-10', '10-50', '50-100', '100+'],
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  contactPersonName: {
    type: String,
    trim: true
  },
  // Authentication and verification
  verificationToken: String,
  verificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  verified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  ratings: {
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  
  // Payment information for making payments
  paymentInfo: {
    preferredPaymentMethod: {
      type: String,
      enum: ['bank_transfer', 'credit_card', 'paypal', 'mobile_money', 'other'],
    },
    bankDetails: {
      accountName: {
        type: String,
        trim: true
      },
      accountNumber: {
        type: String,
        trim: true
      },
      bankName: {
        type: String,
        trim: true
      }
    },
    creditCards: [{
      cardId: {
        type: String
      },
      last4: {
        type: String
      },
      expiryMonth: {
        type: Number
      },
      expiryYear: {
        type: Number
      },
      brand: {
        type: String
      },
      isDefault: {
        type: Boolean,
        default: false
      }
    }],
    paypalEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    taxInformation: {
      taxId: {
        type: String,
        trim: true
      },
      taxClassification: {
        type: String,
        trim: true
      }
    }
  },
  
  // Hiring history and statistics
  hiringStats: {
    totalGigsCreated: {
      type: Number,
      default: 0
    },
    totalGigsCompleted: {
      type: Number,
      default: 0
    },
    totalAmountPaid: {
      type: Number,
      default: 0
    },
    averagePaymentSpeed: {
      type: Number,  // Days
      default: 0
    },
    reliabilityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

// Pre-save middleware to hash the password
employerSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
employerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Employer = mongoose.model('Employer', employerSchema);

module.exports = Employer;