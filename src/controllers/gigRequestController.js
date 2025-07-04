const GigRequest = require('../models/gigRequest');
const Employer = require('../models/employer');
const notificationService = require('../services/notificationService');
const mongoose = require('mongoose');

/**
 * Update only the status of a gig request
 * PATCH /api/gig-requests/:id/status
 */
exports.updateGigRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID'
      });
    }

    // Validate status value
    const validStatuses = ['draft', 'active', 'closed', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Must be one of: draft, active, closed, completed, cancelled'
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

    // Check if the user is authorized to update this gig request
    // Admins can update any gig request, employers can only update their own
    if (req.userType === 'employer' && gigRequest.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this gig request'
      });
    }

    // Update only the status
    gigRequest = await GigRequest.findByIdAndUpdate(
      id,
      { status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('employer', 'companyName email contactNumber');
    
    res.status(200).json({
      success: true,
      message: 'Gig request status updated successfully',
      data: gigRequest
    });
  } catch (error) {
    console.error('Error updating gig request status:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update gig request status',
      error: error.message
    });
  }
};

/**
 * Create a new gig request
 * POST /api/gig-requests
 */
exports.createGigRequest = async (req, res) => {
  try {
    // Ensure only employers can create gig requests
    if (req.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can create job posts'
      });
    }

    // Get employer ID from authenticated user
    const employerId = req.user._id;
    
    // Check if employer exists
    const employer = await Employer.findById(employerId);
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }

    // Validate required fields
    const { title, description, category, payRate, location, timeSlots } = req.body;
    
    if (!title || !description || !category || !payRate || !location || !timeSlots) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, category, payRate, location, timeSlots'
      });
    }

    // Validate timeSlots
    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one time slot is required'
      });
    }

    // Add employer ID to request body
    const gigRequestData = {
      ...req.body,
      employer: employerId,
      status: req.body.status || 'active' // Default to active
    };

    const gigRequest = new GigRequest(gigRequestData);
    await gigRequest.save();
    
    // Populate employer details for notification
    await gigRequest.populate('employer', 'companyName email contactNumber');
    
    // Send job alert notifications (async, don't wait for completion)
    if (notificationService && typeof notificationService.sendJobAlertNotifications === 'function') {
      notificationService.sendJobAlertNotifications(gigRequest)
        .then(result => {
          console.log(`Job notifications sent: ${result.notificationsSent} users notified`);
        })
        .catch(error => {
          console.error('Error sending job notifications:', error);
          // Don't fail the request if notifications fail
        });
    } else {
      console.log('Notification service not available - skipping notifications');
    }
    
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
    
    // Check if this is a public route (for job seekers) or authenticated route (for employers)
    const isPublicRoute = req.route.path === '/public';
    
    // If user is authenticated AND this is not a public route, filter by their employer ID
    if (req.user && req.user._id && !isPublicRoute) {
      filter.employer = req.user._id;
    }
    
    // For public routes, only show active jobs
    if (isPublicRoute) {
      filter.status = 'active';
    }
    
    // Basic filtering
    if (req.query.category) filter.category = req.query.category;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.city) filter['location.city'] = { $regex: req.query.city, $options: 'i' };
    // Only allow explicit employer filter if no user is authenticated (for admin purposes)
    if (req.query.employer && !req.user) filter.employer = new mongoose.Types.ObjectId(req.query.employer);
    
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
            from: 'gigapplies',
            localField: '_id',
            foreignField: 'gigRequest',
            as: 'applications'
          }
        },
        {
          $addFields: {
            applicationsCount: { $size: '$applications' }
          }
        },
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
                  contactNumber: 1,
                  logo: 1
                }
              }
            ]
          }
        },
        { $unwind: '$employer' },
        { $sort: { distance: 1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            applications: 0 // Remove the applications array from the response to keep it clean
          }
        }
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
    
    // Regular query without location filtering - use aggregation to include application count
    const GigApply = require('../models/gigApply');
    
    const aggregationPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'gigapplies',
          localField: '_id',
          foreignField: 'gigRequest',
          as: 'applications'
        }
      },
      {
        $addFields: {
          applicationsCount: { $size: '$applications' }
        }
      },
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
                contactNumber: 1,
                logo: 1
              }
            }
          ]
        }
      },
      { $unwind: '$employer' },
      { $sort: sortCriteria },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          applications: 0 // Remove the applications array from the response to keep it clean
        }
      }
    ];
    
    const gigRequests = await GigRequest.aggregate(aggregationPipeline);
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
    const { timeSlots, coverLetter } = req.body;
    
    // Get user ID from authenticated request (added by protect middleware)
    const userId = req.user._id;
    
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID format'
      });
    }
    
    // User exists because it's coming from authenticated request (middleware already verified)
    const user = req.user;
    
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
      status: 'applied',  // Use 'applied' instead of 'pending'
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
      status: 'pending',  // GigApply uses 'pending' as the initial status
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
      status: 'active',
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

