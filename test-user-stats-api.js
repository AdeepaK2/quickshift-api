const mongoose = require('mongoose');
const User = require('./src/models/user');
const { getUserStats } = require('./src/controllers/userController');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test the API directly
const testUserStatsAPI = async () => {
  try {
    console.log('🧪 TESTING USER STATS API...\n');

    // Find John Doe
    const johnDoe = await User.findOne({ email: 'john.doe@student.com' });
    
    if (!johnDoe) {
      console.log('❌ John Doe not found!');
      return;
    }

    console.log(`✅ Testing stats for: ${johnDoe.firstName} ${johnDoe.lastName}`);
    console.log(`   User ID: ${johnDoe._id}`);

    // Update John's rating first
    await User.findByIdAndUpdate(johnDoe._id, {
      $set: {
        'rating': 4.2,
        'totalRatings': 2
      }
    });
    console.log('✅ Updated John\'s rating to 4.2');

    // Create a mock request and response object
    const mockReq = {
      user: {
        _id: johnDoe._id,
        id: johnDoe._id.toString()
      }
    };

    const mockRes = {
      data: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.data = data;
        return this;
      }
    };

    // Call the getUserStats function directly
    console.log('\n🔍 Calling getUserStats function...');
    await getUserStats(mockReq, mockRes);

    // Check the response
    if (mockRes.data && mockRes.data.success) {
      console.log('\n✅ API CALL SUCCESSFUL!');
      console.log('📊 Stats returned:');
      const stats = mockRes.data.data;
      console.log(`   Applied Jobs: ${stats.appliedJobs}`);
      console.log(`   Active Gigs: ${stats.activeGigs}`);
      console.log(`   Completed Gigs: ${stats.completedGigs}`);
      console.log(`   Total Earnings: LKR ${stats.totalEarnings}`);
      console.log(`   Monthly Earnings: LKR ${stats.monthlyEarnings}`);
      console.log(`   Rating: ${stats.rating}`);
      console.log(`   Pending Payments: ${stats.pendingPayments || 0}`);

      console.log('\n🎯 EXPECTED FRONTEND DISPLAY:');
      console.log(`   Applied Jobs: ${stats.appliedJobs}`);
      console.log(`   Active Gigs: ${stats.activeGigs}`);
      console.log(`   Completed: ${stats.completedGigs}`);
      console.log(`   This Month: LKR ${stats.monthlyEarnings?.toLocaleString() || 0}`);
      console.log(`   Rating: ${stats.rating?.toFixed(1) || '0.0'} ⭐`);

      if (stats.appliedJobs > 0) {
        console.log('\n✅ The backend is working correctly!');
        console.log('🔍 If the frontend still shows 0s, the issue is:');
        console.log('   1. User authentication - wrong user logged in');
        console.log('   2. API call failing from frontend');
        console.log('   3. Frontend not updating the state properly');
      } else {
        console.log('\n❌ Backend is returning 0 values - there\'s an issue with the aggregation');
      }
    } else {
      console.log('\n❌ API CALL FAILED!');
      console.log('Response:', mockRes.data);
    }

  } catch (error) {
    console.error('❌ Error testing user stats API:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  await connectDB();
  await testUserStatsAPI();
  process.exit(0);
};

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { testUserStatsAPI };
