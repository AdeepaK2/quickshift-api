// Script to inspect admin users in the database
const mongoose = require('mongoose');
const Admin = require('./src/models/admin');
require('dotenv').config();

async function inspectAdmins() {
  try {
    // Connect to database
    console.log('MongoDB URI:', process.env.MONGO_DB_URI);
    console.log('Starting MongoDB connection...');
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log('Connected to MongoDB');
    console.log('Searching for admin users...');

    // Find all admin users
    const admins = await Admin.find({}, '-password'); // Exclude password
    
    console.log('Total admin users found:', admins.length);
    
    // Print details of each admin
    admins.forEach((admin, index) => {
      console.log(`\nAdmin #${index + 1}:`);
      console.log(`Email: ${admin.email}`);
      console.log(`Role: ${admin.role}`);
      console.log(`Name: ${admin.firstName} ${admin.lastName}`);
      console.log(`Active: ${admin.isActive}`);
      console.log(`Last login: ${admin.lastLoginAt || 'Never'}`);
    });

  } catch (error) {
    console.error('Error inspecting admins:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed');
  }
}

inspectAdmins();
