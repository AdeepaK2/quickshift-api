const Rating = require('../models/rating');
const GigCompletion = require('../models/gigCompletion');
const User = require('../models/user');
const Employer = require('../models/employer');
const mongoose = require('mongoose');

// Create a new rating
exports.createRating = async (req, res) => {
  try {
    const { gigCompletionId, workerCompletionId, ratedUserId } = req.params;
    const { 
      detailedRatings, 
      feedback, 
      wouldRecommend 
    } = req.body;

    // Verify the employer is authorized to rate this gig completion
    const gigCompletion = await GigCompletion.findById(gigCompletionId);
    if (!gigCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Gig completion not found'
      });
    }

    // Check if the employer owns this gig completion
    if (gigCompletion.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to rate this gig completion'
      });
    }

    // Verify the worker completion exists and belongs to the specified user
    const workerCompletion = gigCompletion.workers.find(
      w => w._id.toString() === workerCompletionId && 
           w.worker.toString() === ratedUserId
    );

    if (!workerCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Worker completion record not found'
      });
    }

    // Check if gig is completed
    if (gigCompletion.status !== 'completed' && gigCompletion.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Cannot rate incomplete gig'
      });
    }

    // Check if rating already exists
    const existingRating = await Rating.findOne({
      gigCompletion: gigCompletionId,
      ratedBy: req.user._id,
      ratedUser: ratedUserId,
      workerCompletion: workerCompletionId
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: 'You have already rated this worker for this gig'
      });
    }

    // Create new rating
    const rating = new Rating({
      gigCompletion: gigCompletionId,
      ratedBy: req.user._id,
      ratedUser: ratedUserId,
      workerCompletion: workerCompletionId,
      detailedRatings,
      feedback,
      wouldRecommend
    });

    await rating.save();

    // Update the worker's performance in gigCompletion
    workerCompletion.performance = {
      rating: rating.overallRating,
      feedback: feedback,
      punctuality: detailedRatings.punctuality,
      quality: detailedRatings.quality,
      professionalism: detailedRatings.professionalism,
      communication: detailedRatings.communication,
      reliability: detailedRatings.reliability
    };

    await gigCompletion.save();

    // Update user's employment stats
    await updateUserRatingStats(ratedUserId);

    // Populate the rating for response
    await rating.populate([
      { path: 'ratedBy', select: 'companyName profilePicture' },
      { path: 'ratedUser', select: 'firstName lastName profilePicture' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Rating created successfully',
      data: rating
    });

  } catch (error) {
    console.error('Error creating rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create rating',
      error: error.message
    });
  }
};

// Get ratings for a specific user
exports.getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get ratings with pagination
    const ratings = await Rating.find({ ratedUser: userId, status: 'active' })
      .populate('ratedBy', 'companyName profilePicture location')
      .populate({
        path: 'gigCompletion',
        select: 'gigRequest',
        populate: {
          path: 'gigRequest',
          select: 'title jobType location'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Rating.countDocuments({ ratedUser: userId, status: 'active' });

    // Get average ratings
    const averageRatings = await Rating.calculateUserAverageRating(userId);

    res.status(200).json({
      success: true,
      data: {
        ratings,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRatings: total,
          limit
        },
        averageRatings
      }
    });

  } catch (error) {
    console.error('Error getting user ratings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user ratings',
      error: error.message
    });
  }
};

// Get rating statistics for a user
exports.getUserRatingStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get overall statistics
    const averageRatings = await Rating.calculateUserAverageRating(userId);    // Get rating distribution
    const ratingDistribution = await Rating.aggregate([
      { $match: { ratedUser: new mongoose.Types.ObjectId(userId), status: 'active' } },
      {
        $group: {
          _id: { $floor: '$overallRating' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Get recent ratings
    const recentRatings = await Rating.getUserRecentRatings(userId, 5);

    res.status(200).json({
      success: true,
      data: {
        averageRatings,
        ratingDistribution,
        recentRatings
      }
    });

  } catch (error) {
    console.error('Error getting user rating stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user rating statistics',
      error: error.message
    });
  }
};

// Update a rating (only by the employer who created it)
exports.updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { detailedRatings, feedback, wouldRecommend } = req.body;

    const rating = await Rating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Check if the user is the one who created the rating
    if (rating.ratedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own ratings'
      });
    }

    // Check if rating is too old to update (e.g., 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (rating.createdAt < thirtyDaysAgo) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update ratings older than 30 days'
      });
    }

    // Update rating
    if (detailedRatings) rating.detailedRatings = detailedRatings;
    if (feedback !== undefined) rating.feedback = feedback;
    if (wouldRecommend !== undefined) rating.wouldRecommend = wouldRecommend;

    await rating.save();

    // Update user's rating stats
    await updateUserRatingStats(rating.ratedUser);

    await rating.populate([
      { path: 'ratedBy', select: 'companyName profilePicture' },
      { path: 'ratedUser', select: 'firstName lastName profilePicture' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Rating updated successfully',
      data: rating
    });

  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update rating',
      error: error.message
    });
  }
};

// Delete a rating (mark as removed)
exports.deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;

    const rating = await Rating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found'
      });
    }

    // Check if the user is the one who created the rating
    if (rating.ratedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own ratings'
      });
    }

    // Mark as removed instead of actually deleting
    rating.status = 'removed';
    await rating.save();

    // Update user's rating stats
    await updateUserRatingStats(rating.ratedUser);

    res.status(200).json({
      success: true,
      message: 'Rating removed successfully'
    });

  } catch (error) {
    console.error('Error deleting rating:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete rating',
      error: error.message
    });
  }
};

// Helper function to update user's rating statistics
async function updateUserRatingStats(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const stats = await Rating.calculateUserAverageRating(userId);

    // Calculate recommendation rate
    const totalRatings = await Rating.countDocuments({ 
      ratedUser: userId, 
      status: 'active' 
    });
    
    const recommendedRatings = await Rating.countDocuments({ 
      ratedUser: userId, 
      status: 'active',
      wouldRecommend: true 
    });
    
    const recommendationRate = totalRatings > 0 ? 
      Math.round((recommendedRatings / totalRatings) * 100) : 0;

    // Update user's employment stats
    user.employmentStats.averageRating = Math.round(stats.averageRating * 10) / 10;
    user.employmentStats.totalReviews = stats.totalRatings;
    user.employmentStats.recommendationRate = recommendationRate;
    
    // Update detailed rating breakdown
    user.employmentStats.ratingBreakdown.punctuality = Math.round(stats.averagePunctuality * 10) / 10;
    user.employmentStats.ratingBreakdown.quality = Math.round(stats.averageQuality * 10) / 10;
    user.employmentStats.ratingBreakdown.professionalism = Math.round(stats.averageProfessionalism * 10) / 10;
    user.employmentStats.ratingBreakdown.communication = Math.round(stats.averageCommunication * 10) / 10;
    user.employmentStats.ratingBreakdown.reliability = Math.round(stats.averageReliability * 10) / 10;

    await user.save();
  } catch (error) {
    console.error('Error updating user rating stats:', error);
  }
}

module.exports = {
  createRating,
  getUserRatings,
  getUserRatingStats,
  updateRating,
  deleteRating
};
