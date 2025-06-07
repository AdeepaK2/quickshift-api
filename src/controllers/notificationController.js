const User = require('../models/user');
const GigRequest = require('../models/gigRequest');
const notificationService = require('../services/notificationService');

/**
 * Get user's notification preferences
 * GET /api/notifications/preferences
 */
exports.getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences jobAlertPreferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        notificationPreferences: user.notificationPreferences,
        jobAlertPreferences: user.jobAlertPreferences
      }
    });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
      error: error.message
    });
  }
};

/**
 * Update user's notification preferences
 * PUT /api/notifications/preferences
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { notificationPreferences, jobAlertPreferences } = req.body;
    
    const updateData = {};
    if (notificationPreferences) {
      updateData.notificationPreferences = notificationPreferences;
    }
    if (jobAlertPreferences) {
      updateData.jobAlertPreferences = jobAlertPreferences;
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('notificationPreferences jobAlertPreferences');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        notificationPreferences: user.notificationPreferences,
        jobAlertPreferences: user.jobAlertPreferences
      }
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
};

/**
 * Test job alert notifications (admin only)
 * POST /api/notifications/test-job-alert
 */
exports.testJobAlert = async (req, res) => {
  try {
    const { gigRequestId, userId } = req.body;
    
    const gigRequest = await GigRequest.findById(gigRequestId)
      .populate('employer', 'companyName email contactNumber');
    
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Gig request not found'
      });
    }
    
    if (userId) {
      // Test for specific user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      await notificationService.sendJobAlertToUser(user, gigRequest);
      
      res.status(200).json({
        success: true,
        message: `Test notification sent to ${user.email}`
      });
    } else {
      // Test for all eligible users
      const result = await notificationService.sendJobAlertNotifications(gigRequest);
      
      res.status(200).json({
        success: true,
        message: `Test notifications sent to ${result.notificationsSent} users`
      });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
};

/**
 * Get personalized job recommendations
 * GET /api/notifications/recommendations
 */
exports.getJobRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Build query for job recommendations based on user preferences
    const query = {
      status: 'open',
      filledPositions: { $lt: { $add: ['$totalPositions'] } }
    };
    
    // Add user preference filters
    const prefs = user.jobAlertPreferences;
    if (prefs.preferredCategories && prefs.preferredCategories.length > 0) {
      query.category = { $in: prefs.preferredCategories };
    }
    
    if (prefs.minPayRate) {
      query['payRate.amount'] = { $gte: prefs.minPayRate };
    }
    
    if (prefs.maxPayRate) {
      if (query['payRate.amount']) {
        query['payRate.amount'].$lte = prefs.maxPayRate;
      } else {
        query['payRate.amount'] = { $lte: prefs.maxPayRate };
      }
    }
    
    if (prefs.payRateType) {
      query['payRate.rateType'] = prefs.payRateType;
    }
    
    // Skills matching
    if (prefs.preferredSkills && prefs.preferredSkills.length > 0) {
      query['requirements.skills'] = { $in: prefs.preferredSkills };
    }
    
    const recommendations = await GigRequest.find(query)
      .populate('employer', 'companyName')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Filter by distance if user has coordinates
    let filteredRecommendations = recommendations;
    if (user.coordinates && user.coordinates.latitude && user.coordinates.longitude) {
      filteredRecommendations = recommendations.filter(job => {
        if (!job.location.coordinates) return true;
        
        const distance = notificationService.calculateDistance(
          user.coordinates.latitude,
          user.coordinates.longitude,
          job.location.coordinates.latitude,
          job.location.coordinates.longitude
        );
        
        return distance <= prefs.maxDistance;
      });
    }
    
    res.status(200).json({
      success: true,
      count: filteredRecommendations.length,
      data: filteredRecommendations
    });
  } catch (error) {
    console.error('Error getting job recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job recommendations',
      error: error.message
    });
  }
};

/**
 * Send job recommendations email
 * POST /api/notifications/send-recommendations
 */
exports.sendJobRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get recommendations using the same logic as getJobRecommendations
    const query = {
      status: 'open',
      filledPositions: { $lt: { $add: ['$totalPositions'] } }
    };
    
    const prefs = user.jobAlertPreferences;
    if (prefs.preferredCategories && prefs.preferredCategories.length > 0) {
      query.category = { $in: prefs.preferredCategories };
    }
    
    const recommendations = await GigRequest.find(query)
      .populate('employer', 'companyName')
      .sort({ createdAt: -1 })
      .limit(5); // Limit for email
    
    if (recommendations.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No recommendations available at this time'
      });
    }
    
    await notificationService.sendJobRecommendations(user, recommendations);
    
    res.status(200).json({
      success: true,
      message: `Job recommendations sent to ${user.email}`,
      count: recommendations.length
    });
  } catch (error) {
    console.error('Error sending job recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send job recommendations',
      error: error.message
    });
  }
};

/**
 * Unsubscribe from notifications (public endpoint)
 * GET /api/notifications/unsubscribe/:token
 */
exports.unsubscribeFromNotifications = async (req, res) => {
  try {
    const { token } = req.params;
    
    // In a real implementation, you'd verify the token and extract user ID
    // For now, this is a placeholder
    
    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from notifications'
    });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe',
      error: error.message
    });
  }
};

module.exports = {
  getNotificationPreferences: exports.getNotificationPreferences,
  updateNotificationPreferences: exports.updateNotificationPreferences,
  testJobAlert: exports.testJobAlert,
  getJobRecommendations: exports.getJobRecommendations,
  sendJobRecommendations: exports.sendJobRecommendations,
  unsubscribeFromNotifications: exports.unsubscribeFromNotifications
};
