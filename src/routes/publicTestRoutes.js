const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Employer = require('../models/employer');
const GigRequest = require('../models/gigRequest');
const GigApply = require('../models/gigApply');
const GigCompletion = require('../models/gigCompletion');

// Test route to get basic stats without authentication
router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalUsers: await User.countDocuments(),
      totalEmployers: await Employer.countDocuments(),
      totalGigRequests: await GigRequest.countDocuments(),
      totalApplications: await GigApply.countDocuments(),
      totalCompletions: await GigCompletion.countDocuments(),
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Public API stats retrieved successfully',
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
});

// Test route to get recent gig requests (public view)
router.get('/recent-gigs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const gigRequests = await GigRequest.find()
      .select('title description location jobType payRange duration skillsRequired createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('employer', 'companyName email');

    const total = await GigRequest.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Recent gig requests retrieved successfully',
      data: {
        gigRequests,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get recent gigs',
      error: error.message
    });
  }
});

// Test route to search gigs by location or skill
router.get('/search-gigs', async (req, res) => {
  try {
    const { location, skill, jobType, minPay, maxPay } = req.query;
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    let query = {};

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (skill) {
      query.skillsRequired = { $regex: skill, $options: 'i' };
    }

    if (jobType) {
      query.jobType = jobType;
    }

    if (minPay || maxPay) {
      query.payRange = {};
      if (minPay) query.payRange.$gte = parseInt(minPay);
      if (maxPay) query.payRange.$lte = parseInt(maxPay);
    }

    const gigRequests = await GigRequest.find(query)
      .select('title description location jobType payRange duration skillsRequired createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('employer', 'companyName email');

    const total = await GigRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Gig search results retrieved successfully',
      data: {
        gigRequests,
        searchParams: { location, skill, jobType, minPay, maxPay },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search gigs',
      error: error.message
    });
  }
});

// Test route to get user profiles (limited info for public view)
router.get('/profiles/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('firstName lastName skills location averageRating totalJobs profilePicture createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await User.countDocuments();

    res.status(200).json({
      success: true,
      message: 'User profiles retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get user profiles',
      error: error.message
    });
  }
});

// Test route to get employer profiles (limited info for public view)
router.get('/profiles/employers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const employers = await Employer.find()
      .select('companyName industry location description website averageRating totalGigsPosted createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Employer.countDocuments();

    res.status(200).json({
      success: true,
      message: 'Employer profiles retrieved successfully',
      data: {
        employers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get employer profiles',
      error: error.message
    });
  }
});

// Test route for API documentation/endpoints listing
router.get('/endpoints', (req, res) => {
  const endpoints = {
    public_endpoints: {
      health: 'GET /api/health',
      welcome: 'GET /',
      public_stats: 'GET /api/public/stats',
      recent_gigs: 'GET /api/public/recent-gigs?limit=10&page=1',
      search_gigs: 'GET /api/public/search-gigs?location=city&skill=nodejs&jobType=remote',
      user_profiles: 'GET /api/public/profiles/users?limit=10&page=1',
      employer_profiles: 'GET /api/public/profiles/employers?limit=10&page=1',
      all_users: 'GET /api/users',
      user_by_id: 'GET /api/users/:id',
      create_user: 'POST /api/users',
      all_employers: 'GET /api/employers',
      employer_by_id: 'GET /api/employers/:id',
      create_employer: 'POST /api/employers',
      all_gig_requests: 'GET /api/gig-requests',
      gig_request_by_id: 'GET /api/gig-requests/:id',
      gig_requests_by_user: 'GET /api/gig-requests/user/:userId',
      gig_requests_by_employer: 'GET /api/gig-requests/employer/:employerId',
      instant_apply_eligible: 'GET /api/gig-requests/instant-apply-eligible',
      create_gig_request: 'POST /api/gig-requests',
      apply_to_gig: 'POST /api/gig-requests/:id/apply',
      apply_for_gig: 'POST /api/gig-applications',
      instant_apply: 'POST /api/gig-applications/instant-apply',
      applications_by_gig: 'GET /api/gig-applications/gig/:gigRequestId',
      applications_by_user: 'GET /api/gig-applications/user/:userId',
      application_by_id: 'GET /api/gig-applications/:id'
    },
    authentication_endpoints: {
      register_user: 'POST /api/auth/register/user',
      register_employer: 'POST /api/auth/register/employer',
      login: 'POST /api/auth/login',
      refresh_token: 'POST /api/auth/refresh-token',
      logout: 'POST /api/auth/logout',
      verify_email: 'GET /api/auth/verify-email/:token',
      forgot_password: 'POST /api/auth/forgot-password',
      reset_password: 'POST /api/auth/reset-password/:token',
      get_profile: 'GET /api/auth/me (requires auth)'
    },
    protected_endpoints: {
      note: 'These require authentication with Bearer token',
      admin_routes: '/api/admin/* (requires admin auth)',
      rating_routes: '/api/ratings/* (requires auth)',
      notification_routes: '/api/notifications/* (requires auth)'
    }
  };

  res.status(200).json({
    success: true,
    message: 'QuickShift API Endpoints Documentation',
    data: endpoints,
    documentation: {
      base_url: req.protocol + '://' + req.get('host'),
      note: 'Public endpoints do not require authentication. Use Bearer token for protected routes.',
      example_auth_header: 'Authorization: Bearer <your_access_token>'
    }
  });
});

module.exports = router;
