const GigApply = require('../models/gigApply');
const GigRequest = require('../models/gigRequest');
const User = require('../models/user');
const notificationService = require('../services/notificationService');
const mongoose = require('mongoose');

/**
 * Apply for a gig
 * POST /api/gig-applications
 */
exports.applyForGig = async (req, res) => {
  try {
    const { userId, gigRequestId, timeSlots, coverLetter } = req.body;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(gigRequestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or gig request ID'
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if gig request exists
    const gigRequest = await GigRequest.findById(gigRequestId);
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Gig request not found'
      });
    }

    // Check if gig is still open for applications
    if (!gigRequest.isAcceptingApplications()) {
      return res.status(400).json({
        success: false,
        message: 'This gig is no longer accepting applications'
      });
    }

    // Check if user has already applied
    const existingApplication = await GigApply.findOne({
      user: userId,
      gigRequest: gigRequestId
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this gig'
      });
    }

    // Validate time slots
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one time slot must be selected'
      });
    }

    // Create application
    const gigApply = new GigApply({
      user: userId,
      gigRequest: gigRequestId,
      timeSlots,
      coverLetter,
      status: 'applied',
      appliedAt: new Date()
    });

    await gigApply.save();

    // Update the gigRequest with the new applicant
    await GigRequest.findByIdAndUpdate(
      gigRequestId,
      {
        $push: {
          applicants: {
            user: userId,
            status: 'applied',
            appliedAt: new Date(),
            coverLetter
          }
        }
      }
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: gigApply
    });
  } catch (error) {
    console.error('Error applying for gig:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to apply for gig',
      error: error.message
    });
  }
};

/**
 * Update gig application status
 * PATCH /api/gig-applications/:id/status
 */
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    // Check if status is valid
    const validStatuses = ['applied', 'shortlisted', 'hired', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Find the application
    let application = await GigApply.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Update application status
    application = await GigApply.findByIdAndUpdate(
      id,
      { 
        status,
        lastUpdated: Date.now() 
      },
      { new: true }
    );

    // Update the status in the gigRequest's applicants array
    await GigRequest.updateOne(
      { 
        _id: application.gigRequest,
        'applicants.user': application.user 
      },
      { 
        $set: { 'applicants.$.status': status }
      }
    );    // If the user is hired, update the filledPositions count
    if (status === 'hired') {
      await GigRequest.findByIdAndUpdate(
        application.gigRequest,
        { $inc: { filledPositions: 1 } }
      );
    }

    // Send application status update notification
    try {
      const user = await User.findById(application.user);
      const gigRequest = await GigRequest.findById(application.gigRequest);
      
      if (user && gigRequest) {
        await notificationService.sendApplicationStatusUpdate(user, gigRequest, status);
      }
    } catch (notificationError) {
      console.error('Error sending application status notification:', notificationError);
      // Don't fail the entire operation if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update application status',
      error: error.message
    });
  }
};

/**
 * Get all applications for a specific gig request
 * GET /api/gig-applications/gig/:gigRequestId
 */
exports.getApplicationsByGigRequestId = async (req, res) => {
  try {
    const { gigRequestId } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(gigRequestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID'
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtering by status
    const filter = { gigRequest: gigRequestId };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const applications = await GigApply.find(filter)
      .populate('user', '-password')
      .skip(skip)
      .limit(limit)
      .sort({ appliedAt: -1 });
    
    const total = await GigApply.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: applications
    });
  } catch (error) {
    console.error('Error getting applications for gig:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications',
      error: error.message
    });
  }
};

/**
 * Get all applications from a specific user
 * GET /api/gig-applications/user/:userId
 */
exports.getApplicationsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtering by status
    const filter = { user: userId };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const applications = await GigApply.find(filter)
      .populate('gigRequest')
      .skip(skip)
      .limit(limit)
      .sort({ appliedAt: -1 });
    
    const total = await GigApply.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: applications
    });
  } catch (error) {
    console.error('Error getting user applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications',
      error: error.message
    });
  }
};

/**
 * Get a specific application by ID
 * GET /api/gig-applications/:id
 */
exports.getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    const application = await GigApply.findById(id)
      .populate('user', '-password')
      .populate('gigRequest');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error getting application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve application',
      error: error.message
    });
  }
};

/**
 * Delete an application
 * DELETE /api/gig-applications/:id
 */
