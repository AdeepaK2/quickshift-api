const User = require('../models/user');
const Employer = require('../models/employer');
const GigRequest = require('../models/gigRequest');
const GigCompletion = require('../models/gigCompletion');
const bcrypt = require('bcrypt');

// Create admin user
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'admin' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Validate admin role
    if (!['admin', 'super_admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin role'
      });
    }

    // Only super_admin can create super_admin
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super administrators can create super admin accounts'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const admin = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      isActive: true
    });

    await admin.save();

    // Remove password from response
    const adminResponse = admin.toObject();
    delete adminResponse.password;

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: adminResponse
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
};

// Get all admin users
exports.getAllAdmins = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { role: { $in: ['admin', 'super_admin'] } };
    
    // Add additional filters
    if (req.query.role && ['admin', 'super_admin'].includes(req.query.role)) {
      filter.role = req.query.role;
    }
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const admins = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: admins.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: admins
    });
  } catch (error) {
    console.error('Error getting admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin users',
      error: error.message
    });
  }
};

// Get admin by ID
exports.getAdminById = async (req, res) => {
  try {
    const admin = await User.findOne({ 
      _id: req.params.id, 
      role: { $in: ['admin', 'super_admin'] } 
    }).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Error getting admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin user',
      error: error.message
    });
  }
};

// Update admin
exports.updateAdmin = async (req, res) => {
  try {
    const { role, ...updateData } = req.body;

    // Check if admin exists
    const admin = await User.findOne({ 
      _id: req.params.id, 
      role: { $in: ['admin', 'super_admin'] } 
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Role change validation
    if (role && role !== admin.role) {
      // Only super_admin can change roles
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Only super administrators can change admin roles'
        });
      }

      // Cannot demote the last super_admin
      if (admin.role === 'super_admin' && role !== 'super_admin') {
        const superAdminCount = await User.countDocuments({ role: 'super_admin' });
        if (superAdminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot demote the last super administrator'
          });
        }
      }

      updateData.role = role;
    }

    // Hash password if provided
    if (updateData.password) {
      const saltRounds = 12;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    const updatedAdmin = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Admin user updated successfully',
      data: updatedAdmin
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin user',
      error: error.message
    });
  }
};

// Delete admin
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findOne({ 
      _id: req.params.id, 
      role: { $in: ['admin', 'super_admin'] } 
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Cannot delete super_admin unless you are super_admin
    if (admin.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super administrators can delete super admin accounts'
      });
    }

    // Cannot delete the last super_admin
    if (admin.role === 'super_admin') {
      const superAdminCount = await User.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last super administrator'
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Admin user deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin user',
      error: error.message
    });
  }
};

// Admin Dashboard - Get statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalEmployers,
      totalGigs,
      activeGigs,
      completedGigs,
      totalAdmins
    ] = await Promise.all([
      User.countDocuments({ role: 'job_seeker' }),
      Employer.countDocuments(),
      GigRequest.countDocuments(),
      GigRequest.countDocuments({ status: 'active' }),
      GigCompletion.countDocuments({ status: 'completed' }),
      User.countDocuments({ role: { $in: ['admin', 'super_admin'] } })
    ]);

    // Get recent activities (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      newUsersLastMonth,
      newEmployersLastMonth,
      newGigsLastMonth
    ] = await Promise.all([
      User.countDocuments({ 
        role: 'job_seeker', 
        createdAt: { $gte: thirtyDaysAgo } 
      }),
      Employer.countDocuments({ 
        createdAt: { $gte: thirtyDaysAgo } 
      }),
      GigRequest.countDocuments({ 
        createdAt: { $gte: thirtyDaysAgo } 
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalEmployers,
          totalGigs,
          activeGigs,
          completedGigs,
          totalAdmins
        },
        recentActivity: {
          newUsersLastMonth,
          newEmployersLastMonth,
          newGigsLastMonth
        },
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics',
      error: error.message
    });
  }
};

// Get all users (for admin management)
exports.getAllUsersForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Add filters
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
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
    console.error('Error getting users for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

// Get all employers (for admin management)
exports.getAllEmployersForAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    
    // Add filters
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { companyName: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { contactPersonName: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const employers = await Employer.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
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
    console.error('Error getting employers for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve employers',
      error: error.message
    });
  }
};