/**
 * Get all jobs for authenticated employer
 * GET /api/employers/jobs
 */
exports.getEmployerJobs = async (req, res) => {
  try {
    if (req.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can access this route'
      });
    }

    const employerId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = { employer: employerId };
    
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Use aggregation to include application count
    const aggregationPipeline = [
      { $match: filter },
      {
        $lookup: {
          from: 'gigapplies',
          localField: '_id',
          foreignField: 'gigRequest',
          as: 'applications'
        }
      },
      {
        $addFields: {
          applicationsCount: { $size: '$applications' }
        }
      },
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
                contactNumber: 1,
                logo: 1
              }
            }
          ]
        }
      },
      { $unwind: '$employer' },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          applications: 0 // Remove the applications array from the response to keep it clean
        }
      }
    ];

    const jobs = await GigRequest.aggregate(aggregationPipeline);
    const total = await GigRequest.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: jobs.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: jobs
    });
  } catch (error) {
    console.error('Error getting employer jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employer jobs',
      error: error.message
    });
  }
};

/**
 * Get specific job by ID for employer
 * GET /api/employers/jobs/:id
 */
exports.getEmployerJobById = async (req, res) => {
  try {
    if (req.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can access this route'
      });
    }

    const { id } = req.params;
    const employerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID'
      });
    }

    const job = await GigRequest.findOne({ _id: id, employer: employerId })
      .populate('employer', 'companyName email contactNumber')
      .populate('applicants.user', 'fullName email contactNumber profileImage skills');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to view it'
      });
    }

    res.status(200).json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error getting employer job by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job details',
      error: error.message
    });
  }
};

/**
 * Update specific job for employer
 * PATCH /api/employers/jobs/:id
 */
exports.updateEmployerJob = async (req, res) => {
  try {
    if (req.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can access this route'
      });
    }

    const { id } = req.params;
    const employerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID'
      });
    }

    // Find the job and ensure it belongs to the employer
    let job = await GigRequest.findOne({ _id: id, employer: employerId });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to update it'
      });
    }

    // Update the job
    job = await GigRequest.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('employer', 'companyName email contactNumber');
    
    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: job
    });
  } catch (error) {
    console.error('Error updating employer job:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update job',
      error: error.message
    });
  }
};

/**
 * Delete specific job for employer
 * DELETE /api/employers/jobs/:id
 */
exports.deleteEmployerJob = async (req, res) => {
  try {
    if (req.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can access this route'
      });
    }

    const { id } = req.params;
    const employerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID'
      });
    }

    const job = await GigRequest.findOne({ _id: id, employer: employerId });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to delete it'
      });
    }

    await GigRequest.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employer job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error.message
    });
  }
};

/**
 * Start a filled job (change status from filled to in_progress)
 * PATCH /api/employers/jobs/:id/start
 */
