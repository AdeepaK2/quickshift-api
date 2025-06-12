const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/user');
const Admin = require('../src/models/admin');

describe('Admin API', () => {
  let mongoServer;
  let superAdminToken;
  let adminToken;
  let regularUserToken;
  let superAdminUser;
  let adminUser;
  let regularUser;
  beforeAll(async () => {
    // Start in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test users (password will be hashed by pre-save middleware)
    // Create super admin
    superAdminUser = await Admin.create({
      email: 'superadmin@test.com',
      password: 'testpassword',
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      isActive: true
    });

    // Create regular admin
    adminUser = await Admin.create({
      email: 'admin@test.com',
      password: 'testpassword',
      firstName: 'Regular',
      lastName: 'Admin',
      role: 'admin',
      isActive: true
    });

    // Create regular user
    regularUser = await User.create({
      email: 'user@test.com',
      password: 'testpassword',
      firstName: 'Regular',
      lastName: 'User',
      role: 'job_seeker',
      isActive: true
    });// Get tokens for authentication
    const superAdminLoginRes = await request(app)
      .post('/api/auth/admin/login')
      .send({
        email: 'superadmin@test.com',
        password: 'testpassword'
      });
    superAdminToken = superAdminLoginRes.body.data.tokens.accessToken;

    const adminLoginRes = await request(app)
      .post('/api/auth/admin/login')
      .send({
        email: 'admin@test.com',
        password: 'testpassword'
      });
    adminToken = adminLoginRes.body.data.tokens.accessToken;

    const userLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'user@test.com',
        password: 'testpassword'
      });
    regularUserToken = userLoginRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('GET /api/admin/dashboard', () => {
    it('should get dashboard stats for super admin', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('overview');
      expect(res.body.data).toHaveProperty('recentActivity');
      expect(res.body.data.overview).toHaveProperty('totalUsers');
      expect(res.body.data.overview).toHaveProperty('totalAdmins');
    });

    it('should get dashboard stats for regular admin', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny access for regular users', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${regularUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should deny access without token', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/admin', () => {
    it('should create admin user as super admin', async () => {
      const newAdmin = {
        email: 'newadmin@test.com',
        password: 'newadminpassword',
        firstName: 'New',
        lastName: 'Admin',
        role: 'admin'
      };

      const res = await request(app)
        .post('/api/admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(newAdmin);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(newAdmin.email);
      expect(res.body.data.role).toBe('admin');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should create super admin as super admin', async () => {
      const newSuperAdmin = {
        email: 'newsuperadmin@test.com',
        password: 'newsuperadminpassword',
        firstName: 'New',
        lastName: 'SuperAdmin',
        role: 'super_admin'
      };

      const res = await request(app)
        .post('/api/admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(newSuperAdmin);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('super_admin');
    });

    it('should deny admin creation for regular admin', async () => {
      const newAdmin = {
        email: 'anothernewadmin@test.com',
        password: 'newadminpassword',
        firstName: 'Another',
        lastName: 'Admin'
      };

      const res = await request(app)
        .post('/api/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newAdmin);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should deny super admin creation for regular admin', async () => {
      const newSuperAdmin = {
        email: 'anothersuperadmin@test.com',
        password: 'newsuperadminpassword',
        firstName: 'Another',
        lastName: 'SuperAdmin',
        role: 'super_admin'
      };

      const res = await request(app)
        .post('/api/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newSuperAdmin);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should return error for duplicate email', async () => {
      const duplicateAdmin = {
        email: 'admin@test.com', // Already exists
        password: 'password',
        firstName: 'Duplicate',
        lastName: 'Admin'
      };

      const res = await request(app)
        .post('/api/admin')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(duplicateAdmin);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('GET /api/admin', () => {
    it('should get all admin users', async () => {
      const res = await request(app)
        .get('/api/admin')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).not.toHaveProperty('password');
    });

    it('should filter admin users by role', async () => {
      const res = await request(app)
        .get('/api/admin?role=super_admin')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach(admin => {
        expect(admin.role).toBe('super_admin');
      });
    });

    it('should allow regular admin to view admin users', async () => {
      const res = await request(app)
        .get('/api/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/:id', () => {
    it('should get admin user by ID', async () => {
      const res = await request(app)
        .get(`/api/admin/${adminUser._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(adminUser._id.toString());
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return 404 for non-admin user ID', async () => {
      const res = await request(app)
        .get(`/api/admin/${regularUser._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/admin/:id', () => {
    it('should update admin user', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const res = await request(app)
        .patch(`/api/admin/${adminUser._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Updated');
      expect(res.body.data.lastName).toBe('Name');
    });

    it('should allow role change by super admin', async () => {
      const updateData = {
        role: 'super_admin'
      };

      const res = await request(app)
        .patch(`/api/admin/${adminUser._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('super_admin');
    });

    it('should deny role change by regular admin', async () => {
      const updateData = {
        role: 'super_admin'
      };

      const res = await request(app)
        .patch(`/api/admin/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/:id', () => {
    it('should delete admin user as super admin', async () => {
      // First create an admin to delete
      const adminToDelete = await User.create({
        email: 'delete@test.com',
        password: 'password',
        firstName: 'Delete',
        lastName: 'Me',
        role: 'admin',
        isActive: true
      });

      const res = await request(app)
        .delete(`/api/admin/${adminToDelete._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should deny deletion by regular admin', async () => {
      const res = await request(app)
        .delete(`/api/admin/${adminUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prevent deletion of last super admin', async () => {
      // This test assumes there's only one super admin left
      const res = await request(app)
        .delete(`/api/admin/${superAdminUser._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('last super administrator');
    });
  });

  describe('GET /api/admin/users', () => {
    it('should get all users for admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should search users by name', async () => {
      const res = await request(app)
        .get('/api/admin/users?search=Regular')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/employers', () => {
    it('should get all employers for admin', async () => {
      const res = await request(app)
        .get('/api/admin/employers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
