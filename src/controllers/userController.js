const User = require('../models/user');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    // Add pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Add filtering options
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    
    const users = await User.find(filter)
      .select('-password') // Exclude password field
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
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
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message
    });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    // Check if user with email already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    const user = new User(req.body);
    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    // Find user by ID
    let user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent email updates if email already exists
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }
    
    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// Get user stats for dashboard
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's gig applications
    const GigApply = require('../models/gigApply');
    const GigCompletion = require('../models/gigCompletion');
    const Rating = require('../models/rating');
    
    // Count applications
    const appliedJobs = await GigApply.countDocuments({ user: userId });
    
    // Count active gigs (looking in workers array for in_progress gigs)
    const activeGigs = await GigCompletion.countDocuments({ 
      'workers.worker': userId, 
      status: { $in: ['confirmed', 'in_progress'] }
    });
    
    // Count completed gigs (looking in workers array for completed gigs)
    const completedGigs = await GigCompletion.countDocuments({ 
      'workers.worker': userId, 
      status: 'completed' 
    });
    
    // Calculate total earnings from completed gigs
    const completedGigsData = await GigCompletion.find({ 
      'workers.worker': userId, 
      status: 'completed' 
    });
    
    let totalEarnings = 0;
    let monthlyEarnings = 0;
    
    // Calculate earnings from payment data in workers array
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    completedGigsData.forEach(completion => {
      completion.workers.forEach(worker => {
        if (worker.worker.toString() === userId.toString()) {
          const amount = worker.payment?.amount || 0;
          totalEarnings += amount;
          
          // Check if completed this month
          if (completion.completedAt && completion.completedAt >= startOfMonth) {
            monthlyEarnings += amount;
          }
        }
      });
    });
    
    // Get user's average rating (correct field names)
    const userRatings = await Rating.find({ 
      ratee: userId,
      rateeType: 'user'
    });
    
    const avgRating = userRatings.length > 0 
      ? userRatings.reduce((sum, rating) => sum + rating.rating, 0) / userRatings.length 
      : 0;
    
    // Count pending payments (completed but not yet paid)
    const pendingPaymentsData = await GigCompletion.find({
      'workers.worker': userId,
      status: 'completed'
    });
    
    let pendingPayments = 0;
    pendingPaymentsData.forEach(completion => {
      completion.workers.forEach(worker => {
        if (worker.worker.toString() === userId.toString() && 
            worker.payment?.status !== 'paid') {
          pendingPayments++;
        }
      });
    });
    
    res.status(200).json({
      success: true,
      data: {
        appliedJobs,
        activeGigs,
        completedGigs,
        totalEarnings,
        monthlyEarnings,
        rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
        pendingPayments
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user stats',
      error: error.message
    });
  }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    // This is a placeholder - in production you'd use multer and cloud storage
    res.status(501).json({
      success: false,
      message: 'Profile picture upload not implemented yet. Please use a third-party service or implement multer with cloud storage.'
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error: error.message
    });
  }
};

// Upload documents
exports.uploadDocument = async (req, res) => {
  try {
    // This is a placeholder - in production you'd use multer and cloud storage
    res.status(501).json({
      success: false,
      message: 'Document upload not implemented yet. Please use a third-party service or implement multer with cloud storage.'
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
};

// Activate user (admin only)
exports.activateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason, notifyUser } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already active'
      });
    }

    // Update user status
    user.isActive = true;
    user.updatedAt = new Date();
    await user.save();

    console.log(`User ${user.email} activated by admin. Reason: ${reason || 'No reason provided'}`);

    res.status(200).json({
      success: true,
      message: 'User activated successfully',
      data: {
        userId: user._id,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to activate user',
      error: error.message
    });
  }
};

// Deactivate user (admin only)
exports.deactivateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { reason, notifyUser } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already inactive'
      });
    }

    // Update user status
    user.isActive = false;
    user.updatedAt = new Date();
    await user.save();

    console.log(`User ${user.email} deactivated by admin. Reason: ${reason || 'No reason provided'}`);

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: {
        userId: user._id,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user',
      error: error.message
    });
  }
};