const Employer = require('../models/employer');

// Get all employers
exports.getAllEmployers = async (req, res) => {
  try {
    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Add filtering options
    const filter = {};
    if (req.query.verified !== undefined) filter.verified = req.query.verified === 'true';
    
    const employers = await Employer.find(filter)
      .select('-password') // Exclude password field
      .skip(skip)
      .limit(limit);
    
    const total = await Employer.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: employers.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: employers
    });
  } catch (error) {
    console.error('Error getting employers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve employers',
      error: error.message
    });
  }
};

// Get employer by ID
exports.getEmployerById = async (req, res) => {
  try {
    const employer = await Employer.findById(req.params.id).select('-password');
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: employer
    });
  } catch (error) {
    console.error('Error getting employer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve employer',
      error: error.message
    });
  }
};

// Create new employer
exports.createEmployer = async (req, res) => {
  try {
    // Check if employer with email already exists
    const existingEmployer = await Employer.findOne({ email: req.body.email });
    if (existingEmployer) {
      return res.status(400).json({
        success: false,
        message: 'Employer with this email already exists'
      });
    }
    
    const employer = new Employer(req.body);
    await employer.save();
    
    // Return employer without password
    const employerResponse = employer.toObject();
    delete employerResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'Employer created successfully',
      data: employerResponse
    });
  } catch (error) {
    console.error('Error creating employer:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create employer',
      error: error.message
    });
  }
};

// Update employer
exports.updateEmployer = async (req, res) => {
  try {
    // Find employer by ID
    let employer = await Employer.findById(req.params.id);
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }
    
    // Prevent email updates if email already exists
    if (req.body.email && req.body.email !== employer.email) {
      const emailExists = await Employer.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }
    
    // Update employer
    employer = await Employer.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.status(200).json({
      success: true,
      message: 'Employer updated successfully',
      data: employer
    });
  } catch (error) {
    console.error('Error updating employer:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update employer',
      error: error.message
    });
  }
};

// Delete employer
exports.deleteEmployer = async (req, res) => {
  try {
    const employer = await Employer.findByIdAndDelete(req.params.id);
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Employer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete employer',
      error: error.message
    });
  }
};

// Get employer stats for dashboard
exports.getEmployerStats = async (req, res) => {
  try {
    const employerId = req.user._id;
    
    // Get employer's gig requests and related data
    const GigRequest = require('../models/gigRequest');
    const GigApply = require('../models/gigApply');
    const GigCompletion = require('../models/gigCompletion');
    const Rating = require('../models/rating');
    
    // Count total jobs posted by employer
    const totalJobsPosted = await GigRequest.countDocuments({ employer: employerId });
    
    // Count active jobs (not completed, not cancelled)
    const activeJobs = await GigRequest.countDocuments({ 
      employer: employerId,
      status: { $in: ['active', 'in_progress'] }
    });
    
    // Count total applications received
    const employerJobs = await GigRequest.find({ employer: employerId }).select('_id');
    const jobIds = employerJobs.map(job => job._id);
    const totalApplications = await GigApply.countDocuments({ 
      gigRequest: { $in: jobIds } 
    });
    
    // Count total hires (confirmed gig completions)
    const totalHires = await GigCompletion.countDocuments({
      gigRequest: { $in: jobIds },
      status: { $in: ['confirmed', 'completed'] }
    });
    
    // Calculate response rate (applications responded to vs total applications)
    const respondedApplications = await GigApply.countDocuments({
      gigRequest: { $in: jobIds },
      status: { $in: ['accepted', 'rejected'] }
    });
    const responseRate = totalApplications > 0 
      ? Math.round((respondedApplications / totalApplications) * 100)
      : 0;
    
    res.status(200).json({
      success: true,
      data: {
        totalJobsPosted,
        activeJobs,
        totalApplications,
        totalHires,
        responseRate
      }
    });
  } catch (error) {
    console.error('Error getting employer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employer stats',
      error: error.message
    });
  }
};

