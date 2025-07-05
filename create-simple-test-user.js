const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/user');

// Create a simple test user with known credentials for frontend testing
async function createSimpleTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');
    console.log('MongoDB connected');
    
    // Check if a simple test user exists
    let testUser = await User.findOne({ email: 'testuser@example.com' });
    
    if (testUser) {
      console.log('Test user already exists, updating...');
    } else {
      console.log('Creating new test user...');
      testUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'testuser@example.com',
        role: 'job_seeker',
        university: 'Test University',
        faculty: 'Computer Science',
        yearOfStudy: 2,
        phone: '+1234567890',
        isActive: true,
        isVerified: true,
        studentIdVerified: true
      });
    }
    
    // Set a simple password
    testUser.password = await bcrypt.hash('test123', 10);
    await testUser.save();
    
    console.log('✅ Test user created/updated:');
    console.log('   Email: testuser@example.com');
    console.log('   Password: test123');
    console.log('   Role: job_seeker');
    console.log('   Active: true');
    console.log('   Verified: true');
    
    // Test login with this user
    console.log('\n🧪 Testing login with new credentials...');
    
    const loginTest = await User.findOne({ email: 'testuser@example.com' });
    const isMatch = await bcrypt.compare('test123', loginTest.password);
    
    console.log(`Password test: ${isMatch ? '✅ Correct' : '❌ Failed'}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createSimpleTestUser();
