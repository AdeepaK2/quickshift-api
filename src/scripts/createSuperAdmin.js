const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/user');
require('dotenv').config();

// Script to create the first super admin user
async function createFirstSuperAdmin() {
  try {    // Connect to database
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('Super admin already exists:', existingSuperAdmin.email);
      process.exit(0);
    }

    // Get admin details from command line arguments or use defaults
    const email = process.argv[2] || 'superadmin@quickshift.com';
    const password = process.argv[3] || 'SuperAdmin123!';
    const firstName = process.argv[4] || 'Super';
    const lastName = process.argv[5] || 'Admin';

    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error('User with this email already exists:', email);
      process.exit(1);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create super admin user
    const superAdmin = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'super_admin',
      isActive: true
    });

    await superAdmin.save();
    console.log('Super admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', 'super_admin');
    console.log('\nIMPORTANT: Please change the password after first login!');

  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
createFirstSuperAdmin();
