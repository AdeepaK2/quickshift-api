const mongoose = require('mongoose');
const User = require('./src/models/user');
const GigApply = require('./src/models/gigApply');
const GigCompletion = require('./src/models/gigCompletion');
const Rating = require('./src/models/rating');

// Direct test of getUserStats logic without authentication
async function testGetUserStatsLogic() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');
    console.log('MongoDB connected');
    
    // Find the test user
    const user = await User.findOne({ email: 'john.doe@student.com' });
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log(`🧪 Testing getUserStats logic for ${user.firstName} ${user.lastName}...\n`);
    
    // This is the exact logic from userController.getUserStats
    const userId = user._id;
    
    // 1. Count applied jobs
    const appliedJobs = await GigApply.countDocuments({ user: userId });
    
    // 2. Count active gigs (accepted applications)
    const activeGigs = await GigApply.countDocuments({ 
      user: userId, 
      status: 'accepted' 
    });
    
    // 3. Count completed gigs
    const completedGigs = await GigCompletion.countDocuments({
      'workers.worker': userId,
      status: 'completed'
    });
    
    // 4. Calculate total earnings
    const completions = await GigCompletion.find({
      'workers.worker': userId,
      status: 'completed'
    });
    
    let totalEarnings = 0;
    let monthlyEarnings = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    completions.forEach(completion => {
      const worker = completion.workers.find(w => w.worker.toString() === userId.toString());
      if (worker && worker.payment && worker.payment.amount) {
        totalEarnings += worker.payment.amount;
        
        const completionDate = new Date(completion.completedAt);
        if (completionDate.getMonth() === currentMonth && completionDate.getFullYear() === currentYear) {
          monthlyEarnings += worker.payment.amount;
        }
      }
    });
    
    // 5. Calculate average rating
    const ratings = await Rating.find({ 
      ratedUser: userId 
    });
    
    let averageRating = 0;
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, rating) => acc + (rating.overallRating || rating.rating || 0), 0);
      averageRating = sum / ratings.length;
    } else if (user.rating) {
      averageRating = user.rating;
    }
    
    // 6. Count pending payments
    const pendingPayments = await GigCompletion.countDocuments({
      'workers.worker': userId,
      'workers.payment.status': 'pending'
    });
    
    // Final stats object (exact format that should be returned by API)
    const stats = {
      appliedJobs,
      activeGigs,
      completedGigs,
      totalEarnings,
      monthlyEarnings,
      rating: averageRating,
      pendingPayments
    };
    
    console.log('📊 getUserStats would return:');
    console.log(JSON.stringify(stats, null, 2));
    
    console.log('\n🔍 Analysis:');
    if (appliedJobs > 0) {
      console.log('✅ Applied Jobs count is working correctly');
    } else {
      console.log('❌ Applied Jobs count is 0 - check GigApply records');
    }
    
    if (activeGigs > 0) {
      console.log('✅ Active Gigs count is working correctly');
    } else {
      console.log('⚠️ Active Gigs count is 0 - might be expected if no accepted apps');
    }
    
    if (completedGigs > 0) {
      console.log('✅ Completed Gigs count is working correctly');
    } else {
      console.log('❌ Completed Gigs count is 0 - check GigCompletion records');
    }
    
    if (totalEarnings > 0) {
      console.log('✅ Total Earnings calculation is working correctly');
    } else {
      console.log('❌ Total Earnings is 0 - check payment records in GigCompletion');
    }
    
    console.log('\n💡 These are the exact values that should appear in the sidebar!');
    console.log('If the frontend sidebar still shows zeros, the issue is likely:');
    console.log('1. Authentication problem preventing API call');
    console.log('2. Frontend not calling the right endpoint');
    console.log('3. API response not being processed correctly');
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testGetUserStatsLogic();
