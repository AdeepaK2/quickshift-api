const GigRequest = require('../models/gigRequest');
const Employer = require('../models/employer');
const notificationService = require('../services/notificationService');
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
    
    // Populate employer details for notification
    await gigRequest.populate('employer', 'companyName email contactNumber');
    
    // Send job alert notifications (async, don't wait for completion)
    notificationService.sendJobAlertNotifications(gigRequest)
      .then(result => {
        console.log(`Job notifications sent: ${result.notificationsSent} users notified`);
      })
      .catch(error => {
        console.error('Error sending job notifications:', error);
        // Don't fail the request if notifications fail
      });
    
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
    
    // Build filter object
    const filter = {};
    
    // Basic filtering
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.city) filter['location.city'] = { $regex: req.query.city, $options: 'i' };
    if (req.query.employer) filter.employer = new mongoose.Types.ObjectId(req.query.employer);
    
    // Pay range filtering
    if (req.query.minPay || req.query.maxPay) {
      filter['payRate.amount'] = {};
      if (req.query.minPay) filter['payRate.amount'].$gte = parseFloat(req.query.minPay);
      if (req.query.maxPay) filter['payRate.amount'].$lte = parseFloat(req.query.maxPay);
    }
    
    // Pay type filtering
    if (req.query.payType) filter['payRate.rateType'] = req.query.payType;
    
    // Date filtering
    if (req.query.fromDate || req.query.toDate) {
      filter['timeSlots.date'] = {};
      if (req.query.fromDate) filter['timeSlots.date'].$gte = new Date(req.query.fromDate);
      if (req.query.toDate) filter['timeSlots.date'].$lte = new Date(req.query.toDate);
    }
    
    // Skills filtering
    if (req.query.skills) {
      const skillsArray = req.query.skills.split(',').map(skill => skill.trim());
      filter['requirements.skills'] = { $in: skillsArray };
    }
    
    // Search by keyword in title, description, or skills
    if (req.query.keyword) {
      filter.$or = [
        { title: { $regex: req.query.keyword, $options: 'i' } },
        { description: { $regex: req.query.keyword, $options: 'i' } },
        { 'requirements.skills': { $regex: req.query.keyword, $options: 'i' } }
      ];
    }
    
    // Location-based filtering (distance calculation)
    let sortCriteria = { createdAt: -1 };
    if (req.query.latitude && req.query.longitude) {
      const userLat = parseFloat(req.query.latitude);
      const userLng = parseFloat(req.query.longitude);
      const maxDistanceKm = parseInt(req.query.radius) || 10; // Default 10km
      
      // Use aggregation for location-based sorting and filtering
      const pipeline = [
        { $match: filter },
        {
          $addFields: {
            distance: {
              $sqrt: {
                $add: [
                  {
                    $pow: [
                      { $multiply: [
                        { $subtract: ["$location.coordinates.longitude", userLng] },
                        111.32 // Approximate km per degree longitude
                      ]}, 2
                    ]
                  },
                  {
                    $pow: [
                      { $multiply: [
                        { $subtract: ["$location.coordinates.latitude", userLat] },
                        110.54 // Approximate km per degree latitude
                      ]}, 2
                    ]
                  }
                ]
              }
            }
          }
        },
        { $match: { distance: { $lte: maxDistanceKm } } },
        {
          $lookup: {
            from: 'employers',
            localField: 'employer',
            foreignField: '_id',
            as: 'employer',
            pipeline: [
              {
                $project: {
                  companyName: 1,
                  email: 1,
                  contactNumber: 1
                }
              }
            ]
          }
        },
        { $unwind: '$employer' },
        { $sort: { distance: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ];
      
      const countPipeline = [
        { $match: filter },
        {
          $addFields: {
            distance: {
              $sqrt: {
                $add: [
                  {
                    $pow: [
                      { $multiply: [
                        { $subtract: ["$location.coordinates.longitude", userLng] },
                        111.32
                      ]}, 2
                    ]
                  },
                  {
                    $pow: [
                      { $multiply: [
                        { $subtract: ["$location.coordinates.latitude", userLat] },
                        110.54
                      ]}, 2
                    ]
                  }
                ]
              }
            }
          }
        },
        { $match: { distance: { $lte: maxDistanceKm } } },
        { $count: "total" }
      ];
      
      const [gigRequests, countResult] = await Promise.all([
        GigRequest.aggregate(pipeline),
        GigRequest.aggregate(countPipeline)
      ]);
      
      const total = countResult.length > 0 ? countResult[0].total : 0;
      
      return res.status(200).json({
        success: true,
        count: gigRequests.length,
        total,
        page,
        pages: Math.ceil(total / limit),
        data: gigRequests
      });
    }
    
    // Regular query without location filtering
    const gigRequests = await GigRequest.find(filter)
      .populate('employer', 'companyName email contactNumber')
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit);
    
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

/**
 * Apply for a gig request
 * POST /api/gig-requests/:id/apply
 */
exports.applyToGigRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, timeSlots, coverLetter } = req.body;
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format'
      });
    }
    
    // Check if user exists
    const user = await mongoose.model('User').findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Check if gig request exists
    const gigRequest = await GigRequest.findById(id);
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Gig request not found'
      });
    }
    
    // Check if the gig is accepting applications
    if (!gigRequest.isAcceptingApplications()) {
      return res.status(400).json({
        success: false,
        message: 'This gig is no longer accepting applications'
      });
    }
    
    // Check if user has already applied
    const existingApplicant = gigRequest.applicants.find(app => app.user.toString() === userId);
    if (existingApplicant) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this gig'
      });
    }
    
    // Add the applicant to the gig request
    gigRequest.applicants.push({
      user: userId,
      status: 'applied',
      appliedAt: Date.now(),
      coverLetter: coverLetter || ''
    });
    
    await gigRequest.save();
    
    // Create a record in GigApply collection as well for better tracking
    const GigApply = mongoose.model('GigApply');
    const application = new GigApply({
      user: userId,
      gigRequest: id,
      timeSlots: timeSlots || [],
      coverLetter: coverLetter || '',
      status: 'applied',
      appliedAt: Date.now()
    });
    
    await application.save();
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application,
        gigRequest
      }
    });
  } catch (error) {
    console.error('Error applying to gig request:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to apply for this gig',
      error: error.message
    });
  }
};

