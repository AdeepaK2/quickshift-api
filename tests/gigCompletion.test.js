const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const GigCompletion = require('../src/models/gigCompletion');
const GigRequest = require('../src/models/gigRequest');
const User = require('../src/models/user');
const Employer = require('../src/models/employer');
const GigApply = require('../src/models/gigApply');
const connectDB = require('../src/config/db');

// Sample data for testing
let testEmployer;
let testUser;
let testGigRequest;
let testGigApply;
let testGigCompletion;

// Helper function to convert date to ISO string without milliseconds
const dateToISOString = (date) => {
  return new Date(date).toISOString().split('.')[0] + 'Z';
};

// Set a higher timeout for all tests
jest.setTimeout(30000);

describe('Gig Completion API', () => {
  let connection;
  
  // Connect to the database before all tests
  beforeAll(async () => {
    connection = await connectDB();
    
    // Clean up existing test data before starting
    await GigCompletion.deleteMany({});
    await GigApply.deleteMany({});
    await GigRequest.deleteMany({});// Create test data for employer, user, gig request, and application
    // Use unique emails with timestamp to avoid collisions
    const timestamp = new Date().getTime();
    
    testEmployer = await Employer.create({
      companyName: 'Test Company',
      email: `test-company-${timestamp}@example.com`,
      password: 'testpassword123',
      phone: '+1234567890',
      verified: true
    });

    testUser = await User.create({
      role: 'job_seeker',
      email: `test-user-${timestamp}@example.com`,
      password: 'testpassword123',
      firstName: 'Test',
      lastName: 'User',
      phone: '+0987654321',
      isActive: true,
      isVerified: true
    });

    // Create a test gig request with a time slot
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startTime = new Date(tomorrow);
    startTime.setHours(9, 0, 0, 0);
    
    const endTime = new Date(tomorrow);
    endTime.setHours(17, 0, 0, 0);
    
    testGigRequest = await GigRequest.create({
      title: 'Test Gig',
      description: 'A test gig for testing completion',
      category: 'Event Staff',
      employer: testEmployer._id,
      payRate: {
        amount: 15,
        rateType: 'hourly'
      },
      timeSlots: [{
        date: tomorrow,
        startTime: startTime,
        endTime: endTime,
        peopleNeeded: 2,
        peopleAssigned: 1
      }],
      location: {
        address: '123 Test St',
        city: 'Test City',
        postalCode: '12345'
      },
      requirements: {
        skills: ['Customer Service'],
        experience: '1 year',
        dress: 'Casual'
      },
      status: 'in_progress',
      totalPositions: 2,
      filledPositions: 1
    });

    // Create a test gig application
    testGigApply = await GigApply.create({
      user: testUser._id,
      gigRequest: testGigRequest._id,
      timeSlots: [{
        timeSlotId: testGigRequest.timeSlots[0]._id,
        date: testGigRequest.timeSlots[0].date,
        startTime: testGigRequest.timeSlots[0].startTime,
        endTime: testGigRequest.timeSlots[0].endTime
      }],
      status: 'hired',
      appliedAt: new Date()
    });
  });
  afterAll(async () => {
    // Clean up test data
    await GigCompletion.deleteMany({});
    await GigApply.deleteMany({});
    await GigRequest.deleteMany({});
    await User.deleteMany({});
    await Employer.deleteMany({});
      // Close mongoose connection
    await mongoose.connection.close();
  });

  // Test for initializing a gig completion
  test('Should initialize a gig completion record', async () => {
    const response = await request(app)
      .post('/api/gig-completions/initialize')
      .send({
        gigRequestId: testGigRequest._id
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('_id');
    expect(response.body.data.gigRequest.toString()).toBe(testGigRequest._id.toString());
    expect(response.body.data.employer.toString()).toBe(testEmployer._id.toString());
    expect(response.body.data.workers).toHaveLength(1);
    expect(response.body.data.workers[0].worker.toString()).toBe(testUser._id.toString());
    
    // Save the test gig completion for later tests
    testGigCompletion = response.body.data;
  }); 

  // Test for getting gig completion by ID
  test('Should get a gig completion by ID', async () => {
    jest.setTimeout(30000); // Increase timeout for this test
    const response = await request(app)
      .get(`/api/gig-completions/${testGigCompletion._id}`);    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id.toString()).toBe(testGigCompletion._id.toString());
  });

  // Test for updating worker time slots
  test('Should update worker time slots', async () => {
    const workerId = testGigCompletion.workers[0].worker;
    
    // Calculate actual start and end time (e.g., worker started 30 minutes late and finished 15 minutes early)
    const timeSlot = testGigRequest.timeSlots[0];
    
    const actualStartTime = new Date(timeSlot.startTime);
    actualStartTime.setMinutes(actualStartTime.getMinutes() + 30);
    
    const actualEndTime = new Date(timeSlot.endTime);
    actualEndTime.setMinutes(actualEndTime.getMinutes() - 15);
    
    // Calculate hours worked
    const hoursWorked = (actualEndTime - actualStartTime) / (1000 * 60 * 60);
    
    const response = await request(app)
      .put(`/api/gig-completions/${testGigCompletion._id}/worker/${workerId}`)
      .send({
        completedTimeSlots: [{
          timeSlotId: testGigRequest.timeSlots[0]._id,
          date: timeSlot.date,
          actualStartTime,
          actualEndTime,
          hoursWorked,
          breakTime: 30 // 30 minutes break
        }]
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('completedTimeSlots');
    expect(response.body.data.completedTimeSlots[0].hoursWorked).toBe(hoursWorked);
  });

  // Test for updating worker performance
  test('Should update worker performance evaluation', async () => {
    const workerId = testGigCompletion.workers[0].worker;
    
    const response = await request(app)
      .put(`/api/gig-completions/${testGigCompletion._id}/worker/${workerId}/performance`)
      .send({
        rating: 4.5,
        feedback: 'Great work!',
        punctuality: 4,
        quality: 5,
        professionalism: 4.5
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.performance).toHaveProperty('rating', 4.5);
    expect(response.body.data.performance).toHaveProperty('feedback', 'Great work!');
  });

  // Test for marking gig as completed
  test('Should mark gig as completed', async () => {
    const response = await request(app)
      .put(`/api/gig-completions/${testGigCompletion._id}/complete`)
      .send({
        completionProof: ['https://example.com/proof1.jpg'],
        notes: 'Completed as expected'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('completed');
    expect(response.body.data).toHaveProperty('completedAt');
    
    // Verify that the gig request status was also updated
    const updatedGigRequest = await GigRequest.findById(testGigRequest._id);
    expect(updatedGigRequest.status).toBe('completed');
  });

  // Test for processing payment
  test('Should process payment for a completed gig', async () => {
    const response = await request(app)
      .post(`/api/gig-completions/${testGigCompletion._id}/process-payment`)
      .send({
        paymentMethod: 'bank_transfer',
        notes: 'Payment processed on time'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('invoiceNumber');
    expect(response.body.data.status).toBe('processing');
  });

  // Test for getting worker's gig completions
  test('Should get gig completions for a worker', async () => {
    const response = await request(app)
      .get(`/api/gig-completions/worker/${testUser._id}`);    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    if (response.body.data[0].workers && response.body.data[0].workers[0]) {
      expect(response.body.data[0].workers[0].worker.toString()).toBe(testUser._id.toString());
    }
  });
  
  // Test for getting all gig completions
  test('Should get all gig completions', async () => {
    const response = await request(app)
      .get('/api/gig-completions');

    expect(response.statusCode).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });
});
