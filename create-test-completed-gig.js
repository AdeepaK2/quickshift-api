const mongoose = require('mongoose');
const GigCompletion = require('./src/models/gigCompletion');
const GigRequest = require('./src/models/gigRequest');
const Employer = require('./src/models/employer');
const User = require('./src/models/user');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create test completed gig
const createTestCompletedGig = async () => {
  try {
    // Find or create test employer
    let employer = await Employer.findOne({ email: 'testemployer@example.com' });
    if (!employer) {
      employer = await Employer.create({
        email: 'testemployer@example.com',
        password: 'password123',
        companyName: 'Test Company',
        contactNumber: '1234567890',
        verified: true
      });
    }

    // Find or create test user (student)
    let user = await User.findOne({ email: 'testuser@example.com' });
    if (!user) {
      user = await User.create({
        email: 'testuser@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'job_seeker'
      });
    }

    // Create test gig request
    const gigRequest = await GigRequest.create({
      title: 'Test Completed Job',
      description: 'This is a test completed job for testing the completion flow',
      category: 'Data Entry',
      employer: employer._id,
      payRate: {
        amount: 2000,
        rateType: 'hourly'
      },
      location: {
        address: 'Test Address',
        city: 'Colombo'
      },
      timeSlots: [{
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
        peopleNeeded: 1,
        peopleAssigned: 1
      }],
      totalPositions: 1,
      filledPositions: 1,
      status: 'completed'
    });

    // Create completed gig
    const gigCompletion = await GigCompletion.create({
      gigRequest: gigRequest._id,
      employer: employer._id,
      status: 'completed',
      workers: [{
        worker: user._id,
        completedTimeSlots: [{
          timeSlotId: gigRequest.timeSlots[0]._id,
          date: new Date(),
          actualStartTime: new Date(),
          actualEndTime: new Date(Date.now() + 8 * 60 * 60 * 1000),
          hoursWorked: 8,
          breakTime: 0
        }],
        payment: {
          status: 'paid',
          amount: 16000, // 8 hours * 2000 per hour
          calculationDetails: {
            baseRate: 2000,
            rateType: 'hourly',
            totalHours: 8,
            overtimeHours: 0,
            overtimeRate: 3000
          }
        },
        performance: {
          rating: 5,
          feedback: 'Excellent work!'
        }
      }],
      paymentSummary: {
        totalAmount: 16000,
        finalAmount: 16000,
        paymentStatus: 'completed'
      },
      completedAt: new Date()
    });

    console.log('✅ Test completed gig created successfully!');
    console.log('Gig Completion ID:', gigCompletion._id);
    console.log('Job Title:', gigRequest.title);
    console.log('Employer:', employer.companyName);
    console.log('Worker:', `${user.firstName} ${user.lastName}`);
    console.log('Status:', gigCompletion.status);
    
    return {
      gigCompletion,
      gigRequest,
      employer,
      user
    };
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  console.log('🔧 Creating test completed gig...');
  const testData = await createTestCompletedGig();
  
  console.log('\n📊 Test data created for job completion flow:');
  console.log('- Employer can see this in "Completed" filter in Manage Jobs');
  console.log('- Student can see this in "My Gigs" section');
  console.log('- Job completion flow is ready for testing');
  
  process.exit(0);
};

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}
