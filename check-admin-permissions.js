// This script can still be used to check admin permissions
// All admins now have platform settings access by default
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./src/models/admin');

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift')
  .then(() => console.log('Connected to MongoDB...'))
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

async function checkAdminPermissions() {
  try {
    // Find all admin accounts
    const admins = await Admin.find({}).select('-password');
    
    console.log(`Found ${admins.length} admin accounts:`);
    console.log('NOTE: All admins now have access to platform settings by default.');
    
    admins.forEach(admin => {
      console.log(`\nID: ${admin._id}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`Role: ${admin.role}`);
      console.log('Permissions:');
      if (admin.permissions) {
        console.log(`  - canManageSettings: ${admin.permissions.canManageSettings || false}`);
        console.log(`  - canCreateAdmin: ${admin.permissions.canCreateAdmin || false}`);
        console.log(`  - canDeleteAdmin: ${admin.permissions.canDeleteAdmin || false}`);
        console.log(`  - canManageUsers: ${admin.permissions.canManageUsers || false}`);
        console.log(`  - canManageEmployers: ${admin.permissions.canManageEmployers || false}`);
        console.log(`  - canManageGigs: ${admin.permissions.canManageGigs || false}`);
        console.log(`  - canAccessFinancials: ${admin.permissions.canAccessFinancials || false}`);
      } else {
        console.log('  No permissions defined');
      }
    });
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.connection.close();
  }
}

checkAdminPermissions();
