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
    const { gigRequestId, timeSlots, coverLetter } = req.body;
    
    // Get user ID from authenticated request (added by protect middleware)
    const userId = req.user._id;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(gigRequestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID'
      });
    }

    // User exists because it's coming from authenticated request (middleware already verified)
    const user = req.user;

    // Check if user is a job seeker
    if (req.userType !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only registered users can apply for jobs'
      });
    }

    // Check if gig request exists
    const gigRequest = await GigRequest.findById(gigRequestId);
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Job post not found'
      });
    }

    // Check if gig is still open for applications
    if (!gigRequest.isAcceptingApplications()) {
      return res.status(400).json({
        success: false,
        message: 'This job is no longer accepting applications'
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
        message: 'You have already applied for this job'
      });
    }

    // Validate time slots
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one time slot must be selected'
      });
    }

    // Validate each time slot exists in the gig request
    for (let timeSlot of timeSlots) {
      const gigTimeSlot = gigRequest.timeSlots.find(ts => ts._id.toString() === timeSlot.timeSlotId);
      if (!gigTimeSlot) {
        return res.status(400).json({
          success: false,
          message: 'One or more selected time slots are invalid'
        });
      }
    }

    // Create application
    const gigApply = new GigApply({
      user: userId,
      gigRequest: gigRequestId,
      timeSlots,
      coverLetter,
      status: 'pending',
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

    // Populate response data
    await gigApply.populate([
      { path: 'user', select: 'fullName email contactNumber' },
      { path: 'gigRequest', select: 'title employer' }
    ]);

    // Send notification to employer
    try {
      const employer = await Employer.findById(gigRequest.employer);
      if (employer) {
        await notificationService.sendNewApplicationNotification(employer, gigApply);
      }
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

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
    const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
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
    );

    // Update filledPositions count based on status change
    if (status === 'accepted') {
      await GigRequest.findByIdAndUpdate(
        application.gigRequest,
        { $inc: { filledPositions: 1 } }
      );
    }
    
    // If previously accepted and now rejected/withdrawn, decrease count
    const previousApplication = await GigApply.findById(id);
    if (previousApplication && previousApplication.status === 'accepted' && status !== 'accepted') {
      await GigRequest.findByIdAndUpdate(
        application.gigRequest,
        { $inc: { filledPositions: -1 } }
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
    
    // Check if the application can be deleted (only if it's not accepted)
    if (application.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an application with accepted status'
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
    const { gigRequestId } = req.body;
    
    // Get user ID from authenticated request (added by protect middleware)
    const userId = req.user._id;

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(gigRequestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID'
      });
    }

    // User exists because it's coming from authenticated request (middleware already verified)
    const user = req.user;

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
      status: 'pending',
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
            status: 'pending',
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
        select: 'title description status employer payRate location filledPositions totalPositions startDate endDate',
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

/**
 * Get all applications for employer's gigs
 * GET /api/gig-applications/employer
 */
exports.getEmployerApplications = async (req, res) => {
  try {
    const employerId = req.user._id;
    
    // Get all gig requests from this employer
    const employerGigs = await GigRequest.find({ employer: employerId }).select('_id');
    const gigRequestIds = employerGigs.map(gig => gig._id);
    
    if (gigRequestIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          applications: [],
          total: 0,
          page: 1,
          pages: 0
        }
      });
    }
    
    // Build filter object
    const filter = { gigRequest: { $in: gigRequestIds } };
    
    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Add specific gig filter if provided
    if (req.query.gigRequestId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.gigRequestId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid gig request ID'
        });
      }
      filter.gigRequest = req.query.gigRequestId;
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
        path: 'user',
        select: 'firstName lastName email profilePicture university faculty yearOfStudy bio rating'
      })
      .populate({
        path: 'gigRequest',
        select: 'title status location payRate'
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await GigApply.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: {
        applications,
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting employer applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employer applications',
      error: error.message
    });
  }
};

/**
 * Get applications for a specific gig request (employer only)
 * GET /api/gig-applications/employer/gig-request/:gigRequestId
 */
