const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  // The gig completion this rating belongs to
  gigCompletion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GigCompletion',
    required: true
  },
  
  // Who is giving the rating (employer)
  ratedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    required: true
  },
  
  // Who is being rated (worker/user)
  ratedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // The worker completion record this rating is for
  workerCompletion: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  
  // Overall rating (1-5)
  overallRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Detailed ratings
  detailedRatings: {
    punctuality: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    quality: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    },
    reliability: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    }
  },
  
  // Written feedback
  feedback: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Would recommend this worker?
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  
  // Rating status
  status: {
    type: String,
    enum: ['active', 'disputed', 'removed'],
    default: 'active'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure one rating per employer per worker per gig completion
ratingSchema.index({ 
  gigCompletion: 1, 
  ratedBy: 1, 
  ratedUser: 1, 
  workerCompletion: 1 
}, { unique: true });

// Calculate overall rating as average of detailed ratings
ratingSchema.pre('save', function(next) {
  if (this.detailedRatings) {
    const ratings = Object.values(this.detailedRatings);
    this.overallRating = Math.round(
      (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10
    ) / 10; // Round to 1 decimal place
  }
  next();
});

// Static method to calculate user's average rating
ratingSchema.statics.calculateUserAverageRating = async function(userId) {
  const result = await this.aggregate([
    { $match: { ratedUser: new mongoose.Types.ObjectId(userId), status: 'active' } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$overallRating' },
        totalRatings: { $sum: 1 },
        averagePunctuality: { $avg: '$detailedRatings.punctuality' },
        averageQuality: { $avg: '$detailedRatings.quality' },
        averageProfessionalism: { $avg: '$detailedRatings.professionalism' },
        averageCommunication: { $avg: '$detailedRatings.communication' },
        averageReliability: { $avg: '$detailedRatings.reliability' }
      }
    }
  ]);
  
  return result.length > 0 ? result[0] : {
    averageRating: 0,
    totalRatings: 0,
    averagePunctuality: 0,
    averageQuality: 0,
    averageProfessionalism: 0,
    averageCommunication: 0,
    averageReliability: 0
  };
};

// Static method to get user's recent ratings
ratingSchema.statics.getUserRecentRatings = async function(userId, limit = 10) {
  return this.find({ ratedUser: userId, status: 'active' })
    .populate('ratedBy', 'companyName profilePicture')
    .populate('gigCompletion', 'gigRequest')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;