/**
 * Get jobs eligible for instant apply (mobile optimization)
 * GET /api/gig-requests/instant-apply-eligible
 */
exports.getInstantApplyEligibleJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Base filter for instant apply eligible jobs
    const filter = {
      status: 'open',
      filledPositions: { $lt: '$totalPositions' }
    };

    // Add location-based filtering if provided
    if (req.query.latitude && req.query.longitude) {
      const userLat = parseFloat(req.query.latitude);
      const userLng = parseFloat(req.query.longitude);
      const maxDistanceKm = parseInt(req.query.radius) || 25; // Default 25km for instant apply

      const pipeline = [
        { $match: filter },
        {
          $addFields: {
            distance: {
              $sqrt: {
                $add: [
                  {
                    $pow: [
                      { $multiply: [
                        { $subtract: ["$location.coordinates.longitude", userLng] },
                        111.32
                      ]}, 2
                    ]
                  },
                  {
                    $pow: [
                      { $multiply: [
                        { $subtract: ["$location.coordinates.latitude", userLat] },
                        110.54
                      ]}, 2
                    ]
                  }
                ]
              }
            },
            isInstantApplyEligible: {
              $and: [
                { $lte: [{ $size: { $ifNull: ["$requirements.skills", []] } }, 3] }, // Max 3 required skills
                { $gte: ["$payRate.amount", 15] }, // Minimum pay threshold
                { $ne: ["$requirements.experience", "required"] } // No strict experience requirements
              ]
            }
          }
        },
        { $match: { 
          distance: { $lte: maxDistanceKm },
          isInstantApplyEligible: true 
        }},
        {
          $lookup: {
            from: 'employers',
            localField: 'employer',
            foreignField: '_id',
            as: 'employer',
            pipeline: [
              {
                $project: {
                  companyName: 1,
                  email: 1,
                  contactNumber: 1
                }
              }
            ]
          }
        },
        { $unwind: '$employer' },
        { $sort: { distance: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ];

      const gigRequests = await GigRequest.aggregate(pipeline);
      const total = await GigRequest.aggregate([
        ...pipeline.slice(0, -2),
        { $count: "total" }
      ]);

      return res.status(200).json({
        success: true,
        count: gigRequests.length,
        total: total.length > 0 ? total[0].total : 0,
        page,
        pages: Math.ceil((total.length > 0 ? total[0].total : 0) / limit),
        data: gigRequests
      });
    }

    // Regular query without location
    const gigRequests = await GigRequest.find(filter)
      .populate('employer', 'companyName email contactNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filter for instant apply eligibility
    const instantApplyEligible = gigRequests.filter(gig => {
      const hasSimpleRequirements = (gig.requirements.skills || []).length <= 3;
      const hasDecentPay = gig.payRate.amount >= 15;
      const noStrictExperience = gig.requirements.experience !== 'required';
      
      return hasSimpleRequirements && hasDecentPay && noStrictExperience;
    });

    const total = await GigRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: instantApplyEligible.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: instantApplyEligible.map(gig => ({
        ...gig.toObject(),
        isInstantApplyEligible: true,
        instantApplyReasons: [
          'Simple requirements',
          'Competitive pay',
          'Entry-level friendly'
        ]
      }))
    });
  } catch (error) {
    console.error('Error getting instant apply eligible jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve instant apply eligible jobs',
      error: error.message
    });
  }
};