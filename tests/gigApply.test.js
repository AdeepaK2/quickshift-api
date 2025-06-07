const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const GigApply = require('../src/models/gigApply');
const GigRequest = require('../src/models/gigRequest');
const User = require('../src/models/user');
const Employer = require('../src/models/employer');

// Test data
let employerId;
let userId;
let gigRequestId;
let applicationId;

// Sample application data
const sampleApplication = {
  timeSlots: [
    {
      timeSlotId: new mongoose.Types.ObjectId(),
      date: new Date('2025-06-01'),
      startTime: new Date('2025-06-01T09:00:00'),
      endTime: new Date('2025-06-01T17:00:00')
    }
  ],
  coverLetter: 'I am very interested in this gig and believe I would be a great fit.'
};

// Test setup and teardown
beforeAll(async () => {
  // Connect to your actual MongoDB
  await mongoose.connect(process.env.MONGO_DB_URI);
  
  // Create a test employer if one doesn't exist
  const testEmployer = await Employer.findOne({ email: 'testemployer@example.com' });
  if (testEmployer) {
    employerId = testEmployer._id.toString();
  } else {
    const newEmployer = await Employer.create({
      email: 'testemployer@example.com',
      password: 'password123',
      companyName: 'Test Company',
      contactNumber: '1234567890',
      verified: true
    });
    employerId = newEmployer._id.toString();
  }
  
  // Create a test user if one doesn't exist
  const testUser = await User.findOne({ email: 'testuser@example.com' });
  if (testUser) {
    userId = testUser._id.toString();
  } else {
    const newUser = await User.create({
      email: 'testuser@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'job_seeker'
    });
    userId = newUser._id.toString();
  }
  
  // Create a test gig request if one doesn't exist
  const testGig = await GigRequest.findOne({ title: 'Test Gig Application' });
  if (testGig) {
    gigRequestId = testGig._id.toString();
  } else {
    const newGig = await GigRequest.create({
      title: 'Test Gig Application',
      description: 'This is a test gig for applications',
      category: 'Testing',
      employer: employerId,
      payRate: {
        amount: 20,
        rateType: 'hourly'
      },
      timeSlots: [{
        date: new Date('2025-06-01'),
        startTime: new Date('2025-06-01T09:00:00'),
        endTime: new Date('2025-06-01T17:00:00'),
        peopleNeeded: 5,
        peopleAssigned: 0
      }],      location: {
        address: '123 Test Street',
        city: 'Test City',
        postalCode: '12345',
        coordinates: {
          latitude: 43.6532,
          longitude: -79.3832
        }
      },
      status: 'open',
      totalPositions: 5,
      filledPositions: 0
    });
    gigRequestId = newGig._id.toString();
  }
});

afterAll(async () => {
  // Clean up test data if needed, but keep the main test user and gig
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Delete any test applications before each test
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

describe('GigApply API Endpoints', () => {
  // Test for applying to a gig
  describe('POST /api/gig-applications', () => {
    it('should create a new gig application', async () => {
      const applicationData = {
        userId,
        gigRequestId,
        ...sampleApplication
      };
      
      const response = await request(app)
        .post('/api/gig-applications')
        .send(applicationData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.toString()).toBe(userId);
      expect(response.body.data.gigRequest.toString()).toBe(gigRequestId);
      
      // Save application ID for later tests
      applicationId = response.body.data._id;
    });
    
    it('should prevent duplicate applications', async () => {
      // First application
      await request(app)
        .post('/api/gig-applications')
        .send({
          userId,
          gigRequestId,
          ...sampleApplication
        });
      
      // Try to apply again
      const response = await request(app)
        .post('/api/gig-applications')
        .send({
          userId,
          gigRequestId,
          ...sampleApplication
        })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already applied');
    });
  });
  
  // Test for getting applications
  describe('GET /api/gig-applications/user/:userId', () => {
    beforeEach(async () => {
      // Create a test application
      await request(app)
        .post('/api/gig-applications')
        .send({
          userId,
          gigRequestId,
          ...sampleApplication
        });
    });
    
    it('should get all applications for a user', async () => {
      const response = await request(app)
        .get(`/api/gig-applications/user/${userId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].user.toString()).toBe(userId);
    });
    
    it('should filter applications by status', async () => {
      const response = await request(app)
        .get(`/api/gig-applications/user/${userId}?status=applied`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.data[0].status).toBe('applied');
    });
  });
  
  // Test for updating application status
  describe('PATCH /api/gig-applications/:id/status', () => {
    let testApplicationId;
    
    beforeEach(async () => {
      // Create a test application
      const response = await request(app)
        .post('/api/gig-applications')
        .send({
          userId,
          gigRequestId,
          ...sampleApplication
        });
      
      testApplicationId = response.body.data._id;
    });
    
    it('should update application status', async () => {
      const response = await request(app)
        .patch(`/api/gig-applications/${testApplicationId}/status`)
        .send({ status: 'shortlisted' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('shortlisted');
      
      // Verify the status is updated in GigRequest as well
      const gigRequest = await GigRequest.findById(gigRequestId);
      const applicant = gigRequest.applicants.find(a => a.user.toString() === userId);
      expect(applicant.status).toBe('shortlisted');
    });
    
    it('should reject invalid status values', async () => {
      const response = await request(app)
        .patch(`/api/gig-applications/${testApplicationId}/status`)
        .send({ status: 'invalid_status' })
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  // Additional tests for other endpoints can be added here
});
