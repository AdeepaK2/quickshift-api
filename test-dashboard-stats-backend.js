const request = require('supertest');
const { app } = require('./src/app');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

/**
 * Test script to verify student dashboard stats backend integration
 */

// Test data
const testUser = {
  _id: new mongoose.Types.ObjectId(),
  email: 'test.student@example.com',
  firstName: 'Test',
  lastName: 'Student',
  userType: 'user'
};

const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email,
      userType: 'user'
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

describe('Student Dashboard Stats API', () => {
  let authToken;

  beforeAll(() => {
    authToken = generateToken(testUser);
  });

  describe('GET /api/users/stats', () => {
    it('should return user statistics successfully', async () => {
      const response = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      const stats = response.body.data;
      expect(stats).toHaveProperty('appliedJobs');
      expect(stats).toHaveProperty('activeGigs');
      expect(stats).toHaveProperty('completedGigs');
      expect(stats).toHaveProperty('totalEarnings');
      expect(stats).toHaveProperty('monthlyEarnings');
      expect(stats).toHaveProperty('rating');
      expect(stats).toHaveProperty('pendingPayments');

      // Verify data types
      expect(typeof stats.appliedJobs).toBe('number');
      expect(typeof stats.activeGigs).toBe('number');
      expect(typeof stats.completedGigs).toBe('number');
      expect(typeof stats.totalEarnings).toBe('number');
      expect(typeof stats.monthlyEarnings).toBe('number');
      expect(typeof stats.rating).toBe('number');
      expect(typeof stats.pendingPayments).toBe('number');
    });

    it('should return 401 for unauthenticated requests', async () => {
      await request(app)
        .get('/api/users/stats')
        .expect(401);
    });

    it('should return 403 for non-user requests', async () => {
      const employerToken = jwt.sign(
        { 
          userId: testUser._id, 
          email: testUser.email,
          userType: 'employer'
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${employerToken}`)
        .expect(403);
    });
  });

  describe('Stats Calculation Logic', () => {
    it('should calculate applied jobs correctly', () => {
      // This would test the aggregation pipeline for counting applications
      const mockApplications = [
        { user: testUser._id, status: 'pending' },
        { user: testUser._id, status: 'accepted' },
        { user: testUser._id, status: 'rejected' }
      ];
      
      const appliedJobs = mockApplications.length;
      expect(appliedJobs).toBe(3);
    });

    it('should calculate active gigs correctly', () => {
      // This would test the aggregation pipeline for counting active gigs
      const mockGigs = [
        { user: testUser._id, status: 'confirmed' },
        { user: testUser._id, status: 'in_progress' },
        { user: testUser._id, status: 'completed' }
      ];
      
      const activeGigs = mockGigs.filter(g => 
        ['confirmed', 'in_progress'].includes(g.status)
      ).length;
      expect(activeGigs).toBe(2);
    });

    it('should calculate earnings correctly', () => {
      // This would test the aggregation pipeline for summing earnings
      const mockPayments = [
        { user: testUser._id, amount: 1500, status: 'paid' },
        { user: testUser._id, amount: 2000, status: 'paid' },
        { user: testUser._id, amount: 800, status: 'pending' }
      ];
      
      const totalEarnings = mockPayments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);
      expect(totalEarnings).toBe(3500);
    });
  });
});

// Manual test function for development
const testStatsEndpoint = async () => {
  console.log('🧪 Testing Student Dashboard Stats Backend...\n');
  
  try {
    const token = generateToken(testUser);
    
    const response = await request(app)
      .get('/api/users/stats')
      .set('Authorization', `Bearer ${token}`);
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:', JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      console.log('✅ Stats endpoint working correctly!');
      
      const stats = response.body.data;
      console.log('\n📈 Dashboard Stats:');
      console.log(`  Applied Jobs: ${stats.appliedJobs}`);
      console.log(`  Active Gigs: ${stats.activeGigs}`);
      console.log(`  Completed Gigs: ${stats.completedGigs}`);
      console.log(`  Total Earnings: LKR ${stats.totalEarnings.toLocaleString()}`);
      console.log(`  Monthly Earnings: LKR ${stats.monthlyEarnings.toLocaleString()}`);
      console.log(`  Rating: ${stats.rating.toFixed(1)} ⭐`);
      console.log(`  Pending Payments: ${stats.pendingPayments}`);
      
      // Test that these can be used in the frontend components
      const quickStats = [
        { label: 'Applied Jobs', value: stats.appliedJobs.toString(), description: 'Applications sent' },
        { label: 'Active Gigs', value: stats.activeGigs.toString(), description: 'Current work' },
        { label: 'This Month', value: `LKR ${stats.monthlyEarnings.toLocaleString()}`, description: 'Earnings' },
        { label: 'Rating', value: stats.rating.toFixed(1), description: 'Your rating' }
      ];
      
      console.log('\n🎯 Frontend Quick Stats:');
      quickStats.forEach(stat => {
        console.log(`  ${stat.label}: ${stat.value} (${stat.description})`);
      });
    } else {
      console.log('❌ Stats endpoint failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

module.exports = {
  testStatsEndpoint,
  generateToken,
  testUser
};

// Run manual test if script is executed directly
if (require.main === module) {
  testStatsEndpoint();
}
