const mongoose = require('mongoose');
const User = require('./src/models/user');
const Employer = require('./src/models/employer');
const GigRequest = require('./src/models/gigRequest');
const GigApply = require('./src/models/gigApply');
const GigCompletion = require('./src/models/gigCompletion');
const Rating = require('./src/models/rating');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');
    console.log('✅ MongoDB connected');
    console.log(`🗄️  Database: ${mongoose.connection.db.databaseName}`);
    console.log(`🔗 Connection: ${mongoose.connection.host}:${mongoose.connection.port}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Check database data
const checkDatabaseData = async () => {
  try {
    console.log('\n🔍 CHECKING DATABASE DATA...\n');

    // 1. Check Users (Students)
    console.log('👤 USERS (STUDENTS):');
    console.log('=' * 50);
    const users = await User.find({ role: 'job_seeker' }).select('firstName lastName email university faculty isActive isVerified rating totalRatings');
    console.log(`Total Students: ${users.length}`);
    
    if (users.length > 0) {
      console.log('\nStudent Details:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   University: ${user.university || 'Not set'}`);
        console.log(`   Faculty: ${user.faculty || 'Not set'}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(`   Verified: ${user.isVerified}`);
        console.log(`   Rating: ${user.rating || 0} (${user.totalRatings || 0} ratings)`);
        console.log('');
      });
    }

    // 2. Check Employers
    console.log('\n🏢 EMPLOYERS:');
    console.log('=' * 50);
    const employers = await Employer.find().select('companyName email location isActive isVerified');
    console.log(`Total Employers: ${employers.length}`);
    
    if (employers.length > 0) {
      console.log('\nEmployer Details:');
      employers.forEach((employer, index) => {
        console.log(`${index + 1}. ${employer.companyName}`);
        console.log(`   Email: ${employer.email}`);
        console.log(`   Location: ${employer.location || 'Not set'}`);
        console.log(`   Active: ${employer.isActive}`);
        console.log(`   Verified: ${employer.isVerified}`);
        console.log('');
      });
    }

    // 3. Check Gig Requests (Jobs)
    console.log('\n💼 GIG REQUESTS (JOBS):');
    console.log('=' * 50);
    const gigRequests = await GigRequest.find().populate('employer', 'companyName').select('title category status totalPositions filledPositions employer payRate');
    console.log(`Total Jobs: ${gigRequests.length}`);
    
    if (gigRequests.length > 0) {
      console.log('\nJob Details:');
      gigRequests.forEach((gig, index) => {
        console.log(`${index + 1}. ${gig.title}`);
        console.log(`   Company: ${gig.employer?.companyName || 'Unknown'}`);
        console.log(`   Category: ${gig.category}`);
        console.log(`   Status: ${gig.status}`);
        console.log(`   Positions: ${gig.filledPositions}/${gig.totalPositions}`);
        console.log(`   Pay: LKR ${gig.payRate?.amount || 0} per ${gig.payRate?.rateType || 'hour'}`);
        console.log('');
      });
    }

    // 4. Check Applications
    console.log('\n📝 JOB APPLICATIONS:');
    console.log('=' * 50);
    const applications = await GigApply.find()
      .populate('user', 'firstName lastName email')
      .populate('gigRequest', 'title')
      .select('user gigRequest status appliedAt');
    console.log(`Total Applications: ${applications.length}`);
    
    if (applications.length > 0) {
      console.log('\nApplication Details:');
      applications.forEach((app, index) => {
        console.log(`${index + 1}. ${app.user?.firstName} ${app.user?.lastName} applied for "${app.gigRequest?.title}"`);
        console.log(`   Status: ${app.status}`);
        console.log(`   Applied: ${app.appliedAt?.toLocaleDateString() || 'Unknown'}`);
        console.log('');
      });
    }

    // 5. Check Gig Completions
    console.log('\n✅ GIG COMPLETIONS:');
    console.log('=' * 50);
    const completions = await GigCompletion.find()
      .populate('gigRequest', 'title')
      .populate('employer', 'companyName')
      .select('gigRequest employer status workers paymentSummary completedAt');
    console.log(`Total Completed Gigs: ${completions.length}`);
    
    if (completions.length > 0) {
      console.log('\nCompletion Details:');
      completions.forEach((completion, index) => {
        console.log(`${index + 1}. Job: "${completion.gigRequest?.title || 'Unknown'}"`);
        console.log(`   Employer: ${completion.employer?.companyName || 'Unknown'}`);
        console.log(`   Status: ${completion.status}`);
        console.log(`   Workers: ${completion.workers?.length || 0}`);
        console.log(`   Total Payment: LKR ${completion.paymentSummary?.totalAmount || 0}`);
        console.log(`   Completed: ${completion.completedAt?.toLocaleDateString() || 'Unknown'}`);
        
        if (completion.workers && completion.workers.length > 0) {
          completion.workers.forEach((worker, wIndex) => {
            console.log(`     Worker ${wIndex + 1}: Payment LKR ${worker.payment?.amount || 0} (${worker.payment?.status || 'unknown'})`);
          });
        }
        console.log('');
      });
    }

    // 6. Check Ratings
    console.log('\n⭐ RATINGS:');
    console.log('=' * 50);
    const ratings = await Rating.find()
      .populate('rater', 'firstName lastName companyName')
      .populate('ratee', 'firstName lastName companyName')
      .select('rater ratee rating review ratingType createdAt');
    console.log(`Total Ratings: ${ratings.length}`);
    
    if (ratings.length > 0) {
      console.log('\nRating Details:');
      ratings.forEach((rating, index) => {
        const raterName = rating.rater?.firstName ? `${rating.rater.firstName} ${rating.rater.lastName}` : rating.rater?.companyName || 'Unknown';
        const rateeName = rating.ratee?.firstName ? `${rating.ratee.firstName} ${rating.ratee.lastName}` : rating.ratee?.companyName || 'Unknown';
        
        console.log(`${index + 1}. ${raterName} → ${rateeName}`);
        console.log(`   Rating: ${rating.rating}/5`);
        console.log(`   Type: ${rating.ratingType}`);
        console.log(`   Review: ${rating.review || 'No review'}`);
        console.log(`   Date: ${rating.createdAt?.toLocaleDateString() || 'Unknown'}`);
        console.log('');
      });
    }

    // 7. Specific check for John Doe test data
    console.log('\n🎯 SPECIFIC CHECK FOR TEST USER (John Doe):');
    console.log('=' * 50);
    const johnDoe = await User.findOne({ email: 'john.doe@student.com' });
    
    if (johnDoe) {
      console.log(`✅ John Doe found: ${johnDoe.firstName} ${johnDoe.lastName}`);
      console.log(`   ID: ${johnDoe._id}`);
      console.log(`   Email: ${johnDoe.email}`);
      console.log(`   Active: ${johnDoe.isActive}`);
      console.log(`   Verified: ${johnDoe.isVerified}`);
      console.log(`   Rating: ${johnDoe.rating || 0}`);
      
      // Check John's applications
      const johnApps = await GigApply.find({ user: johnDoe._id }).populate('gigRequest', 'title');
      console.log(`   Applications: ${johnApps.length}`);
      johnApps.forEach((app, index) => {
        console.log(`     ${index + 1}. ${app.gigRequest?.title} (${app.status})`);
      });
      
      // Check John's completions
      const johnCompletions = await GigCompletion.find({ 'workers.worker': johnDoe._id });
      console.log(`   Completed Gigs: ${johnCompletions.length}`);
      
      // Check John's total earnings
      let totalEarnings = 0;
      let monthlyEarnings = 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      johnCompletions.forEach(completion => {
        completion.workers.forEach(worker => {
          if (worker.worker.toString() === johnDoe._id.toString()) {
            totalEarnings += worker.payment?.amount || 0;
            
            const completionDate = new Date(completion.completedAt);
            if (completionDate.getMonth() === currentMonth && completionDate.getFullYear() === currentYear) {
              monthlyEarnings += worker.payment?.amount || 0;
            }
          }
        });
      });
      
      console.log(`   Total Earnings: LKR ${totalEarnings}`);
      console.log(`   Monthly Earnings: LKR ${monthlyEarnings}`);
      
    } else {
      console.log('❌ John Doe test user not found!');
    }

    console.log('\n📊 DATABASE CHECK COMPLETED!');
    console.log('\nIf the John Doe test user has applications and completions but the frontend dashboard shows 0,');
    console.log('then the issue is likely in the frontend authentication or API calls.');

  } catch (error) {
    console.error('❌ Error checking database data:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  await connectDB();
  await checkDatabaseData();
  process.exit(0);
};

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { checkDatabaseData };
