const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/user');
const Employer = require('../src/models/employer');
const GigRequest = require('../src/models/gigRequest');
const GigCompletion = require('../src/models/gigCompletion');
const Rating = require('../src/models/rating');

// Test data
let testUser, testEmployer, testGigRequest, testGigCompletion;
let userToken, employerToken;

describe('Rating API', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/quickshift_test');
    
    // Clear test data
    await Promise.all([
      User.deleteMany({}),
      Employer.deleteMany({}),
      GigRequest.deleteMany({}),
      GigCompletion.deleteMany({}),
      Rating.deleteMany({})
    ]);
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@test.com',
      password: 'password123',
      role: 'job_seeker'
    });

    // Create test employer
    testEmployer = await Employer.create({
      companyName: 'Test Company',
      email: 'employer@test.com',
      password: 'password123'
    });

    // Create test gig request
    testGigRequest = await GigRequest.create({
      title: 'Test Gig',
      description: 'Test gig description',
      employer: testEmployer._id,
      jobType: 'part_time',
      location: 'Test Location',
      paymentType: 'hourly',
      paymentAmount: 15,
      requiredWorkers: 1,
      status: 'completed'
    });

    // Create test gig completion
    testGigCompletion = await GigCompletion.create({
      gigRequest: testGigRequest._id,
      employer: testEmployer._id,
      status: 'completed',
      workers: [{
        worker: testUser._id,
        application: new mongoose.Types.ObjectId(),
        completedTimeSlots: [{
          timeSlotId: new mongoose.Types.ObjectId(),
          date: new Date(),
          actualStartTime: new Date(),
          actualEndTime: new Date(),
          hoursWorked: 8
        }],
        payment: {
          status: 'paid',
          amount: 120,
          calculationDetails: {
            baseRate: 15,
            rateType: 'hourly',
            totalHours: 8
          }
        }
      }],
      paymentSummary: {
        totalAmount: 120,
        finalAmount: 120
      }
    });

    // Login and get tokens
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john.doe@test.com',
        password: 'password123',
        userType: 'user'
      });

    const employerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'employer@test.com',
        password: 'password123',
        userType: 'employer'
      });

    userToken = userLogin.body.data.tokens.accessToken;
    employerToken = employerLogin.body.data.tokens.accessToken;
  });

  afterEach(async () => {
    // Clean up test data
    await Promise.all([
      User.deleteMany({}),
      Employer.deleteMany({}),
      GigRequest.deleteMany({}),
      GigCompletion.deleteMany({}),
      Rating.deleteMany({})
    ]);
  });

  afterAll(async () => {
    // Close database connection
    await mongoose.connection.close();
  });

  describe('POST /api/ratings/gig-completion/:gigCompletionId/worker/:workerCompletionId/user/:ratedUserId', () => {
    it('should create a rating successfully', async () => {
      const workerCompletionId = testGigCompletion.workers[0]._id;
      
      const ratingData = {
        detailedRatings: {
          punctuality: 5,
          quality: 4,
          professionalism: 5,
          communication: 4,
          reliability: 5
        },
        feedback: 'Great worker, very reliable and professional.',
        wouldRecommend: true
      };

      const response = await request(app)
        .post(`/api/ratings/gig-completion/${testGigCompletion._id}/worker/${workerCompletionId}/user/${testUser._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send(ratingData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overallRating).toBeCloseTo(4.6, 1);
      expect(response.body.data.feedback).toBe(ratingData.feedback);
      expect(response.body.data.wouldRecommend).toBe(true);
    });

    it('should not allow duplicate ratings', async () => {
      const workerCompletionId = testGigCompletion.workers[0]._id;
      
      const ratingData = {
        detailedRatings: {
          punctuality: 5,
          quality: 4,
          professionalism: 5,
          communication: 4,
          reliability: 5
        },
        feedback: 'Great worker!',
        wouldRecommend: true
      };

      // Create first rating
      await request(app)
        .post(`/api/ratings/gig-completion/${testGigCompletion._id}/worker/${workerCompletionId}/user/${testUser._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send(ratingData)
        .expect(201);

      // Try to create duplicate rating
      const response = await request(app)
        .post(`/api/ratings/gig-completion/${testGigCompletion._id}/worker/${workerCompletionId}/user/${testUser._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send(ratingData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already rated');
    });

    it('should validate rating values', async () => {
      const workerCompletionId = testGigCompletion.workers[0]._id;
      
      const invalidRatingData = {
        detailedRatings: {
          punctuality: 6, // Invalid: > 5
          quality: 0,     // Invalid: < 1
          professionalism: 5,
          communication: 4,
          reliability: 5
        }
      };

      const response = await request(app)
        .post(`/api/ratings/gig-completion/${testGigCompletion._id}/worker/${workerCompletionId}/user/${testUser._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send(invalidRatingData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should require employer authorization', async () => {
      const workerCompletionId = testGigCompletion.workers[0]._id;
      
      const ratingData = {
        detailedRatings: {
          punctuality: 5,
          quality: 4,
          professionalism: 5,
          communication: 4,
          reliability: 5
        }
      };

      const response = await request(app)
        .post(`/api/ratings/gig-completion/${testGigCompletion._id}/worker/${workerCompletionId}/user/${testUser._id}`)
        .set('Authorization', `Bearer ${userToken}`) // Using user token instead of employer
        .send(ratingData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/ratings/user/:userId', () => {
    beforeEach(async () => {
      // Create test rating
      const workerCompletionId = testGigCompletion.workers[0]._id;
      
      await Rating.create({
        gigCompletion: testGigCompletion._id,
        ratedBy: testEmployer._id,
        ratedUser: testUser._id,
        workerCompletion: workerCompletionId,
        detailedRatings: {
          punctuality: 5,
          quality: 4,
          professionalism: 5,
          communication: 4,
          reliability: 5
        },
        feedback: 'Excellent worker!',
        wouldRecommend: true
      });
    });

    it('should get user ratings successfully', async () => {
      const response = await request(app)
        .get(`/api/ratings/user/${testUser._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ratings).toHaveLength(1);
      expect(response.body.data.averageRatings.totalRatings).toBe(1);
      expect(response.body.data.averageRatings.averageRating).toBeCloseTo(4.6, 1);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/ratings/user/${testUser._id}`)
        .query({ page: 1, limit: 5 })
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/ratings/user/:userId/stats', () => {
    beforeEach(async () => {
      // Create multiple test ratings
      const workerCompletionId = testGigCompletion.workers[0]._id;
      
      await Rating.create([
        {
          gigCompletion: testGigCompletion._id,
          ratedBy: testEmployer._id,
          ratedUser: testUser._id,
          workerCompletion: workerCompletionId,
          detailedRatings: {
            punctuality: 5,
            quality: 4,
            professionalism: 5,
            communication: 4,
            reliability: 5
          },
          wouldRecommend: true
        },
        {
          gigCompletion: testGigCompletion._id,
          ratedBy: testEmployer._id,
          ratedUser: testUser._id,
          workerCompletion: new mongoose.Types.ObjectId(),
          detailedRatings: {
            punctuality: 4,
            quality: 5,
            professionalism: 4,
            communication: 5,
            reliability: 4
          },
          wouldRecommend: true
        }
      ]);
    });

    it('should get comprehensive rating statistics', async () => {
      const response = await request(app)
        .get(`/api/ratings/user/${testUser._id}/stats`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.averageRatings.totalRatings).toBe(2);
      expect(response.body.data.averageRatings.averageRating).toBeGreaterThan(0);
      expect(response.body.data.ratingDistribution).toBeInstanceOf(Array);
      expect(response.body.data.recentRatings).toBeInstanceOf(Array);
    });
  });

  describe('PATCH /api/ratings/:ratingId', () => {
    let testRating;

    beforeEach(async () => {
      const workerCompletionId = testGigCompletion.workers[0]._id;
      
      testRating = await Rating.create({
        gigCompletion: testGigCompletion._id,
        ratedBy: testEmployer._id,
        ratedUser: testUser._id,
        workerCompletion: workerCompletionId,
        detailedRatings: {
          punctuality: 5,
          quality: 4,
          professionalism: 5,
          communication: 4,
          reliability: 5
        },
        feedback: 'Good worker',
        wouldRecommend: true
      });
    });

    it('should update rating successfully', async () => {
      const updateData = {
        detailedRatings: {
          punctuality: 5,
          quality: 5,
          professionalism: 5,
          communication: 5,
          reliability: 5
        },
        feedback: 'Excellent worker - updated review',
        wouldRecommend: true
      };

      const response = await request(app)
        .patch(`/api/ratings/${testRating._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.feedback).toBe(updateData.feedback);
      expect(response.body.data.overallRating).toBe(5);
    });

    it('should not allow other employers to update rating', async () => {
      // Create another employer
      const anotherEmployer = await Employer.create({
        companyName: 'Another Company',
        email: 'another@test.com',
        password: 'password123'
      });

      const anotherEmployerLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another@test.com',
          password: 'password123',
          userType: 'employer'
        });

      const anotherEmployerToken = anotherEmployerLogin.body.data.tokens.accessToken;

      const response = await request(app)
        .patch(`/api/ratings/${testRating._id}`)
        .set('Authorization', `Bearer ${anotherEmployerToken}`)
        .send({ feedback: 'Trying to update' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/ratings/:ratingId', () => {
    let testRating;

    beforeEach(async () => {
      const workerCompletionId = testGigCompletion.workers[0]._id;
      
      testRating = await Rating.create({
        gigCompletion: testGigCompletion._id,
        ratedBy: testEmployer._id,
        ratedUser: testUser._id,
        workerCompletion: workerCompletionId,
        detailedRatings: {
          punctuality: 5,
          quality: 4,
          professionalism: 5,
          communication: 4,
          reliability: 5
        }
      });
    });

    it('should delete (mark as removed) rating successfully', async () => {
      const response = await request(app)
        .delete(`/api/ratings/${testRating._id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('removed');

      // Verify rating is marked as removed
      const updatedRating = await Rating.findById(testRating._id);
      expect(updatedRating.status).toBe('removed');
    });
  });
});
