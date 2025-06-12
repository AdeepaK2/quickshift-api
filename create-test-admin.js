// Script to create a test admin for login testing
const mongoose = require('mongoose');
const Admin = require('./src/models/admin');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createTestAdmin() {
  try {
    console.log('MongoDB URI:', process.env.MONGO_DB_URI);
    // Connect to database
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log('Connected to MongoDB');

    // Define test admin credentials
    const email = 'testadmin@quickshift.com';
    const password = 'TestAdmin123!';
    const firstName = 'Test';
    const lastName = 'Admin';

    // Check if admin with this email already exists
    const existingAdmin = await Admin.findOne({ email });
    
    if (existingAdmin) {
      console.log('Admin with this email already exists:', email);
      console.log('Updating password...');
      // Save plain password so pre-save hook hashes it
      existingAdmin.password = password;
      await existingAdmin.save();
      console.log('Password updated for admin:', email);
    } else {
      // Create admin user with plain password
      const admin = new Admin({
        email,
        password, // Save plain password
        firstName,
        lastName,
        role: 'admin',
        isActive: true
      });
      await admin.save();
      console.log('Test admin created successfully!');
      console.log('Email:', email);
      console.log('Password:', password);
    }

  } catch (error) {
    console.error('Error creating/updating test admin:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

createTestAdmin();