exports.getApplicationsForEmployerGig = async (req, res) => {
  try {
    const { gigRequestId } = req.params;
    const employerId = req.user._id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(gigRequestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID'
      });
    }
    
    // Verify that the gig belongs to this employer
    const gigRequest = await GigRequest.findOne({ _id: gigRequestId, employer: employerId });
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Gig request not found or you do not have permission to view its applications'
      });
    }
    
    // Build filter object
    const filter = { gigRequest: gigRequestId };
    
    // Add status filter if provided
    if (req.query.status) {
      filter.status = req.query.status;
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
        path: 'user',
        select: 'firstName lastName email profilePicture university faculty yearOfStudy bio rating'
      })
      .populate({
        path: 'gigRequest',
        select: 'title status location payRate'
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await GigApply.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: {
        applications,
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting applications for employer gig:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get applications for gig',
      error: error.message
    });
  }
};

/**
 * Get a specific application by ID (employer only)
 * GET /api/gig-applications/employer/:id
 */
exports.getApplicationByIdForEmployer = async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = req.user._id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }
    
    // Get application and verify employer ownership
    const application = await GigApply.findById(id)
      .populate({
        path: 'user',
        select: 'firstName lastName email profilePicture university faculty yearOfStudy bio rating'
      })
      .populate({
        path: 'gigRequest',
        select: 'title status location payRate employer'
      });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Verify that the gig belongs to this employer
    if (application.gigRequest.employer.toString() !== employerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this application'
      });
    }
    
    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Error getting application for employer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get application',
      error: error.message
    });
  }
};

/**
 * Update application status (employer only)
 * PATCH /api/gig-applications/employer/:id/status
 */
exports.updateApplicationStatusByEmployer = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback, feedbackRating } = req.body;
    const employerId = req.user._id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }
    
    // Check if status is valid for employer actions
    const validStatuses = ['pending', 'reviewed', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    // Get application and verify employer ownership
    const application = await GigApply.findById(id).populate('gigRequest');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Verify that the gig belongs to this employer
    if (application.gigRequest.employer.toString() !== employerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this application'
      });
    }
    
    // Update application
    const previousStatus = application.status;
    const updateData = { 
      status,
      lastUpdated: Date.now() 
    };
    
    if (feedback) {
      updateData.feedback = feedback;
    }
    
    if (feedbackRating) {
      updateData.feedbackRating = feedbackRating;
    }
    
    const updatedApplication = await GigApply.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate({
      path: 'user',
      select: 'firstName lastName email profilePicture university faculty yearOfStudy bio rating'
    }).populate({
      path: 'gigRequest',
      select: 'title status location payRate'
    });

    // Map backend status to frontend status for gigRequest applicants array
    let applicantStatus = status;
    if (status === 'accepted') applicantStatus = 'hired';
    else if (status === 'reviewed') applicantStatus = 'shortlisted';

    // Update the status in the gigRequest's applicants array
    await GigRequest.updateOne(
      { 
        _id: application.gigRequest._id,
        'applicants.user': application.user._id 
      },
      { 
        $set: { 'applicants.$.status': applicantStatus }
      }
    );

    // Handle filledPositions count updates
    if (status === 'accepted' && previousStatus !== 'accepted') {
      // Accepting for the first time - increment count
      const updatedGig = await GigRequest.findByIdAndUpdate(
        application.gigRequest._id,
        { $inc: { filledPositions: 1 } },
        { new: true }
      );
      
      // Check if job is now filled and update status accordingly
      if (updatedGig && updatedGig.filledPositions >= updatedGig.totalPositions && updatedGig.status === 'active') {
        await GigRequest.findByIdAndUpdate(
          application.gigRequest._id,
          { status: 'filled' }
        );
      }
    } else if (previousStatus === 'accepted' && status !== 'accepted') {
      // Changing from accepted to something else - decrement count
      const updatedGig = await GigRequest.findByIdAndUpdate(
        application.gigRequest._id,
        { $inc: { filledPositions: -1 } },
        { new: true }
      );
      
      // If job was filled but now has open positions, change back to active
      if (updatedGig && updatedGig.filledPositions < updatedGig.totalPositions && updatedGig.status === 'filled') {
        await GigRequest.findByIdAndUpdate(
          application.gigRequest._id,
          { status: 'active' }
        );
      }
    }
    
    // Send application status update notification
    try {
      const user = await User.findById(application.user);
      if (user) {
        await notificationService.sendApplicationStatusUpdate(user, application.gigRequest, status);
      }
    } catch (notificationError) {
      console.error('Error sending application status notification:', notificationError);
      // Don't fail the entire operation if notification fails
    }
    
    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: updatedApplication
    });
  } catch (error) {
    console.error('Error updating application status by employer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
      error: error.message
    });
  }
};

