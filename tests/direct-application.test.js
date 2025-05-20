const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const GigRequest = require('../src/models/gigRequest');
const GigApply = require('../src/models/gigApply');
const User = require('../src/models/user');

// Test data
const employerId = '681b43c557193b3619f8499b';
let userId;
let gigRequestId;

// Test setup and teardown
beforeAll(async () => {
  // Connect to your actual MongoDB
  await mongoose.connect(process.env.MONGO_DB_URI);
  
  // Create a test user if one doesn't exist
  const testUser = await User.findOne({ email: 'testuser2@example.com' });
  if (testUser) {
    userId = testUser._id.toString();
  } else {
    const newUser = await User.create({
      email: 'testuser2@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User2',
      role: 'job_seeker'
    });
    userId = newUser._id.toString();
  }
  
  // Create a test gig request if one doesn't exist
  const testGig = await GigRequest.findOne({ title: 'Test Direct Apply Gig' });
  if (testGig) {
    gigRequestId = testGig._id.toString();
  } else {
    const newGig = await GigRequest.create({
      title: 'Test Direct Apply Gig',
      description: 'This is a test gig for direct application',
      category: 'Testing',
      employer: employerId,
      payRate: {
        amount: 25,
        rateType: 'hourly'
      },
      timeSlots: [{
        date: new Date('2025-06-01'),
        startTime: new Date('2025-06-01T09:00:00'),
        endTime: new Date('2025-06-01T17:00:00'),
        peopleNeeded: 5,
        peopleAssigned: 0
      }],
      location: {
        address: '123 Test Street',
        city: 'Test City',
        postalCode: '12345'
      },
      status: 'open',
      totalPositions: 5,
      filledPositions: 0
    });
    gigRequestId = newGig._id.toString();
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Remove any existing applications for this user and gig
  await GigApply.deleteMany({
    user: userId,
    gigRequest: gigRequestId
  });
  
  // Update the GigRequest to remove this applicant
  await GigRequest.updateOne(
    { _id: gigRequestId },
    { $pull: { applicants: { user: userId } } }
  );
});

describe('Direct Gig Application Tests', () => {
  it('should allow a user to apply directly to a gig request', async () => {      const response = await request(app)
      .post(`/api/gig-requests/${gigRequestId}/apply`)
      .send({
        userId,
        coverLetter: 'I am applying directly to this gig',
        timeSlots: [{
          timeSlotId: new mongoose.Types.ObjectId(),
          date: new Date('2025-06-01'),
          startTime: new Date('2025-06-01T09:00:00'),
          endTime: new Date('2025-06-01T17:00:00')
        }]
      })
      .expect(201);
    
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('Application submitted successfully');
    
    // Check if the application was added to the gig request
    const gigRequest = await GigRequest.findById(gigRequestId);
    const applicant = gigRequest.applicants.find(a => a.user.toString() === userId);
    expect(applicant).toBeDefined();
    expect(applicant.status).toBe('applied');
    
    // Check if a GigApply record was created
    const gigApply = await GigApply.findOne({
      user: userId,
      gigRequest: gigRequestId
    });
    expect(gigApply).toBeDefined();
    expect(gigApply.status).toBe('applied');
  });
  
  it('should prevent duplicate applications', async () => {
    // First application
    await request(app)
      .post(`/api/gig-requests/${gigRequestId}/apply`)
      .send({
        userId,
        coverLetter: 'I am applying directly to this gig'
      });
    
    // Try to apply again
    const response = await request(app)
      .post(`/api/gig-requests/${gigRequestId}/apply`)
      .send({
        userId,
        coverLetter: 'Trying to apply again'
      })
      .expect(400);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('already applied');
  });
  
  it('should validate user ID exists', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .post(`/api/gig-requests/${gigRequestId}/apply`)
      .send({
        userId: nonExistentId,
        coverLetter: 'Testing with invalid user ID'
      })
      .expect(404);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('User not found');
  });
  
  it('should validate gig request ID exists', async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    
    const response = await request(app)
      .post(`/api/gig-requests/${nonExistentId}/apply`)
      .send({
        userId,
        coverLetter: 'Testing with invalid gig ID'
      })
      .expect(404);
    
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Gig request not found');
  });
});
