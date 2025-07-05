const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
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
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create comprehensive test data for dashboard stats
const createDashboardTestData = async () => {
  try {
    console.log('🔧 Creating comprehensive test data for dashboard stats...\n');

    // Step 1: Find or create test student (the one that will see the stats)
    let testStudent = await User.findOne({ email: 'john.doe@student.com' });
    if (!testStudent) {
      console.log('Creating test student...');
      testStudent = await User.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@student.com',
        password: await bcrypt.hash('password123', 10),
        role: 'job_seeker',
        university: 'University of Technology',
        faculty: 'Computer Science',
        yearOfStudy: 3,
        phone: '+1234567890',
        isActive: true,
        isVerified: true,
        studentIdVerified: true,
        gender: 'Male',
        city: 'Colombo',
        address: '123 Main St',
        postalCode: '10001',
        bio: 'Computer Science student with passion for web development',
        gpa: 3.8,
      });
      console.log('✅ Test student created');
    } else {
      console.log('✅ Test student found');
    }

    // Step 2: Find or create test employers
    let testEmployer1 = await Employer.findOne({ email: 'tech@example.com' });
    if (!testEmployer1) {
      console.log('Creating test employer 1...');
      testEmployer1 = await Employer.create({
        companyName: 'Tech Solutions Inc',
        email: 'tech@example.com',
        password: await bcrypt.hash('password123', 10),
        contactNumber: '+1234567801',
        location: 'Colombo',
        companyDescription: 'Leading software development company',
        isActive: true,
        isVerified: true,
        industryType: 'Technology',
        companySize: '100+',
        website: 'https://techsolutions.com',
      });
      console.log('✅ Test employer 1 created');
    } else {
      console.log('✅ Test employer 1 found');
    }

    let testEmployer2 = await Employer.findOne({ email: 'marketing@example.com' });
    if (!testEmployer2) {
      console.log('Creating test employer 2...');
      testEmployer2 = await Employer.create({
        companyName: 'Marketing Masters',
        email: 'marketing@example.com',
        password: await bcrypt.hash('password123', 10),
        contactNumber: '+1234567802',
        location: 'Kandy',
        companyDescription: 'Creative marketing and advertising agency',
        isActive: true,
        isVerified: true,
        industryType: 'Marketing',
        companySize: '50-100',
        website: 'https://marketingmasters.com',
      });
      console.log('✅ Test employer 2 created');
    } else {
      console.log('✅ Test employer 2 found');
    }

    // Step 3: Create multiple gig requests
    console.log('\nCreating test gig requests...');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // Job 1: Active job to apply for
    let activeJob = await GigRequest.findOne({ 
      title: 'Web Development Internship',
      employer: testEmployer1._id 
    });
    
    if (!activeJob) {
      activeJob = await GigRequest.create({
        title: 'Web Development Internship',
        description: 'Work on React and Node.js projects',
        category: 'Technology',
        employer: testEmployer1._id,
        payRate: {
          amount: 2500,
          rateType: 'hourly'
        },
        location: {
          address: '123 Tech Street',
          city: 'Colombo',
          postalCode: '10001',
          coordinates: {
            latitude: 6.9271,
            longitude: 79.8612
          }
        },
        timeSlots: [{
          date: tomorrow,
          startTime: new Date(tomorrow.setHours(9, 0, 0)),
          endTime: new Date(tomorrow.setHours(17, 0, 0)),
          peopleNeeded: 2,
          peopleAssigned: 0
        }],
        totalPositions: 2,
        filledPositions: 0,
        status: 'active',
        isAcceptingApplications: true
      });
      console.log('✅ Active job created');
    }

    // Job 2: Completed job
    let completedJob = await GigRequest.findOne({ 
      title: 'Data Entry Project',
      employer: testEmployer2._id 
    });
    
    if (!completedJob) {
      completedJob = await GigRequest.create({
        title: 'Data Entry Project',
        description: 'Enter customer data into spreadsheets',
        category: 'Data Entry',
        employer: testEmployer2._id,
        payRate: {
          amount: 1500,
          rateType: 'hourly'
        },
        location: {
          address: '456 Business Ave',
          city: 'Kandy',
          postalCode: '20001',
          coordinates: {
            latitude: 7.2906,
            longitude: 80.6337
          }
        },
        timeSlots: [{
          date: yesterday(),
          startTime: new Date(yesterday().setHours(10, 0, 0)),
          endTime: new Date(yesterday().setHours(16, 0, 0)),
          peopleNeeded: 1,
          peopleAssigned: 1
        }],
        totalPositions: 1,
        filledPositions: 1,
        status: 'completed'
      });
      console.log('✅ Completed job created');
    }

    // Job 3: Another active job
    let activeJob2 = await GigRequest.findOne({ 
      title: 'Social Media Assistant',
      employer: testEmployer2._id 
    });
    
    if (!activeJob2) {
      activeJob2 = await GigRequest.create({
        title: 'Social Media Assistant',
        description: 'Help manage social media accounts',
        category: 'Marketing',
        employer: testEmployer2._id,
        payRate: {
          amount: 2000,
          rateType: 'hourly'
        },
        location: {
          address: '789 Creative Blvd',
          city: 'Galle',
          postalCode: '80001',
          coordinates: {
            latitude: 6.0535,
            longitude: 80.2210
          }
        },
        timeSlots: [{
          date: nextWeek,
          startTime: new Date(nextWeek.setHours(14, 0, 0)),
          endTime: new Date(nextWeek.setHours(18, 0, 0)),
          peopleNeeded: 1,
          peopleAssigned: 0
        }],
        totalPositions: 1,
        filledPositions: 0,
        status: 'active',
        isAcceptingApplications: true
      });
      console.log('✅ Second active job created');
    }

    // Step 4: Create job applications for the test student
    console.log('\nCreating test applications...');
    
    // Application 1: Pending application
    let application1 = await GigApply.findOne({
      user: testStudent._id,
      gigRequest: activeJob._id
    });
    
    if (!application1) {
      application1 = await GigApply.create({
        user: testStudent._id,
        gigRequest: activeJob._id,
        timeSlots: [{
          timeSlotId: activeJob.timeSlots[0]._id,
          date: activeJob.timeSlots[0].date,
          startTime: activeJob.timeSlots[0].startTime,
          endTime: activeJob.timeSlots[0].endTime
        }],
        coverLetter: 'I am very interested in this web development position',
        status: 'pending',
        appliedAt: new Date()
      });

      // Add to gig request applicants array
      await GigRequest.findByIdAndUpdate(activeJob._id, {
        $push: {
          applicants: {
            user: testStudent._id,
            status: 'applied',
            appliedAt: new Date(),
            coverLetter: 'I am very interested in this web development position'
          }
        }
      });
      console.log('✅ Application 1 (pending) created');
    }

    // Application 2: Accepted application (for completed job)
    let application2 = await GigApply.findOne({
      user: testStudent._id,
      gigRequest: completedJob._id
    });
    
    if (!application2) {
      application2 = await GigApply.create({
        user: testStudent._id,
        gigRequest: completedJob._id,
        timeSlots: [{
          timeSlotId: completedJob.timeSlots[0]._id,
          date: completedJob.timeSlots[0].date,
          startTime: completedJob.timeSlots[0].startTime,
          endTime: completedJob.timeSlots[0].endTime
        }],
        coverLetter: 'I have experience with data entry',
        status: 'accepted',
        appliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      });
      console.log('✅ Application 2 (accepted) created');
    }

    // Application 3: Another pending application
    let application3 = await GigApply.findOne({
      user: testStudent._id,
      gigRequest: activeJob2._id
    });
    
    if (!application3) {
      application3 = await GigApply.create({
        user: testStudent._id,
        gigRequest: activeJob2._id,
        timeSlots: [{
          timeSlotId: activeJob2.timeSlots[0]._id,
          date: activeJob2.timeSlots[0].date,
          startTime: activeJob2.timeSlots[0].startTime,
          endTime: activeJob2.timeSlots[0].endTime
        }],
        coverLetter: 'I am passionate about social media marketing',
        status: 'pending',
        appliedAt: new Date()
      });

      // Add to gig request applicants array
      await GigRequest.findByIdAndUpdate(activeJob2._id, {
        $push: {
          applicants: {
            user: testStudent._id,
            status: 'applied',
            appliedAt: new Date(),
            coverLetter: 'I am passionate about social media marketing'
          }
        }
      });
      console.log('✅ Application 3 (pending) created');
    }

    // Step 5: Create gig completion for the completed job
    console.log('\nCreating gig completion...');
    
    let gigCompletion = await GigCompletion.findOne({
      gigRequest: completedJob._id,
      'workers.worker': testStudent._id
    });
    
    if (!gigCompletion) {
      gigCompletion = await GigCompletion.create({
        gigRequest: completedJob._id,
        employer: testEmployer2._id,
        status: 'completed',
        workers: [{
          worker: testStudent._id,
          application: application2._id,
          completedTimeSlots: [{
            timeSlotId: completedJob.timeSlots[0]._id,
            date: completedJob.timeSlots[0].date,
            actualStartTime: completedJob.timeSlots[0].startTime,
            actualEndTime: completedJob.timeSlots[0].endTime,
            hoursWorked: 6,
            breakTime: 0
          }],
          payment: {
            status: 'paid',
            amount: 9000, // 6 hours * 1500 per hour
            calculationDetails: {
              baseRate: 1500,
              rateType: 'hourly',
              totalHours: 6,
              overtimeHours: 0,
              overtimeRate: 2250
            }
          },
          performance: {
            rating: 4.5,
            feedback: 'Great work ethic and attention to detail!'
          }
        }],
        paymentSummary: {
          totalAmount: 9000,
          finalAmount: 9000,
          paymentStatus: 'completed'
        },
        completedAt: new Date()
      });
      console.log('✅ Gig completion created');
    }

    // Step 6: Skip creating complex ratings for now - focus on basic stats
    console.log('\nSkipping rating creation for now - focusing on basic stats...');
    
    // Instead, let's update the user's general rating manually
    await User.findByIdAndUpdate(testStudent._id, {
      $set: {
        'rating': 4.2,
        'totalRatings': 3
      }
    });
    console.log('✅ Updated student general rating');

    // Step 7: Verify the data by checking stats
    console.log('\n📊 Verifying created data...');
    
    // Check applications count
    const applicationsCount = await GigApply.countDocuments({ user: testStudent._id });
    console.log(`Applications created: ${applicationsCount}`);
    
    // Check completed gigs count
    const completedGigsCount = await GigCompletion.countDocuments({
      'workers.worker': testStudent._id,
      status: 'completed'
    });
    console.log(`Completed gigs: ${completedGigsCount}`);
    
    // Check ratings (simplified)
    const userRecord = await User.findById(testStudent._id);
    console.log(`User rating: ${userRecord.rating || 0}`);
    
    console.log('\n✅ Dashboard test data creation completed!');
    console.log('\n📋 Summary of created data:');
    console.log(`- Test Student: ${testStudent.firstName} ${testStudent.lastName} (${testStudent.email})`);
    console.log(`- Applications: ${applicationsCount} (mix of pending and accepted)`);
    console.log(`- Completed Gigs: ${completedGigsCount}`);
    console.log(`- User Rating: ${userRecord.rating || 0}`);
    console.log('\n🔍 Now check the undergraduate dashboard to see if stats are populated!');

    return {
      testStudent,
      applicationsCount,
      completedGigsCount,
      userRating: userRecord.rating || 0
    };

  } catch (error) {
    console.error('❌ Error creating dashboard test data:', error);
    throw error;
  }
};

// Helper function to get yesterday's date
function yesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

// Main function
const main = async () => {
  await connectDB();
  
  console.log('🚀 Creating comprehensive dashboard test data...\n');
  const result = await createDashboardTestData();
  
  console.log('\n🎯 Test data created successfully!');
  console.log('You should now see non-zero values in the undergraduate dashboard stats.');
  
  process.exit(0);
};

if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { createDashboardTestData };