/**
 * Get applicant profile (employer only)
 * GET /api/gig-applications/employer/applicant/:userId
 */
exports.getApplicantProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const employerId = req.user._id;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Verify that there's at least one application from this user to employer's gigs
    const employerGigs = await GigRequest.find({ employer: employerId }).select('_id');
    const gigRequestIds = employerGigs.map(gig => gig._id);
    
    const applicationExists = await GigApply.findOne({
      user: userId,
      gigRequest: { $in: gigRequestIds }
    });
    
    if (!applicationExists) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this user profile'
      });
    }
    
    // Get user profile
    const user = await User.findById(userId).select('-password -refreshTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting applicant profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get applicant profile',
      error: error.message
    });
  }
};

/**
 * Get applications statistics for employer
 * GET /api/gig-applications/employer/stats
 */
exports.getEmployerApplicationsStats = async (req, res) => {
  try {
    const employerId = req.user._id;
    
    // Get all gig requests from this employer
    const employerGigs = await GigRequest.find({ employer: employerId }).select('_id');
    const gigRequestIds = employerGigs.map(gig => gig._id);
    
    if (gigRequestIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          pending: 0,
          reviewed: 0,
          accepted: 0,
          rejected: 0,
          withdrawn: 0
        }
      });
    }
    
    // Get statistics
    const stats = await GigApply.aggregate([
      { $match: { gigRequest: { $in: gigRequestIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Format the response
    const result = {
      total: 0,
      pending: 0,
      reviewed: 0,
      accepted: 0,
      rejected: 0,
      withdrawn: 0
    };
    
    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting employer application stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get application statistics',
      error: error.message
    });
  }
};

/**
 * Accept an application (employer only)
 * PATCH /api/employers/applications/:id/accept
 */
exports.acceptApplication = async (req, res) => {
  try {
    if (req.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can accept applications'
      });
    }

    const { id } = req.params;
    const employerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    // Find application and verify it belongs to employer's job
    const application = await GigApply.findById(id)
      .populate('gigRequest')
      .populate('user', 'fullName email contactNumber');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Verify the gig belongs to the employer
    if (application.gigRequest.employer.toString() !== employerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only accept applications for your own jobs'
      });
    }

    // Check if application is in a state that can be accepted
    if (!['pending', 'reviewed'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Application cannot be accepted in its current state'
      });
    }

    // Update application status
    const oldStatus = application.status;
    application.status = 'accepted';
    application.lastUpdated = new Date();
    if (req.body.employerFeedback) {
      application.employerFeedback = req.body.employerFeedback;
    }
    await application.save();

    // Update the corresponding applicant in gigRequest
    await GigRequest.findByIdAndUpdate(
      application.gigRequest._id,
      {
        $set: {
          'applicants.$[elem].status': 'hired'
        }
      },
      {
        arrayFilters: [{ 'elem.user': application.user._id }]
      }
    );

    // Update filledPositions count (only if not already accepted)
    if (oldStatus !== 'accepted') {
      const updatedGig = await GigRequest.findByIdAndUpdate(
        application.gigRequest._id,
        { $inc: { filledPositions: 1 } },
        { new: true }
      );
      
      // Check if job is now filled and update status accordingly
      if (updatedGig && updatedGig.filledPositions >= updatedGig.totalPositions && updatedGig.status === 'active') {
        await GigRequest.findByIdAndUpdate(
          application.gigRequest._id,
          { status: 'filled' }
        );
      }
    }

    // Send notification to user
    try {
      await notificationService.sendApplicationAcceptedNotification(
        application.user,
        application.gigRequest
      );
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Application accepted successfully',
      data: application
    });

  } catch (error) {
    console.error('Error accepting application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept application',
      error: error.message
    });
  }
};

