const GigRequest = require('../models/gigRequest');
const Employer = require('../models/employer');
const mongoose = require('mongoose');

/**
 * Create a new gig request
 * POST /api/gig-requests
 */
exports.createGigRequest = async (req, res) => {
  try {
    // Check if employer exists
    const employer = await Employer.findById(req.body.employer);
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    const gigRequest = new GigRequest(req.body);
    await gigRequest.save();
    
    res.status(201).json({
      success: true,
      message: 'Gig request created successfully',
      data: gigRequest
    });
  } catch (error) {
    console.error('Error creating gig request:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create gig request',
      error: error.message
    });
  }
};

/**
 * Update a gig request
 * PATCH /api/gig-requests/:id
 */
exports.updateGigRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID'
      });
    }

    // Find the gig request
    let gigRequest = await GigRequest.findById(id);
    
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Gig request not found'
      });
    }

    // Update the gig request
    gigRequest = await GigRequest.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Gig request updated successfully',
      data: gigRequest
    });
  } catch (error) {
    console.error('Error updating gig request:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update gig request',
      error: error.message
    });
  }
};

/**
 * Get all gig requests with filtering and pagination
 * GET /api/gig-requests
 */
exports.getAllGigRequests = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtering options
    const filter = {};
    
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.city) filter['location.city'] = req.query.city;
    if (req.query.employer) filter.employer = req.query.employer;
    
    // Date filtering
    if (req.query.fromDate) {
      filter['timeSlots.date'] = { $gte: new Date(req.query.fromDate) };
    }
    
    // Search by keyword in title or description
    if (req.query.keyword) {
      filter.$or = [
        { title: { $regex: req.query.keyword, $options: 'i' } },
        { description: { $regex: req.query.keyword, $options: 'i' } }
      ];
    }

    // Execute query with populate
    const gigRequests = await GigRequest.find(filter)
      .populate('employer', 'companyName email contactNumber')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Count total documents for pagination info
    const total = await GigRequest.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: gigRequests.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: gigRequests
    });
  } catch (error) {
    console.error('Error getting gig requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gig requests',
      error: error.message
    });
  }
};

/**
 * Get a single gig request by ID
 * GET /api/gig-requests/:id
 */
exports.getGigRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID'
      });
    }

    const gigRequest = await GigRequest.findById(id)
      .populate('employer', 'companyName email contactNumber');
    
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Gig request not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: gigRequest
    });
  } catch (error) {
    console.error('Error getting gig request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gig request',
      error: error.message
    });
  }
};

/**
 * Get gig requests by user ID (for applicants)
 * GET /api/gig-requests/user/:userId
 */
exports.getGigRequestsByUserId = async (req, res) => {
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
    
    // Find gigs where the user has applied
    const gigRequests = await GigRequest.find({
      'applicants.user': userId
    })
      .populate('employer', 'companyName email contactNumber')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Count total for pagination
    const total = await GigRequest.countDocuments({ 'applicants.user': userId });
    
    res.status(200).json({
      success: true,
      count: gigRequests.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: gigRequests
    });
  } catch (error) {
    console.error('Error getting user\'s gig requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gig requests for user',
      error: error.message
    });
  }
};

/**
 * Get gig requests by employer ID
 * GET /api/gig-requests/employer/:employerId
 */
exports.getGigRequestsByEmployerId = async (req, res) => {
  try {
    const { employerId } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(employerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employer ID'
      });
    }

    // Check if employer exists
    const employer = await Employer.findById(employerId);
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Find gigs posted by the employer
    const gigRequests = await GigRequest.find({ employer: employerId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    
    // Count total for pagination
    const total = await GigRequest.countDocuments({ employer: employerId });
    
    res.status(200).json({
      success: true,
      count: gigRequests.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: gigRequests
    });
  } catch (error) {
    console.error('Error getting employer\'s gig requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve gig requests for employer',
      error: error.message
    });
  }
};

/**
 * Delete a gig request
 * DELETE /api/gig-requests/:id
 */
exports.deleteGigRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID'
      });
    }

    const gigRequest = await GigRequest.findByIdAndDelete(id);
    
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Gig request not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Gig request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting gig request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete gig request',
      error: error.message
    });
  }
};