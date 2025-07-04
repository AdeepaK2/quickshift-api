const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testStudentStats() {
  try {
    console.log('🧪 Testing Student Stats API\n');

    // Step 1: First, login as a student user (or create one if needed)
    console.log('1. Attempting to login as student...');
    
    // Try to login with existing test student
    let loginResponse;
    try {
      loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'student@university.edu',
        password: 'password123'
      });
      console.log('✅ Logged in as existing test student');
    } catch (error) {
      console.log('⚠️ No test student found, creating one...');
      
      // Create a test student if login fails
      await axios.post(`${API_BASE_URL}/auth/register`, {
        email: 'teststudent@quickshift.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'Student',
        role: 'job_seeker'
      });
      
      loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        email: 'teststudent@quickshift.com',
        password: 'TestPassword123!'
      });
      console.log('✅ Created and logged in as new test student');
    }

    const token = loginResponse.data.data.tokens.accessToken;
    const student = loginResponse.data.data.user;
    console.log(`   Student ID: ${student._id}`);
    console.log(`   Student Name: ${student.firstName} ${student.lastName}`);

    // Step 2: Test the stats API endpoint
    console.log('\n2. Testing /api/users/stats endpoint...');
    
    const statsResponse = await axios.get(`${API_BASE_URL}/users/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Stats API responded successfully');
    console.log('📊 Student Stats:', JSON.stringify(statsResponse.data.data, null, 2));

    // Step 3: Analyze the stats
    const stats = statsResponse.data.data;
    console.log('\n3. Analyzing stats data:');
    console.log(`   Applied Jobs: ${stats.appliedJobs}`);
    console.log(`   Active Gigs: ${stats.activeGigs}`);
    console.log(`   Completed Gigs: ${stats.completedGigs}`);
    console.log(`   Total Earnings: LKR ${stats.totalEarnings}`);
    console.log(`   Monthly Earnings: LKR ${stats.monthlyEarnings}`);
    console.log(`   Rating: ${stats.rating}`);
    console.log(`   Pending Payments: ${stats.pendingPayments}`);

    // Step 4: Check if any stats are missing or zero
    console.log('\n4. Checking for issues:');
    if (stats.appliedJobs === 0 && stats.activeGigs === 0 && stats.completedGigs === 0) {
      console.log('⚠️ All job/gig stats are zero - this might be why badges aren\'t showing');
      console.log('   This could be due to:');
      console.log('   - No test data for this student');
      console.log('   - Database relationship issues');
      console.log('   - API logic problems');
    } else {
      console.log('✅ Stats contain data that should be visible in the dashboard');
    }

    return stats;

  } catch (error) {
    console.error('❌ Error testing student stats:', error.response?.data || error.message);
    console.error('Full error:', error);
    return null;
  }
}

// Run the test
testStudentStats().then(stats => {
  if (stats) {
    console.log('\n🎉 Student stats test completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check if frontend is correctly receiving these stats');
    console.log('   2. Verify that the DashboardLayout is passing stats to UserSidebar');
    console.log('   3. Ensure UserSidebar is displaying the badges correctly');
  }
}).catch(console.error);
