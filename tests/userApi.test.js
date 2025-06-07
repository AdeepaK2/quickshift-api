const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const userRoutes = require('../src/routes/userRoutes');
const User = require('../src/models/user');

// Load test environment configuration
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.test') });

// Create express app for testing
const app = express();
app.use(express.json());
app.use(cors());
app.use('/api/users', userRoutes);

// Test user data
const testUser = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'Password123!',
  role: 'job_seeker',
  phone: '1234567890',
  gender: 'male',
  university: 'Test University',
  faculty: 'Computer Science',
  yearOfStudy: 3
};

let userId; // Will store the created user ID for further tests

// Connect to test database before tests
beforeAll(async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log('Connected to the test database');
    
    // Not cleaning up existing users to keep previous test data
  } catch (error) {
    console.error('Error connecting to the test database:', error);
  }
});

// Clean up and disconnect after tests but keep the users in the database
afterAll(async () => {
  // Not deleting users to keep them in the database
  await mongoose.connection.close();
  console.log('Database connection closed, test users remain in database');
});

// USER API TESTS
describe('User API', () => {
  // Test creating a new user
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(201);

      // Check response
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data.email).toBe(testUser.email);

      // Save userId for further tests
      userId = response.body.data._id;
    });

    it('should not create a user with duplicate email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should not create a user without required fields', async () => {
      const incompleteUser = { email: 'incomplete@example.com' };
      
      const response = await request(app)
        .post('/api/users')
        .send(incompleteUser)
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // Test getting all users
  describe('GET /api/users', () => {
    it('should get all users with pagination', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ page: 1, limit: 10 })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('pages');
      expect(response.body).toHaveProperty('total');
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/users')
        .query({ role: 'job_seeker' })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // All returned users should be job seekers
      response.body.data.forEach(user => {
        expect(user.role).toBe('job_seeker');
      });
    });
  });

  // Test getting a user by ID
  describe('GET /api/users/:id', () => {
    it('should get a user by ID', async () => {
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(userId);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data).not.toHaveProperty('password'); // Password should be excluded
    });

    it('should return 404 for non-existent user ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return error for invalid user ID format', async () => {
      const response = await request(app)
        .get('/api/users/invalidid')
        .expect('Content-Type', /json/)
        .expect(500); // Mongoose will throw a CastError

      expect(response.body.success).toBe(false);
    });
  });

  // Test updating a user
  describe('PATCH /api/users/:id', () => {
    it('should update a user', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        university: 'Updated University'
      };

      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .send(updateData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
      expect(response.body.data.university).toBe(updateData.university);
    });

    it('should not update with existing email', async () => {
      // Create another user first
      const anotherUser = {
        firstName: 'Another',
        lastName: 'User',
        email: 'another@example.com',
        password: 'Password123!',
        role: 'job_seeker'
      };
      
      await request(app)
        .post('/api/users')
        .send(anotherUser);
      
      // Now try to update our test user with this email
      const response = await request(app)
        .patch(`/api/users/${userId}`)
        .send({ email: 'another@example.com' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already in use');
    });

    it('should return 404 for updating non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .patch(`/api/users/${fakeId}`)
        .send({ firstName: 'NewName' })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });

  // Test deleting a user
  describe('DELETE /api/users/:id', () => {
    it('should delete a user', async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
      
      // Verify user no longer exists
      const checkUser = await request(app)
        .get(`/api/users/${userId}`)
        .expect(404);
        
      expect(checkUser.body.success).toBe(false);
    });

    it('should return 404 for deleting non-existent user', async () => {
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });
  });
});