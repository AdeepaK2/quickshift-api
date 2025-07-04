/**
 * Test script to create a student user and test job application
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./src/models/user');
const bcrypt = require('bcrypt');

const MONGODB_URI = process.env.MONGO_DB_URI;

async function createTestStudentAndTestApplication() {
  try {
    console.log('MongoDB URI:', MONGODB_URI);
    
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if test student already exists
    let testStudent = await User.findOne({ email: 'student@university.edu' });
    
    if (testStudent) {
      console.log('Test student already exists:', testStudent.email);
      console.log('Deleting and recreating...');
      await User.deleteOne({ email: 'student@university.edu' });
      testStudent = null;
    }
    
    if (!testStudent) {
      // Create test student
      console.log('Creating test student...');
      
      testStudent = new User({
        firstName: 'Test',
        lastName: 'Student',
        email: 'student@university.edu',
        password: 'password123', // Don't hash manually, let the pre-save hook do it
        university: 'Test University',
        studentId: 'STU001',
        phone: '+94771234567',
        role: 'job_seeker', // Use 'role' not 'userType'
        isEmailVerified: true,
        profileCompletion: 80
      });
      
      await testStudent.save();
      console.log('✅ Test student created successfully');
    }

    console.log('Student details:');
    console.log(`- Email: ${testStudent.email}`);
    console.log(`- Role: ${testStudent.role}`);
    console.log(`- ID: ${testStudent._id}`);

    // Now test login with this user
    console.log('\n🔐 Testing login with created student...');
    
    const isPasswordValid = await bcrypt.compare('password123', testStudent.password);
    console.log(`Password validation: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);

    if (isPasswordValid) {
      console.log('✅ Student user ready for application testing');
      console.log('\nCredentials for testing:');
      console.log('- Email: student@university.edu');
      console.log('- Password: password123');
      console.log('- Role: job_seeker');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed');
  }
}

// Run the function
if (require.main === module) {
  createTestStudentAndTestApplication();
}

module.exports = { createTestStudentAndTestApplication };
