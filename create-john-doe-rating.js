const mongoose = require('mongoose');
const User = require('./src/models/user');
const Employer = require('./src/models/employer');
const GigRequest = require('./src/models/gigRequest');
const GigCompletion = require('./src/models/gigCompletion');
const Rating = require('./src/models/rating');

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

// Create rating for John Doe
const createJohnDoeRating = async () => {
  try {
    console.log('🌟 Creating rating for John Doe...\n');

    // Find John Doe
    const johnDoe = await User.findOne({ email: 'john.doe@student.com' });
    if (!johnDoe) {
      console.log('❌ John Doe not found!');
      return;
    }

    // Find the completed gig
    const completedGig = await GigCompletion.findOne({
      'workers.worker': johnDoe._id,
      status: 'completed'
    }).populate('gigRequest').populate('employer');

    if (!completedGig) {
      console.log('❌ No completed gig found for John Doe');
      return;
    }

    console.log(`✅ Found completed gig: ${completedGig.gigRequest.title}`);

    // Check if rating already exists
    let existingRating = await Rating.findOne({
      ratee: johnDoe._id,
      rateeType: 'user',
      gigRequest: completedGig.gigRequest._id
    });

    if (!existingRating) {
      // Create rating from employer to John Doe
      const rating = await Rating.create({
        rater: completedGig.employer._id,
        raterType: 'employer',
        ratee: johnDoe._id,
        rateeType: 'user',
        gigRequest: completedGig.gigRequest._id,
        gigCompletion: completedGig._id,
        rating: 4.5,
        review: 'Excellent work! Very professional and completed all tasks on time.',
        ratingType: 'job_completion',
        isVerified: true
      });

      console.log('✅ Rating created successfully!');
      console.log(`   Rating: ${rating.rating}/5`);
      console.log(`   Review: ${rating.review}`);
    } else {
      console.log('✅ Rating already exists');
      console.log(`   Rating: ${existingRating.rating}/5`);
    }

    // Create another rating to increase average
    let existingRating2 = await Rating.findOne({
      ratee: johnDoe._id,
      rateeType: 'user',
      ratingType: 'general'
    });

    if (!existingRating2) {
      // Create a general rating
      const rating2 = await Rating.create({
        rater: completedGig.employer._id,
        raterType: 'employer',
        ratee: johnDoe._id,
        rateeType: 'user',
        rating: 4.0,
        review: 'Good communication and reliable worker.',
        ratingType: 'general',
        isVerified: true
      });

      console.log('✅ Second rating created successfully!');
      console.log(`   Rating: ${rating2.rating}/5`);
    }

    // Verify ratings
    const allRatings = await Rating.find({ 
      ratee: johnDoe._id,
      rateeType: 'user'
    });

    console.log(`\n📊 Total ratings for John Doe: ${allRatings.length}`);
    if (allRatings.length > 0) {
      const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
      console.log(`   Average rating: ${avgRating.toFixed(1)}/5`);
    }

    console.log('\n✅ Rating creation completed!');

  } catch (error) {
    console.error('❌ Error creating rating:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  await connectDB();
  await createJohnDoeRating();
  process.exit(0);
};

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { createJohnDoeRating };