// Upload employer logo
exports.uploadLogo = async (req, res) => {
  try {
    // This is a placeholder - in production you'd use multer and cloud storage
    res.status(501).json({
      success: false,
      message: 'Logo upload not implemented yet. Please use a third-party service or implement multer with cloud storage.'
    });
  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload logo',
      error: error.message
    });
  }
};

// Get payment methods
exports.getPaymentMethods = async (req, res) => {
  try {
    const employerId = req.user._id;
    
    // Placeholder for database query to get payment methods
    // In production, you'd fetch these from a payment provider or database
    
    res.status(200).json({
      success: true,
      data: {
        paymentMethods: [
          {
            id: 'pm_sample1',
            type: 'card',
            lastFour: '4242',
            expiryDate: '04/2026',
            isDefault: true,
            isVerified: true
          },
          {
            id: 'pm_sample2',
            type: 'bank',
            lastFour: '6789',
            isDefault: false,
            isVerified: true
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods',
      error: error.message
    });
  }
};

// Add payment method
exports.addPaymentMethod = async (req, res) => {
  try {
    const { token, isDefault } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Payment token is required'
      });
    }
    
    // Placeholder for adding a payment method
    // In production, you'd register this with a payment provider
    
    res.status(201).json({
      success: true,
      data: {
        success: true,
        paymentMethod: {
          id: 'pm_new' + Math.floor(Math.random() * 10000),
          type: 'card',
          lastFour: '1234',
          expiryDate: '12/2026',
          isDefault: isDefault || false,
          isVerified: true
        }
      }
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add payment method',
      error: error.message
    });
  }
};

// Delete payment method
exports.deletePaymentMethod = async (req, res) => {
  try {
    const paymentMethodId = req.params.paymentMethodId;
    
    // Placeholder for deleting a payment method
    // In production, you'd remove this from the payment provider
    
    res.status(200).json({
      success: true,
      data: {
        success: true
      }
    });
  } catch (error) {
    console.error('Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method',
      error: error.message
    });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const employerId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Placeholder for payment history
    // In production, you'd fetch this from the database
    
    const payments = Array(5).fill(null).map((_, i) => ({
      _id: 'pay_' + Math.floor(Math.random() * 10000) + i,
      amount: Math.floor(Math.random() * 100000) / 100 + 50,
      status: ['pending', 'completed', 'completed', 'completed', 'failed'][Math.floor(Math.random() * 5)],
      paymentMethod: 'card_pm_' + Math.floor(Math.random() * 1000),
      transactionId: 'txn_' + Math.floor(Math.random() * 10000),
      gigTitle: 'Sample Gig ' + (i + 1),
      gigId: 'gig_' + Math.floor(Math.random() * 10000),
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
      completedAt: Math.random() > 0.3 ? new Date(Date.now() - i * 86400000 + 3600000).toISOString() : undefined
    }));
    
    res.status(200).json({
      success: true,
      data: {
        payments,
        total: 15,
        page,
        pages: 3,
        totalAmount: 1250.75
      }
    });
  } catch (error) {
    console.error('Error getting payment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
      error: error.message
    });
  }
};

// Get financial overview
exports.getFinancialOverview = async (req, res) => {
  try {
    const employerId = req.user._id;
    
    // Placeholder for financial overview
    // In production, you'd calculate this from actual payment data
    
    const currentMonth = new Date().getMonth();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthlyData = Array(6).fill(null).map((_, i) => {
      const monthIndex = (currentMonth - 5 + i + 12) % 12;
      return {
        month: monthNames[monthIndex],
        amount: Math.floor(Math.random() * 50000) / 100 + 200
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalSpent: 3250.75,
        totalGigs: 15,
        averagePerGig: 216.72,
        currentMonth: 850.25,
        previousMonth: 750.50,
        monthlyData
      }
    });
  } catch (error) {
    console.error('Error getting financial overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get financial overview',
      error: error.message
    });
  }
};