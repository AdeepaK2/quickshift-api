const mongoose = require('mongoose');
const User = require('./src/models/user');
const Employer = require('./src/models/employer');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');

async function checkDatabaseCounts() {
  try {
    console.log('Checking database counts...\n');

    // Count all users
    const totalUsers = await User.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);

    // Count users by role
    const jobSeekers = await User.countDocuments({ role: 'job_seeker' });
    console.log(`Job seekers: ${jobSeekers}`);

    const activeUsers = await User.countDocuments({ role: 'job_seeker', isActive: true });
    console.log(`Active job seekers: ${activeUsers}`);

    const verifiedUsers = await User.countDocuments({ role: 'job_seeker', isVerified: true });
    console.log(`Verified job seekers: ${verifiedUsers}`);

    // Count all employers
    const totalEmployers = await Employer.countDocuments();
    console.log(`\nTotal employers in database: ${totalEmployers}`);

    const activeEmployers = await Employer.countDocuments({ isActive: true });
    console.log(`Active employers: ${activeEmployers}`);

    const verifiedEmployers = await Employer.countDocuments({ isVerified: true });
    console.log(`Verified employers: ${verifiedEmployers}`);

    // Show sample data
    console.log('\n=== SAMPLE USERS ===');
    const sampleUsers = await User.find({ role: 'job_seeker' }).limit(3).select('firstName lastName email university isActive isVerified');
    sampleUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (${user.email}) - ${user.university} [Active: ${user.isActive}, Verified: ${user.isVerified}]`);
    });

    console.log('\n=== SAMPLE EMPLOYERS ===');
    const sampleEmployers = await Employer.find().limit(3).select('companyName email location isActive isVerified');
    sampleEmployers.forEach(employer => {
      console.log(`- ${employer.companyName} (${employer.email}) - ${employer.location} [Active: ${employer.isActive}, Verified: ${employer.isVerified}]`);
    });

    console.log('\n=== DATABASE VERIFICATION COMPLETE ===');
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkDatabaseCounts();
