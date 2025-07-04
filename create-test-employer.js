/**
 * Test script to create an employer user for testing
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Employer = require('./src/models/employer');
const bcrypt = require('bcrypt');

const MONGODB_URI = process.env.MONGO_DB_URI;

async function createTestEmployer() {
  try {
    console.log('MongoDB URI:', MONGODB_URI);
    
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if test employer already exists
    let testEmployer = await Employer.findOne({ email: 'test@employer.com' });
    
    if (testEmployer) {
      console.log('Test employer already exists:', testEmployer.email);
      console.log('Deleting and recreating...');
      await Employer.deleteOne({ email: 'test@employer.com' });
      testEmployer = null;
    }
    
    if (!testEmployer) {
      // Create test employer
      console.log('Creating test employer...');
      
      testEmployer = new Employer({
        companyName: 'Test Company Ltd',
        email: 'test@employer.com',
        password: 'password123', // Don't hash manually, let the pre-save hook do it
        phone: '+94771234567',
        location: '123 Test Street, Colombo 03',
        companyDescription: 'A test company for job posting and application testing',
        website: 'https://testcompany.com',
        industryType: 'Technology',
        companySize: '50-100',
        isVerified: true,
        isActive: true
      });
      
      await testEmployer.save();
      console.log('✅ Test employer created successfully');
    }

    console.log('Employer details:');
    console.log(`- Email: ${testEmployer.email}`);
    console.log(`- Company: ${testEmployer.companyName}`);
    console.log(`- ID: ${testEmployer._id}`);

    // Now test login with this user
    console.log('\n🔐 Testing login with created employer...');
    
    const isPasswordValid = await bcrypt.compare('password123', testEmployer.password);
    console.log(`Password validation: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);

    if (isPasswordValid) {
      console.log('✅ Employer user ready for testing');
      console.log('\nCredentials for testing:');
      console.log('- Email: test@employer.com');
      console.log('- Password: password123');
      console.log('- Type: employer');
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
  createTestEmployer();
}

module.exports = { createTestEmployer };
