/**
 * Test script to verify authentication and application flow
 */

const API_BASE_URL = 'http://localhost:5000';

// Mock frontend authentication helpers
const mockAuth = {
  // Simulate getting token from localStorage
  getAccessToken() {
    // This would normally come from localStorage in the browser
    return null; // We'll need a real token for testing
  },
  
  // Test login to get a valid token
  async testLogin() {
    console.log('🔐 Testing user login...');
    
    // Try to login with test credentials
    const loginData = {
      email: 'student@university.edu',
      password: 'password123'
    };
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
      });
      
      const result = await response.json();
      
      console.log('Login response:', result);
      
      if (result.success && result.data && result.data.tokens && result.data.tokens.accessToken) {
        console.log(`✅ Login successful for user role: ${result.data.user.role || 'undefined'}`);
        console.log(`   User type: ${result.data.userType || 'undefined'}`);
        return {
          token: result.data.tokens.accessToken,
          user: result.data.user,
          userType: result.data.userType
        };
      } else if (result.success && result.data && result.data.accessToken) {
        console.log(`✅ Login successful for user type: ${result.data.user.role || 'undefined'}`);
        return {
          token: result.data.accessToken,
          user: result.data.user
        };
      } else if (result.success) {
        // Sometimes the response structure might be different
        console.log('✅ Login successful but unexpected structure');
        console.log('Response data:', result);
        // Try to extract token from different possible locations
        const token = result.accessToken || result.token || (result.data && result.data.token);
        if (token) {
          return {
            token: token,
            user: result.user || result.data
          };
        }
      } else {
        console.log(`❌ Login failed: ${result.message}`);
        return null;
      }
    } catch (error) {
      console.log(`❌ Login error: ${error.message}`);
      return null;
    }
  }
};

// Test function to verify complete application flow
async function testCompleteApplicationFlow() {
  console.log('🧪 Testing Complete Job Application Flow\n');

  try {
    // Test 1: Get authentication token
    const auth = await mockAuth.testLogin();
    if (!auth) {
      console.log('❌ Cannot proceed without authentication');
      console.log('\n💡 Create a test user first:');
      console.log('POST /api/auth/register');
      console.log('Body: {');
      console.log('  "firstName": "Test",');
      console.log('  "lastName": "Student",');
      console.log('  "email": "test@university.edu",');
      console.log('  "password": "password123",');
      console.log('  "confirmPassword": "password123",');
      console.log('  "university": "Test University",');
      console.log('  "studentId": "TEST001"');
      console.log('}');
      return;
    }

    // Test 2: Get a sample job
    console.log('\n2. Getting sample job...');
    const jobsResponse = await fetch(`${API_BASE_URL}/api/gig-requests/public?limit=1`);
    const jobsData = await jobsResponse.json();
    
    if (!jobsData.success || !jobsData.data || jobsData.data.length === 0) {
      console.log('❌ No jobs found');
      return;
    }

    const testJob = jobsData.data[0];
    console.log(`✅ Found job: "${testJob.title}" (${testJob._id})`);

    // Test 3: Apply for the job (simulating frontend)
    console.log('\n3. Applying for job...');
    
    const applicationData = {
      coverLetter: 'I am very interested in this position and would love to contribute to your team.'
    };

    const applyResponse = await fetch(`${API_BASE_URL}/api/gig-requests/${testJob._id}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify(applicationData)
    });

    const applyResult = await applyResponse.json();
    
    if (applyResult.success) {
      console.log('✅ Application submitted successfully!');
      console.log(`   - Application ID: ${applyResult.data.application._id}`);
      console.log(`   - Status: ${applyResult.data.application.status}`);
    } else {
      console.log(`❌ Application failed: ${applyResult.message}`);
      console.log('Full error response:', applyResult);
      
      // Test 4: Investigate common failure reasons
      console.log('\n4. Investigating failure reasons...');
      
      if (applyResult.message?.includes('already applied')) {
        console.log('🔍 User has already applied for this job');
      } else if (applyResult.message?.includes('not authorized')) {
        console.log('🔍 Authorization issue - checking user type');
        console.log(`   - User type: ${auth.user.userType || 'undefined'}`);
        console.log(`   - Required: 'user' or 'job_seeker'`);
      } else if (applyResult.message?.includes('not accepting')) {
        console.log('🔍 Job is no longer accepting applications');
      } else {
        console.log('🔍 Unknown error - may be validation or server issue');
      }
    }

    // Test 5: Try different endpoints to verify auth is working
    console.log('\n5. Testing other authenticated endpoints...');
    
    // Test profile endpoint
    const profileResponse = await fetch(`${API_BASE_URL}/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${auth.token}`
      }
    });
    
    if (profileResponse.ok) {
      console.log('✅ Profile endpoint accessible - auth token is valid');
    } else {
      console.log('❌ Profile endpoint failed - auth issue');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCompleteApplicationFlow, mockAuth };
}

// Run if executed directly
if (typeof window === 'undefined' && require.main === module) {
  testCompleteApplicationFlow();
}
