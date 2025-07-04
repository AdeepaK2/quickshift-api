/**
 * Test script to verify application status and filled positions fixes
 */

const mongoose = require('mongoose');
const GigRequest = require('./src/models/gigRequest');
const GigApply = require('./src/models/gigApply');
const User = require('./src/models/user');
const Employer = require('./src/models/employer');

require('dotenv').config();

async function testApplicationStatusFix() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a test job and user
    const job = await GigRequest.findOne({ status: 'active' }).populate('employer');
    const user = await User.findOne({ role: 'job_seeker' });

    if (!job || !user) {
      console.log('No test data found. Creating sample data...');
      return;
    }

    console.log('\n=== TESTING APPLICATION STATUS & FILLED POSITIONS ===');
    console.log(`Job: ${job.title}`);
    console.log(`Initial filled positions: ${job.filledPositions || 0} / ${job.totalPositions || 0}`);
    console.log(`User: ${user.firstName} ${user.lastName}`);

    // Check if user already has an application for this job
    let existingApp = await GigApply.findOne({ user: user._id, gigRequest: job._id });
    
    if (existingApp) {
      console.log(`\nExisting application found with status: ${existingApp.status}`);
      
      // Test status change from pending to accepted
      if (existingApp.status === 'pending') {
        console.log('\nTesting status change: pending -> accepted');
        existingApp.status = 'accepted';
        await existingApp.save();
        
        // Update filled positions
        await GigRequest.findByIdAndUpdate(job._id, { $inc: { filledPositions: 1 } });
        
        const updatedJob = await GigRequest.findById(job._id);
        console.log(`New filled positions: ${updatedJob.filledPositions} / ${updatedJob.totalPositions}`);
        
        // Test status change from accepted to rejected
        console.log('\nTesting status change: accepted -> rejected');
        existingApp.status = 'rejected';
        await existingApp.save();
        
        // Decrease filled positions
        await GigRequest.findByIdAndUpdate(job._id, { $inc: { filledPositions: -1 } });
        
        const finalJob = await GigRequest.findById(job._id);
        console.log(`Final filled positions: ${finalJob.filledPositions} / ${finalJob.totalPositions}`);
      }
    } else {
      console.log('\nNo existing application found. Creating new application...');
      
      // Create new application
      const newApp = new GigApply({
        user: user._id,
        gigRequest: job._id,
        status: 'pending',
        coverLetter: 'Test application for status fix verification',
        appliedAt: new Date()
      });
      
      await newApp.save();
      console.log('New application created with status: pending');
      
      // Add to job's applicants array
      await GigRequest.findByIdAndUpdate(job._id, {
        $push: {
          applicants: {
            user: user._id,
            status: 'applied',
            appliedAt: new Date(),
            coverLetter: 'Test application'
          }
        }
      });
      
      console.log('Application added to job applicants array');
    }

    // Test getting applications with proper status mapping
    console.log('\n=== TESTING APPLICATION RETRIEVAL ===');
    const userApplications = await GigApply.find({ user: user._id })
      .populate({
        path: 'gigRequest',
        select: 'title employer payRate location',
        populate: {
          path: 'employer',
          select: 'companyName'
        }
      });

    console.log(`Found ${userApplications.length} applications for user:`);
    userApplications.forEach(app => {
      console.log(`- ${app.gigRequest.title}: ${app.status}`);
    });

    // Test employer view of applications
    console.log('\n=== TESTING EMPLOYER VIEW ===');
    const employerJobs = await GigRequest.aggregate([
      { $match: { employer: job.employer._id } },
      {
        $lookup: {
          from: 'gigapplies',
          localField: '_id',
          foreignField: 'gigRequest',
          as: 'applications'
        }
      },
      {
        $addFields: {
          applicationsCount: { $size: '$applications' }
        }
      },
      {
        $project: {
          applications: 0
        }
      }
    ]);

    console.log(`Found ${employerJobs.length} jobs for employer:`);
    employerJobs.forEach(jobData => {
      console.log(`- ${jobData.title}: ${jobData.applicationsCount} applications, ${jobData.filledPositions || 0}/${jobData.totalPositions || 0} filled`);
    });

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testApplicationStatusFix();
