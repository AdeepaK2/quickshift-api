const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({  role: {
    type: String,
    enum: ['job_seeker', 'admin', 'super_admin'],
    default: 'job_seeker'
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String
  },
  university: {
    type: String
  },
  faculty: {
    type: String
  },
  yearOfStudy: {
    type: Number,
    min: 1,
    max: 5
  },
  studentIdVerified: {
    type: Boolean,
    default: false
  },
  bio: {
    type: String
  },
  // Contact and location
  address: {
    type: String
  },
  city: {
    type: String
  },
  postalCode: {
    type: String
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  // Authentication and verification
  verificationToken: String,
  verificationExpires: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },  lastLoginAt: {
    type: Date
  },
  
  // Notification preferences
  notificationPreferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean, 
      default: true
    },
    newJobAlerts: {
      type: Boolean,
      default: true
    },
    applicationUpdates: {
      type: Boolean,
      default: true
    },
    jobRecommendations: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  },
  
  // Job alert preferences
  jobAlertPreferences: {
    maxDistance: {
      type: Number,
      default: 25, // km
      min: 1,
      max: 100
    },
    preferredCategories: [{
      type: String,
      trim: true
    }],
    minPayRate: {
      type: Number,
      default: 0
    },
    maxPayRate: {
      type: Number
    },
    payRateType: {
      type: String,
      enum: ['hourly', 'fixed', 'daily'],
      default: 'hourly'
    },
    preferredSkills: [{
      type: String,
      trim: true
    }],
    alertFrequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly'],
      default: 'immediate'
    }
  },
  
  // Payment information for receiving payments
  paymentInfo: {
    preferredPaymentMethod: {
      type: String,
      enum: ['bank_transfer', 'paypal', 'mobile_money', 'cash', 'other'],
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
      },
      routingNumber: {
        type: String,
        trim: true
      },
      swiftCode: {
        type: String,
        trim: true
      }
    },
    paypalEmail: {
      type: String,
      trim: true,
      lowercase: true
    },    mobileMoneyNumber: {
      type: String,
      trim: true
    },
    // Stripe Connect integration
    stripe: {
      accountId: {
        type: String  // Stripe Connect account ID
      },
      accountStatus: {
        type: String,
        enum: ['pending', 'restricted', 'enabled', 'disabled'],
        default: 'pending'
      },
      onboardingCompleted: {
        type: Boolean,
        default: false
      },
      onboardingLink: {
        type: String  // Account onboarding link
      },
      lastOnboardingUpdate: {
        type: Date
      },
      chargesEnabled: {
        type: Boolean,
        default: false
      },
      payoutsEnabled: {
        type: Boolean,
        default: false
      }
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
    // Employment history and stats
  employmentStats: {
    totalGigsCompleted: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    // Detailed rating breakdowns
    ratingBreakdown: {
      punctuality: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      quality: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      professionalism: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      communication: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      },
      reliability: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
      }
    },
    reliabilityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    recommendationRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

// Pre-save middleware to hash the password
userSchema.pre('save', async function(next) {
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
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to check if user profile is ready for instant apply
userSchema.methods.isReadyForInstantApply = function() {
  return {
    ready: !!(this.firstName && this.lastName && this.phone && this.skills && this.skills.length > 0),
    missing: [
      !this.firstName && 'First name',
      !this.lastName && 'Last name', 
      !this.phone && 'Phone number',
      (!this.skills || this.skills.length === 0) && 'At least one skill'
    ].filter(Boolean)
  };
};

// Method to generate default cover letter for instant apply
userSchema.methods.generateInstantApplyCoverLetter = function(gigRequest) {
  const skills = this.skills && this.skills.length > 0 ? this.skills.slice(0, 3).join(', ') : 'various skills';
  const experience = this.experience || 'enthusiasm and willingness to learn';
  
  return this.bio || 
    `Hi! I'm ${this.firstName} and I'm very interested in the ${gigRequest.category} position: "${gigRequest.title}". ` +
    `I have experience with ${skills} and bring ${experience} to every role. ` +
    `I'm available for the scheduled times and excited about the opportunity to work with ${gigRequest.employer?.companyName || 'your team'}. ` +
    `Thank you for considering my application!`;
};

const User = mongoose.model('User', userSchema);

module.exports = User;