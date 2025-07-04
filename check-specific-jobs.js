// Check for specific jobs that should be filled
const mongoose = require('mongoose');
require('dotenv').config();

const GigRequest = require('./src/models/gigRequest');
const GigApply = require('./src/models/gigApply');

async function checkSpecificJobs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift');
    console.log('Connected to MongoDB');

    // Look for jobs with "teacher" in the title
    const teacherJobs = await GigRequest.find({
      title: { $regex: /teacher/i }
    }).select('title status filledPositions totalPositions');

    console.log('\nTeacher Jobs:');
    teacherJobs.forEach(job => {
      console.log(`- ${job.title}: ${job.status} (${job.filledPositions}/${job.totalPositions} filled)`);
    });

    // Look for any job with filled positions >= total positions
    const shouldBeFilledJobs = await GigRequest.find({
      $expr: { $gte: ['$filledPositions', '$totalPositions'] }
    }).select('title status filledPositions totalPositions');

    console.log('\nJobs that should be filled:');
    shouldBeFilledJobs.forEach(job => {
      console.log(`- ${job.title}: ${job.status} (${job.filledPositions}/${job.totalPositions} filled)`);
    });

    // Check all jobs to see their current status
    console.log('\nAll Jobs:');
    const allJobs = await GigRequest.find({}).select('title status filledPositions totalPositions').sort({ createdAt: -1 });
    allJobs.forEach(job => {
      const shouldBeFilled = job.filledPositions >= job.totalPositions;
      const statusMismatch = shouldBeFilled && job.status !== 'filled' && job.status !== 'in_progress' && job.status !== 'completed';
      console.log(`- ${job.title}: ${job.status} (${job.filledPositions}/${job.totalPositions}) ${statusMismatch ? '⚠️ MISMATCH' : ''}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkSpecificJobs();