exports.deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    const application = await GigApply.findById(id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Check if the application can be deleted (only if it's not hired)
    if (application.status === 'hired') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an application with hired status'
      });
    }
    
    // Get application details before deletion
    const { gigRequest, user } = application;
    
    // Delete from GigApply collection
    await GigApply.findByIdAndDelete(id);
    
    // Remove from applicants array in GigRequest
    await GigRequest.updateOne(
      { _id: gigRequest },
      { $pull: { applicants: { user } } }
    );
    
    res.status(200).json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete application',
      error: error.message
    });
  }
};

/**
 * Update application feedback
 * PATCH /api/gig-applications/:id/feedback
 */
exports.updateApplicationFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { employerFeedback } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }
    
    // Find the application
    let application = await GigApply.findById(id);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Update application feedback
    application = await GigApply.findByIdAndUpdate(
      id,
      { 
        employerFeedback,
        lastUpdated: Date.now() 
      },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Application feedback updated successfully',
      data: application
    });
  } catch (error) {
    console.error('Error updating application feedback:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update application feedback',
      error: error.message
    });
  }
};

/**
 * One-click/Instant apply for a gig (mobile-optimized)
 * POST /api/gig-applications/instant-apply
 */
exports.instantApplyForGig = async (req, res) => {
  try {
    const { userId, gigRequestId } = req.body;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(gigRequestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID or gig request ID'
      });
    }    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user profile is complete enough for instant apply
    const profileCheck = user.isReadyForInstantApply();
    if (!profileCheck.ready) {
      return res.status(400).json({
        success: false,
        message: 'Profile incomplete for instant apply',
        missingFields: profileCheck.missing,
        suggestion: 'Please complete your profile to use instant apply feature'
      });
    }

    // Check if gig request exists
    const gigRequest = await GigRequest.findById(gigRequestId).populate('employer', 'companyName');
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Gig request not found'
      });
    }

    // Check if gig is still open for applications
    if (!gigRequest.isAcceptingApplications()) {
      return res.status(400).json({
        success: false,
        message: 'This gig is no longer accepting applications'
      });
    }

    // Check if user has already applied
    const existingApplication = await GigApply.findOne({
      user: userId,
      gigRequest: gigRequestId
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this gig'
      });
    }    // For instant apply, use intelligent defaults:
    // - Apply to all available time slots
    // - Generate personalized cover letter based on user profile
    const defaultCoverLetter = user.generateInstantApplyCoverLetter(gigRequest);

    // Apply to all time slots by default for instant apply
    const allTimeSlots = gigRequest.timeSlots.map(slot => ({
      slotId: slot._id,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime
    }));

    // Create application
    const gigApply = new GigApply({
      user: userId,
      gigRequest: gigRequestId,
      timeSlots: allTimeSlots,
      coverLetter: defaultCoverLetter,
      status: 'applied',
      appliedAt: new Date(),
      isInstantApply: true // Flag to track instant applications
    });

    await gigApply.save();

    // Update the gigRequest with the new applicant
    await GigRequest.findByIdAndUpdate(
      gigRequestId,
      {
        $push: {
          applicants: {
            user: userId,
            status: 'applied',
            appliedAt: new Date(),
            coverLetter: defaultCoverLetter
          }
        }
      }
    );

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully via instant apply!',
      data: {
        application: gigApply,
        appliedToAllSlots: allTimeSlots.length,
        gigTitle: gigRequest.title,
        company: gigRequest.employer.companyName
      }
    });
  } catch (error) {
    console.error('Error with instant apply:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to submit instant application',
      error: error.message
    });
  }
};

/**
 * Get current user's applications
 * GET /api/gig-applications/my-applications
 */
exports.getMyApplications = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Build filter object
    const filter = { user: userId };
    
    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Add archived filter if provided
    if (req.query.isArchived !== undefined) {
      filter.isArchived = req.query.isArchived === 'true';
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Sorting
    const sortBy = req.query.sortBy || 'appliedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };
    
    // Get applications with populated data
    const applications = await GigApply.find(filter)
      .populate({
        path: 'gigRequest',
        select: 'title employer payRate location',
        populate: {
          path: 'employer',
          select: 'companyName logo'
        }
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await GigApply.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: applications.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        applications
      }
    });
  } catch (error) {
    console.error('Error getting user applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user applications',
      error: error.message
    });
  }
};
