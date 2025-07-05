const mongoose = require('mongoose');
const User = require('./src/models/user');
const bcrypt = require('bcrypt');

// Check what users exist and update the test user's password
async function checkAndFixUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');
    console.log('MongoDB connected');
    
    // Find all users with @student.com emails
    const testUsers = await User.find({ email: /student\.com$/ });
    
    console.log('\n📋 Found test users:');
    testUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - Active: ${user.isActive}, Verified: ${user.isVerified}`);
    });
    
    // Check specifically for john.doe@student.com
    const johnDoe = await User.findOne({ email: 'john.doe@student.com' });
    
    if (johnDoe) {
      console.log('\n🔧 Updating John Doe\'s password for testing...');
      
      // Hash the new password
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      // Update the user
      await User.findByIdAndUpdate(johnDoe._id, {
        password: hashedPassword,
        isActive: true,
        isVerified: true
      });
      
      console.log('✅ Updated John Doe\'s credentials');
      console.log('   Email: john.doe@student.com');
      console.log('   Password: password123');
      console.log('   Status: Active and Verified');
    } else {
      console.log('\n❌ John Doe user not found');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndFixUsers();
