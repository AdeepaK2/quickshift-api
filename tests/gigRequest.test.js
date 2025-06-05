const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const GigRequest = require('../src/models/gigRequest');
const Employer = require('../src/models/employer');

// Test data - will be set in beforeAll
let employerId;

// Sample gig request data
const sampleGigRequest = {
  title: 'Test Gig Request',
  description: 'This is a test gig request',
  category: 'IT',
  employer: employerId,
  payRate: {
    amount: 25,
    rateType: 'hourly'
  },
  timeSlots: [{
    date: new Date('2025-06-01'),
    startTime: new Date('2025-06-01T09:00:00'),
    endTime: new Date('2025-06-01T17:00:00'),
    peopleNeeded: 3,
    peopleAssigned: 0
  }],
  location: {
    address: '123 Test Street',
    city: 'Test City',
    postalCode: '12345',
    coordinates: {
      latitude: 40.7128,
      longitude: -74.0060
    }
  },
  requirements: {
    skills: ['JavaScript', 'React'],
    experience: '2 years',
    dress: 'Casual',
    equipment: 'Laptop'
  },
  status: 'open',
  totalPositions: 3,
  filledPositions: 0,
  applicationDeadline: new Date('2025-05-30')
};

// Test setup and teardown
beforeAll(async () => {
  // Connect to your actual MongoDB instead of memory server
  await mongoose.connect(process.env.MONGO_DB_URI);
  
  // Create a test employer if one doesn't exist
  const testEmployer = await Employer.findOne({ email: 'test@company.com' });
  if (testEmployer) {
    employerId = testEmployer._id.toString();
  } else {
    const newEmployer = await Employer.create({
      companyName: 'Test Company',
      email: 'test@company.com',
      password: 'testpassword123',
      contactNumber: '1234567890',
      isVerified: true
    });
    employerId = newEmployer._id.toString();
  }
});

afterAll(async () => {
  // Clean up test data
  await GigRequest.deleteMany({ title: { $in: ['Test Gig Request', 'Another Gig', 'Second Gig for Employer', 'Another Employer Gig', 'Updated Gig Title'] } });
  await Employer.findByIdAndDelete(employerId);
  await mongoose.disconnect();
});

// Clean up test data before each test
beforeEach(async () => {
  // Only delete gig requests created during testing (with our test title)
  await GigRequest.deleteMany({ title: { $in: ['Test Gig Request', 'Another Gig', 'Second Gig for Employer', 'Another Employer Gig', 'Updated Gig Title'] } });
});

describe('GigRequest API Endpoints', () => {
  // Test for creating a gig request
  describe('POST /api/gig-requests', () => {
    it('should create a new gig request', async () => {
      const response = await request(app)
        .post('/api/gig-requests')
        .send(sampleGigRequest)
        .expect(201);
        expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(sampleGigRequest.title);
      expect(response.body.data.employer._id.toString()).toBe(employerId);
    });
    
    it('should return error if required fields are missing', async () => {
      const invalidData = { ...sampleGigRequest };
      delete invalidData.title;
      
      const response = await request(app)
        .post('/api/gig-requests')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  // Test for getting all gig requests
  describe('GET /api/gig-requests', () => {
    beforeEach(async () => {
      // Create some test gig requests
      await GigRequest.create(sampleGigRequest);
      
      // Create another gig request with different employer
      const anotherGigRequest = {
        ...sampleGigRequest,
        title: 'Another Gig',
        employer: new mongoose.Types.ObjectId()
      };
      await GigRequest.create(anotherGigRequest);
    });
    
    it('should return all gig requests', async () => {
      const response = await request(app)
        .get('/api/gig-requests')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should filter gig requests by employer', async () => {
      const response = await request(app)
        .get(`/api/gig-requests?employer=${employerId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.some(gig => gig.title === sampleGigRequest.title)).toBe(true);
    });
    
    it('should filter gig requests by category', async () => {
      const response = await request(app)
        .get('/api/gig-requests?category=IT')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.some(gig => gig.category === 'IT')).toBe(true);
    });
  });
  
  // Test for getting a specific gig request
  describe('GET /api/gig-requests/:id', () => {
    let gigRequestId;
    
    beforeEach(async () => {
      const gigRequest = await GigRequest.create(sampleGigRequest);
      gigRequestId = gigRequest._id;
    });
    
    it('should return a specific gig request by ID', async () => {
      const response = await request(app)
        .get(`/api/gig-requests/${gigRequestId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(gigRequestId.toString());
    });
    
    it('should return 404 for non-existent gig request', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/gig-requests/${nonExistentId}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  // Test for getting gig requests by employer ID
  describe('GET /api/gig-requests/employer/:employerId', () => {
    beforeEach(async () => {
      // Create multiple gig requests for the test employer
      await GigRequest.create(sampleGigRequest);
      await GigRequest.create({
        ...sampleGigRequest,
        title: 'Second Gig for Employer'
      });
      
      // Create a gig request for another employer
      await GigRequest.create({
        ...sampleGigRequest,
        title: 'Another Employer Gig',
        employer: new mongoose.Types.ObjectId()
      });
    });
    
    it('should return all gig requests for the existing employer', async () => {
      const response = await request(app)
        .get(`/api/gig-requests/employer/${employerId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      // Should find at least the two we just created
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      // At least one should match our test title
      expect(response.body.data.some(gig => gig.title === sampleGigRequest.title)).toBe(true);
    });
    
    it('should return 404 for non-existent employer', async () => {
      const nonExistentEmployerId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/gig-requests/employer/${nonExistentEmployerId}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  // Test for updating a gig request
  describe('PATCH /api/gig-requests/:id', () => {
    let gigRequestId;
    
    beforeEach(async () => {
      const gigRequest = await GigRequest.create(sampleGigRequest);
      gigRequestId = gigRequest._id;
    });
    
    it('should update a gig request', async () => {
      const updatedData = {
        title: 'Updated Gig Title',
        description: 'Updated description'
      };
      
      const response = await request(app)
        .patch(`/api/gig-requests/${gigRequestId}`)
        .send(updatedData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updatedData.title);
      expect(response.body.data.description).toBe(updatedData.description);
    });
    
    it('should return 404 for non-existent gig request', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .patch(`/api/gig-requests/${nonExistentId}`)
        .send({ title: 'Updated Title' })
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  // Test for deleting a gig request
  describe('DELETE /api/gig-requests/:id', () => {
    let gigRequestId;
    
    beforeEach(async () => {
      const gigRequest = await GigRequest.create(sampleGigRequest);
      gigRequestId = gigRequest._id;
    });
    
    it('should delete a gig request', async () => {
      const response = await request(app)
        .delete(`/api/gig-requests/${gigRequestId}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Verify it's deleted
      const gigExists = await GigRequest.findById(gigRequestId);
      expect(gigExists).toBeNull();
    });
    
    it('should return 404 for non-existent gig request', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/gig-requests/${nonExistentId}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
  });
});