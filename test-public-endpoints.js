const axios = require('axios');

// Configuration
const BASE_URL = 'https://quickshift-9qjun.ondigitalocean.app';
// For local testing, uncomment the line below:
// const BASE_URL = 'http://localhost:3000';

// Test configuration
const TIMEOUT = 10000; // 10 seconds

console.log('🚀 QuickShift API - Public Endpoints Test Suite');
console.log(`🌐 Testing against: ${BASE_URL}`);
console.log('=' * 50);

// Helper function to make requests
const makeRequest = async (method, url, data = null, description = '') => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    
    console.log(`✅ ${method.toUpperCase()} ${url} - ${description}`);
    console.log(`   Status: ${response.status}`);
    
    if (response.data && typeof response.data === 'object') {
      if (response.data.data) {
        const dataKeys = Object.keys(response.data.data);
        console.log(`   Data Keys: ${dataKeys.join(', ')}`);
        
        // Show array length for arrays
        dataKeys.forEach(key => {
          if (Array.isArray(response.data.data[key])) {
            console.log(`   ${key}: ${response.data.data[key].length} items`);
          }
        });
      }
      if (response.data.message) {
        console.log(`   Message: ${response.data.message}`);
      }
    }
    
    console.log('');
    return response;
  } catch (error) {
    console.log(`❌ ${method.toUpperCase()} ${url} - ${description}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.message || error.response.statusText}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    console.log('');
    return null;
  }
};

// Test functions
const testBasicEndpoints = async () => {
  console.log('📝 Testing Basic Endpoints');
  console.log('-'.repeat(30));
  
  await makeRequest('GET', '/', null, 'Welcome message');
  await makeRequest('GET', '/api/health', null, 'Health check');
  await makeRequest('GET', '/api/public/endpoints', null, 'API documentation');
};

const testPublicAPIEndpoints = async () => {
  console.log('📊 Testing Public API Endpoints');
  console.log('-'.repeat(30));
  
  await makeRequest('GET', '/api/public/stats', null, 'Get API statistics');
  await makeRequest('GET', '/api/public/recent-gigs?limit=5', null, 'Get recent gig requests');
  await makeRequest('GET', '/api/public/search-gigs?location=remote&limit=3', null, 'Search gigs by location');
  await makeRequest('GET', '/api/public/profiles/users?limit=3', null, 'Get user profiles');
  await makeRequest('GET', '/api/public/profiles/employers?limit=3', null, 'Get employer profiles');
};

const testUserEndpoints = async () => {
  console.log('👤 Testing User Endpoints (Public)');
  console.log('-'.repeat(30));
  
  await makeRequest('GET', '/api/users', null, 'Get all users');
  await makeRequest('GET', '/api/users/507f1f77bcf86cd799439011', null, 'Get user by ID (test ID)');
};

const testEmployerEndpoints = async () => {
  console.log('🏢 Testing Employer Endpoints (Public)');
  console.log('-'.repeat(30));
  
  await makeRequest('GET', '/api/employers', null, 'Get all employers');
  await makeRequest('GET', '/api/employers/507f1f77bcf86cd799439011', null, 'Get employer by ID (test ID)');
};

const testGigRequestEndpoints = async () => {
  console.log('💼 Testing Gig Request Endpoints (Public)');
  console.log('-'.repeat(30));
  
  await makeRequest('GET', '/api/gig-requests', null, 'Get all gig requests');
  await makeRequest('GET', '/api/gig-requests/507f1f77bcf86cd799439011', null, 'Get gig request by ID (test ID)');
  await makeRequest('GET', '/api/gig-requests/user/507f1f77bcf86cd799439011', null, 'Get gig requests by user ID');
  await makeRequest('GET', '/api/gig-requests/employer/507f1f77bcf86cd799439011', null, 'Get gig requests by employer ID');
  await makeRequest('GET', '/api/gig-requests/instant-apply-eligible', null, 'Get instant apply eligible jobs');
};

const testGigApplicationEndpoints = async () => {
  console.log('📝 Testing Gig Application Endpoints (Public)');
  console.log('-'.repeat(30));
  
  await makeRequest('GET', '/api/gig-applications/gig/507f1f77bcf86cd799439011', null, 'Get applications by gig ID');
  await makeRequest('GET', '/api/gig-applications/user/507f1f77bcf86cd799439011', null, 'Get applications by user ID');
  await makeRequest('GET', '/api/gig-applications/507f1f77bcf86cd799439011', null, 'Get application by ID (test ID)');
};

const testGigCompletionEndpoints = async () => {
  console.log('✅ Testing Gig Completion Endpoints (Public)');
  console.log('-'.repeat(30));
  
  await makeRequest('GET', '/api/gig-completions/worker-account-status/507f1f77bcf86cd799439011', null, 'Get worker account status');
};

const testAuthEndpoints = async () => {
  console.log('🔐 Testing Authentication Endpoints (Public)');
  console.log('-'.repeat(30));
  
  // Test data for registration (these won't actually register due to validation)
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'TestPassword123'
  };
  
  const testEmployer = {
    companyName: 'Test Company',
    email: 'test@company.com',
    password: 'TestPassword123',
    firstName: 'Test',
    lastName: 'Employer'
  };
  
  const loginData = {
    email: 'test@example.com',
    password: 'TestPassword123',
    userType: 'user'
  };
  
  await makeRequest('POST', '/api/auth/register/user', testUser, 'Register user (test data)');
  await makeRequest('POST', '/api/auth/register/employer', testEmployer, 'Register employer (test data)');
  await makeRequest('POST', '/api/auth/login', loginData, 'Login (test credentials)');
  await makeRequest('GET', '/api/auth/verify-email/test-token', null, 'Verify email (test token)');
  await makeRequest('POST', '/api/auth/forgot-password', { email: 'test@example.com', userType: 'user' }, 'Forgot password');
};

const testCreateEndpoints = async () => {
  console.log('🆕 Testing Create Endpoints (Public - Test Data)');
  console.log('-'.repeat(30));
  
  // Test user data
  const newUser = {
    firstName: 'Test',
    lastName: 'APIUser',
    email: `test+${Date.now()}@example.com`,
    password: 'TestPassword123',
    phone: '+1234567890',
    skills: ['JavaScript', 'Node.js'],
    location: 'Remote'
  };
  
  // Test employer data
  const newEmployer = {
    companyName: 'Test API Company',
    email: `testcompany+${Date.now()}@example.com`,
    password: 'TestPassword123',
    firstName: 'Test',
    lastName: 'Employer',
    phone: '+1234567890',
    industry: 'Technology',
    location: 'Remote'
  };
  
  // Test gig request data
  const newGigRequest = {
    title: 'Test API Job',
    description: 'This is a test job created via API testing',
    location: 'Remote',
    jobType: 'contract',
    payRange: 50,
    duration: '1-3 months',
    skillsRequired: ['Testing', 'API'],
    employer: '507f1f77bcf86cd799439011' // Test employer ID
  };
  
  await makeRequest('POST', '/api/users', newUser, 'Create new user');
  await makeRequest('POST', '/api/employers', newEmployer, 'Create new employer');
  await makeRequest('POST', '/api/gig-requests', newGigRequest, 'Create new gig request');
};

// Main test runner
const runTests = async () => {
  const startTime = Date.now();
  
  try {
    await testBasicEndpoints();
    await testPublicAPIEndpoints();
    await testUserEndpoints();
    await testEmployerEndpoints();
    await testGigRequestEndpoints();
    await testGigApplicationEndpoints();
    await testGigCompletionEndpoints();
    await testAuthEndpoints();
    await testCreateEndpoints();
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('🎉 Test Suite Completed!');
    console.log(`⏱️  Total Duration: ${duration.toFixed(2)} seconds`);
    console.log('\n📋 Summary:');
    console.log('- All public endpoints have been tested');
    console.log('- ✅ indicates successful requests');
    console.log('- ❌ indicates failed requests (expected for some test data)');
    console.log('\n🔗 Next Steps:');
    console.log('1. Use successful endpoints for your application');
    console.log('2. Implement authentication for protected endpoints');
    console.log('3. Review any failed endpoints for debugging');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
};

// Check if axios is available
const checkDependencies = () => {
  try {
    require('axios');
    return true;
  } catch (error) {
    console.error('❌ axios is required for this test. Install it with: npm install axios');
    return false;
  }
};

// Run the tests
if (checkDependencies()) {
  runTests();
}