/**
 * Reject an application (employer only)
 * PATCH /api/employers/applications/:id/reject
 */
exports.rejectApplication = async (req, res) => {
  try {
    if (req.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can reject applications'
      });
    }

    const { id } = req.params;
    const employerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    // Find application and verify it belongs to employer's job
    const application = await GigApply.findById(id)
      .populate('gigRequest')
      .populate('user', 'fullName email contactNumber');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Verify the gig belongs to the employer
    if (application.gigRequest.employer.toString() !== employerId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only reject applications for your own jobs'
      });
    }

    // Check if application is in a state that can be rejected
    if (!['pending', 'reviewed'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Application cannot be rejected in its current state'
      });
    }

    // Update application status
    const oldStatus = application.status;
    application.status = 'rejected';
    application.lastUpdated = new Date();
    if (req.body.employerFeedback) {
      application.employerFeedback = req.body.employerFeedback;
    }
    await application.save();

    // Update the corresponding applicant in gigRequest
    await GigRequest.findByIdAndUpdate(
      application.gigRequest._id,
      {
        $set: {
          'applicants.$[elem].status': 'rejected'
        }
      },
      {
        arrayFilters: [{ 'elem.user': application.user._id }]
      }
    );

    // If was previously accepted, decrease filledPositions count
    if (oldStatus === 'accepted') {
      const updatedGig = await GigRequest.findByIdAndUpdate(
        application.gigRequest._id,
        { $inc: { filledPositions: -1 } },
        { new: true }
      );
      
      // If job was filled but now has open positions, change back to active
      if (updatedGig && updatedGig.filledPositions < updatedGig.totalPositions && updatedGig.status === 'filled') {
        await GigRequest.findByIdAndUpdate(
          application.gigRequest._id,
          { status: 'active' }
        );
      }
    }

    // Send notification to user
    try {
      await notificationService.sendApplicationRejectedNotification(
        application.user,
        application.gigRequest,
        req.body.employerFeedback
      );
    } catch (notificationError) {
      console.error('Failed to send notification:', notificationError);
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Application rejected successfully',
      data: application
    });

  } catch (error) {
    console.error('Error rejecting application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject application',
      error: error.message
    });
  }
};

/**
 * Withdraw application (user only)
 * DELETE /api/gig-applications/:id/withdraw
 */
exports.withdrawApplication = async (req, res) => {
  try {
    if (req.userType !== 'user') {
      return res.status(403).json({
        success: false,
        message: 'Only users can withdraw their applications'
      });
    }

    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID'
      });
    }

    // Find application and verify it belongs to the user
    const application = await GigApply.findOne({ _id: id, user: userId })
      .populate('gigRequest');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found or you do not have permission to withdraw it'
      });
    }

    // Check if application can be withdrawn
    if (!['pending', 'reviewed'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: 'Application cannot be withdrawn in its current state'
      });
    }

    // Update application status
    const oldStatus = application.status;
    application.status = 'withdrawn';
    application.lastUpdated = new Date();
    await application.save();

    // Remove applicant from gigRequest
    await GigRequest.findByIdAndUpdate(
      application.gigRequest._id,
      {
        $pull: {
          applicants: { user: userId }
        }
      }
    );

    // If was previously accepted, decrease filledPositions count
    if (oldStatus === 'accepted') {
      await GigRequest.findByIdAndUpdate(
        application.gigRequest._id,
        { $inc: { filledPositions: -1 } }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Application withdrawn successfully',
      data: application
    });

  } catch (error) {
    console.error('Error withdrawing application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw application',
      error: error.message
    });
  }
};
