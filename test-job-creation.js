// Test script to verify job posting functionality
const mongoose = require('mongoose');
const GigRequest = require('./src/models/gigRequest');
const Employer = require('./src/models/employer');

async function testJobCreation() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_DB_URI || 'mongodb://localhost:27017/quickshift');
    
    // Find an existing employer for testing
    const employer = await Employer.findOne();
    if (!employer) {
      console.log('No employer found. Please create an employer first.');
      return;
    }
    
    console.log('Found employer:', employer.companyName);
    
    // Test job data
    const testJobData = {
      title: 'Test Event Staff Position',
      description: 'This is a test job posting created via the new popup modal system.',
      category: 'Event Staff',
      employer: employer._id,
      payRate: {
        amount: 2500,
        rateType: 'hourly'
      },
      location: {
        address: '123 Test Street',
        city: 'Colombo',
        postalCode: '00100',
        coordinates: {
          latitude: 6.9271,
          longitude: 79.8612,
          type: 'Point'
        }
      },
      timeSlots: [{
        date: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours later
        peopleNeeded: 2,
        peopleAssigned: 0
      }],
      requirements: [
        'Must be 18 years or older',
        'Good communication skills',
        'Ability to work weekends'
      ],
      totalPositions: 2,
      status: 'active'
    };
    
    // Create the job
    const newJob = new GigRequest(testJobData);
    await newJob.save();
    
    console.log('✅ Test job created successfully!');
    console.log('Job ID:', newJob._id);
    console.log('Job Title:', newJob.title);
    console.log('Status:', newJob.status);
    
    // Clean up - remove the test job
    await GigRequest.findByIdAndDelete(newJob._id);
    console.log('✅ Test job cleaned up successfully!');
    
  } catch (error) {
    console.error('❌ Error testing job creation:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  testJobCreation();
}

module.exports = { testJobCreation };