exports.startJob = async (req, res) => {
  try {
    if (req.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can access this route'
      });
    }

    const { id } = req.params;
    const employerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID'
      });
    }

    const job = await GigRequest.findOne({ _id: id, employer: employerId });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to start it'
      });
    }

    // Check if job can be started (must be filled)
    if (job.status !== 'filled') {
      return res.status(400).json({
        success: false,
        message: 'Job must be filled before it can be started'
      });
    }

    // Update job status to in_progress
    const updatedJob = await GigRequest.findByIdAndUpdate(
      id,
      { 
        status: 'in_progress',
        startedAt: new Date()
      },
      { new: true }
    );

    // Initialize gig completion record
    const GigCompletion = require('../models/gigCompletion');
    const GigApply = require('../models/gigApply');
    
    try {
      // Find all hired applicants for this gig
      const hiredApplications = await GigApply.find({
        gigRequest: id,
        status: 'accepted'
      }).populate('user');

      if (hiredApplications.length > 0) {
        // Create worker entries from hired applications
        const workers = hiredApplications.map(application => {
          // Map time slots from application to completion format
          const completedTimeSlots = application.timeSlots.map(slot => ({
            timeSlotId: slot.timeSlotId,
            date: slot.date,
            actualStartTime: slot.startTime,
            actualEndTime: slot.endTime,
            hoursWorked: (new Date(slot.endTime) - new Date(slot.startTime)) / (1000 * 60 * 60),
            breakTime: 0
          }));

          // Determine rate and rate type from the gig request
          const baseRate = job.payRate.amount;
          const rateType = job.payRate.rateType;
          
          return {
            worker: application.user._id,
            application: application._id,
            completedTimeSlots,
            payment: {
              status: 'pending',
              amount: 0, // Will be calculated later
              calculationDetails: {
                baseRate,
                rateType,
                totalHours: 0, // Will be calculated later
                overtimeHours: 0,
                overtimeRate: baseRate * 1.5,
              }
            }
          };
        });

        // Create the gig completion record
        const gigCompletion = new GigCompletion({
          gigRequest: id,
          employer: employerId,
          status: 'in_progress',
          workers,
          paymentSummary: {
            totalAmount: 0, // Will be calculated by pre-save hook
            finalAmount: 0  // Will be calculated by pre-save hook
          }
        });

        await gigCompletion.save();
      }
    } catch (completionError) {
      console.error('Error creating gig completion record:', completionError);
      // Don't fail the job start if completion record creation fails
    }

    res.status(200).json({
      success: true,
      message: 'Job started successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Error starting job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start job',
      error: error.message
    });
  }
};

/**
 * Complete a started job (change status from in_progress to completed)
 * PATCH /api/employers/jobs/:id/complete
 */
exports.completeJob = async (req, res) => {
  try {
    if (req.userType !== 'employer') {
      return res.status(403).json({
        success: false,
        message: 'Only employers can access this route'
      });
    }

    const { id } = req.params;
    const { completionNotes, completionProof } = req.body;
    const employerId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid job ID'
      });
    }

    const job = await GigRequest.findOne({ _id: id, employer: employerId });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or you do not have permission to complete it'
      });
    }

    // Check if job can be completed (must be in progress)
    if (job.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Job must be in progress before it can be completed'
      });
    }

    // Update job status to completed
    const updatedJob = await GigRequest.findByIdAndUpdate(
      id,
      { 
        status: 'completed',
        completedAt: new Date()
      },
      { new: true }
    );

    // Update the gig completion record if it exists
    const GigCompletion = require('../models/gigCompletion');
    
    try {
      const gigCompletion = await GigCompletion.findOne({ gigRequest: id });
      if (gigCompletion) {
        gigCompletion.status = 'completed';
        gigCompletion.completedAt = new Date();
        
        if (completionProof && Array.isArray(completionProof)) {
          gigCompletion.documentation.completionProof = completionProof;
        }
        
        if (completionNotes) {
          gigCompletion.documentation.notes = completionNotes;
        }
        
        await gigCompletion.save();
      }
    } catch (completionError) {
      console.error('Error updating gig completion record:', completionError);
      // Don't fail the job completion if completion record update fails
    }

    res.status(200).json({
      success: true,
      message: 'Job completed successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Error completing job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete job',
      error: error.message
    });
  }
};