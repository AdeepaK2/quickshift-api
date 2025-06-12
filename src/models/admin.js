const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'super_admin'],
    default: 'admin',
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String
  },
  phone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date
  },
  permissions: {
    canCreateAdmin: {
      type: Boolean,
      default: false
    },
    canDeleteAdmin: {
      type: Boolean,
      default: false
    },
    canManageUsers: {
      type: Boolean,
      default: true
    },
    canManageEmployers: {
      type: Boolean,
      default: true
    },
    canManageGigs: {
      type: Boolean,
      default: true
    },
    canAccessFinancials: {
      type: Boolean,
      default: false
    },
    canManageSettings: {
      type: Boolean,
      default: false
    }
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save middleware to hash the password
adminSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password for login
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
adminSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Set permissions based on role
adminSchema.pre('save', function(next) {
  if (this.isModified('role')) {
    if (this.role === 'super_admin') {
      this.permissions = {
        canCreateAdmin: true,
        canDeleteAdmin: true,
        canManageUsers: true,
        canManageEmployers: true,
        canManageGigs: true,
        canAccessFinancials: true,
        canManageSettings: true
      };
    } else {
      // Default admin permissions
      this.permissions = {
        canCreateAdmin: false,
        canDeleteAdmin: false,
        canManageUsers: true,
        canManageEmployers: true,
        canManageGigs: true,
        canAccessFinancials: false,
        canManageSettings: false
      };
    }
  }
  next();
});

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
