// Test script to check job statuses and filled positions
const mongoose = require('mongoose');
require('dotenv').config();

const GigRequest = require('./src/models/gigRequest');
const GigApply = require('./src/models/gigApply');

async function checkJobStatuses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');
    console.log('Connected to MongoDB');

    console.log('\n=== Checking Job Statuses ===');
    
    const jobs = await GigRequest.find({})
      .select('title status filledPositions totalPositions')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('\nRecent Jobs:');
    jobs.forEach(job => {
      console.log(`- ${job.title}: ${job.status} (${job.filledPositions}/${job.totalPositions} filled)`);
      
      if (job.filledPositions >= job.totalPositions && job.status !== 'filled') {
        console.log(`  ⚠️  Job should be marked as 'filled' but is '${job.status}'`);
      }
    });

    console.log('\n=== Checking Applications ===');
    
    const applications = await GigApply.find({ status: 'accepted' })
      .populate('gigRequest', 'title status filledPositions totalPositions')
      .sort({ updatedAt: -1 })
      .limit(5);
    
    console.log('\nRecent Accepted Applications:');
    applications.forEach(app => {
      const job = app.gigRequest;
      console.log(`- Application for "${job.title}": Job status = ${job.status} (${job.filledPositions}/${job.totalPositions})`);
    });

    // Check for specific inconsistencies
    console.log('\n=== Looking for Inconsistencies ===');
    const inconsistentJobs = await GigRequest.find({
      $expr: {
        $and: [
          { $gte: ['$filledPositions', '$totalPositions'] },
          { $ne: ['$status', 'filled'] },
          { $ne: ['$status', 'in_progress'] },
          { $ne: ['$status', 'completed'] }
        ]
      }
    });

    if (inconsistentJobs.length > 0) {
      console.log('Found jobs that should be marked as filled:');
      inconsistentJobs.forEach(job => {
        console.log(`- ${job.title}: ${job.status} (${job.filledPositions}/${job.totalPositions})`);
      });
    } else {
      console.log('No inconsistencies found.');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkJobStatuses();
