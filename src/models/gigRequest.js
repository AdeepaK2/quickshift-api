const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
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
  },
  peopleNeeded: {
    type: Number,
    required: true,
    min: 1
  },
  peopleAssigned: {
    type: Number,
    default: 0
  }
});

const gigRequestSchema = new mongoose.Schema({
  // Basic information
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  
  // Employer information
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    required: true
  },
  
  // Payment details
  payRate: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    rateType: {
      type: String,
      required: true,
      enum: ['hourly', 'fixed', 'daily']
    }
  },
  
  // Time slots (for single or multiple days with different times)
  timeSlots: [timeSlotSchema],
    // Location details
  location: {
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    postalCode: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true,
        min: -90,
        max: 90
      },
      longitude: {
        type: Number,
        required: true,
        min: -180,
        max: 180
      },
      // GeoJSON Point for MongoDB geospatial queries
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      }
    }
  },
  
  // Requirements
  requirements: {
    skills: [{
      type: String,
      trim: true
    }],
    experience: {
      type: String,
      trim: true
    },
    dress: {
      type: String,
      trim: true
    },
    equipment: {
      type: String,
      trim: true
    }
  },
  
  // Status information
  status: {
    type: String,
    required: true,
    enum: ['draft', 'active', 'closed', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Application management
  totalPositions: {
    type: Number,
    required: true,
    min: 1
  },
  filledPositions: {
    type: Number,
    default: 0
  },
  applicants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['applied', 'shortlisted', 'hired', 'rejected'],
      default: 'applied'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    coverLetter: {
      type: String,
      trim: true
    }
  }],
  
  // Important dates
  applicationDeadline: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manages createdAt and updatedAt
});

// Calculate total positions needed across all time slots
gigRequestSchema.pre('save', function(next) {
  if (this.timeSlots && this.timeSlots.length > 0) {
    let total = 0;
    this.timeSlots.forEach(slot => {
      total += slot.peopleNeeded;
    });
    this.totalPositions = total;
  }
  next();
});

// Index for location-based searches
gigRequestSchema.index({ 'location.coordinates': '2dsphere' });

// Method to check if gig is still accepting applications
gigRequestSchema.methods.isAcceptingApplications = function() {
  return this.status === 'active' && 
         this.filledPositions < this.totalPositions && 
         (!this.applicationDeadline || new Date() < this.applicationDeadline);
};

const GigRequest = mongoose.model('GigRequest', gigRequestSchema);

module.exports = GigRequest;