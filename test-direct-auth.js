const mongoose = require('mongoose');
const User = require('./src/models/user');
const bcrypt = require('bcrypt');

// Direct test of user authentication
async function testDirectAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');
    console.log('MongoDB connected');
    
    // Find the user
    const user = await User.findOne({ email: 'john.doe@student.com' });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('📋 User found:');
    console.log(`- Name: ${user.firstName} ${user.lastName}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Active: ${user.isActive}`);
    console.log(`- Verified: ${user.isVerified}`);
    
    // Test password
    const isMatch = await bcrypt.compare('password123', user.password);
    console.log(`- Password matches: ${isMatch}`);
    
    if (isMatch) {
      console.log('\n✅ User credentials are correct!');
      
      // Now let's manually test the aggregation logic from getUserStats
      console.log('\n🔍 Testing stats aggregation...');
      
      const GigApply = require('./src/models/gigApply');
      const GigCompletion = require('./src/models/gigCompletion');
      const Rating = require('./src/models/rating');
      
      // Count applications
      const appliedJobs = await GigApply.countDocuments({ user: user._id });
      console.log(`Applied Jobs: ${appliedJobs}`);
      
      // Count active gigs (accepted applications)
      const activeGigs = await GigApply.countDocuments({ 
        user: user._id, 
        status: 'accepted' 
      });
      console.log(`Active Gigs: ${activeGigs}`);
      
      // Count completed gigs
      const completedGigs = await GigCompletion.countDocuments({
        'workers.worker': user._id,
        status: 'completed'
      });
      console.log(`Completed Gigs: ${completedGigs}`);
      
      // Calculate total earnings
      const completions = await GigCompletion.find({
        'workers.worker': user._id,
        status: 'completed'
      });
      
      let totalEarnings = 0;
      let monthlyEarnings = 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      completions.forEach(completion => {
        const worker = completion.workers.find(w => w.worker.toString() === user._id.toString());
        if (worker && worker.payment && worker.payment.amount) {
          totalEarnings += worker.payment.amount;
          
          const completionDate = new Date(completion.completedAt);
          if (completionDate.getMonth() === currentMonth && completionDate.getFullYear() === currentYear) {
            monthlyEarnings += worker.payment.amount;
          }
        }
      });
      
      console.log(`Total Earnings: LKR ${totalEarnings}`);
      console.log(`Monthly Earnings: LKR ${monthlyEarnings}`);
      
      // Calculate average rating
      const ratings = await Rating.find({ 
        ratedUser: user._id 
      });
      
      let averageRating = 0;
      if (ratings.length > 0) {
        const sum = ratings.reduce((acc, rating) => acc + (rating.overallRating || 0), 0);
        averageRating = sum / ratings.length;
      } else if (user.rating) {
        averageRating = user.rating;
      }
      
      console.log(`Rating: ${averageRating.toFixed(1)} (from ${ratings.length} ratings)`);
      
      // Count pending payments
      const pendingPayments = await GigCompletion.countDocuments({
        'workers.worker': user._id,
        'workers.payment.status': 'pending'
      });
      console.log(`Pending Payments: ${pendingPayments}`);
      
      console.log('\n📊 Final stats object:');
      const stats = {
        appliedJobs,
        activeGigs,
        completedGigs,
        totalEarnings,
        monthlyEarnings,
        rating: averageRating,
        pendingPayments
      };
      console.log(JSON.stringify(stats, null, 2));
      
    } else {
      console.log('\n❌ Password does not match');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testDirectAuth();
