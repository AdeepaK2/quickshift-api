const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

/**
 * Test script to verify the complete job posting and application flow
 */

// Test tokens - Replace with actual tokens from authentication
let employerToken = '';
let studentToken = '';

// Test data
const testJobData = {
  title: 'Campus Event Staff - University Fair',
  description: 'Looking for enthusiastic students to help with our university career fair. You will assist with registration, guide visitors, and help with booth setup.',
  category: 'Event Staff',
  payRate: {
    amount: 2500,
    rateType: 'hourly'
  },
  location: {
    address: 'University of Colombo, Reid Avenue',
    city: 'Colombo',
    postalCode: '00300',
    coordinates: {
      latitude: 6.9024,
      longitude: 79.8607,
      type: 'Point'
    }
  },
  timeSlots: [{
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000), // 8 AM
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000), // 5 PM
    peopleNeeded: 5,
    peopleAssigned: 0
  }],
  requirements: {
    skills: ['Communication', 'Customer Service', 'Time Management'],
    experience: 'No prior experience required',
    dress: 'Business casual',
    equipment: 'Company will provide'
  },
  totalPositions: 5,
  status: 'active',
  applicationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
};

const testApplicationData = {
  timeSlots: [{
    timeSlotId: null, // Will be filled from job posting
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 17 * 60 * 60 * 1000)
  }],
  coverLetter: 'I am very interested in this position. As a computer science student, I have good communication skills and am available for the specified time slots.'
};

async function testCompleteWorkflow() {
  console.log('🚀 Starting Complete Job Posting Workflow Test\\n');

  try {
    // Step 1: Test server connection
    console.log('📡 Testing server connection...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ Server is running:', healthResponse.data.status);

    // Step 2: Test public job browsing (before posting)
    console.log('\\n📋 Testing public job browsing...');
    const publicJobsResponse = await axios.get(`${API_BASE_URL}/api/gig-requests/public?page=1&limit=5`);
    console.log(`✅ Found ${publicJobsResponse.data.count} public jobs`);

    // NOTE: For actual testing, you would need to:
    // 1. Create or login an employer account to get employerToken
    // 2. Create or login a student account to get studentToken
    
    if (!employerToken) {
      console.log('\\n⚠️  To complete the full test, please:');
      console.log('1. Create/login an employer account');
      console.log('2. Copy the auth token and update employerToken variable');
      console.log('3. Create/login a student account'); 
      console.log('4. Copy the auth token and update studentToken variable');
      console.log('5. Run this script again');
      return;
    }

    // Step 3: Employer posts a job
    console.log('\\n👔 Testing job posting by employer...');
    const jobPostResponse = await axios.post(
      `${API_BASE_URL}/api/gig-requests`,
      testJobData,
      {
        headers: {
          'Authorization': `Bearer ${employerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Job posted successfully:', jobPostResponse.data.data.title);
    const jobId = jobPostResponse.data.data._id;

    // Step 4: Test employer job management
    console.log('\\n📊 Testing employer job management...');
    const employerJobsResponse = await axios.get(
      `${API_BASE_URL}/api/employers/jobs`,
      {
        headers: {
          'Authorization': `Bearer ${employerToken}`
        }
      }
    );
    console.log(`✅ Employer has ${employerJobsResponse.data.count} jobs`);

    // Step 5: Student views available jobs
    console.log('\\n🎓 Testing student job browsing...');
    const updatedPublicJobsResponse = await axios.get(`${API_BASE_URL}/api/gig-requests/public`);
    const targetJob = updatedPublicJobsResponse.data.data.find(job => job._id === jobId);
    console.log(`✅ Student can see the new job: ${targetJob ? 'Yes' : 'No'}`);

    // Step 6: Student applies for the job
    console.log('\\n📝 Testing student application...');
    testApplicationData.gigRequestId = jobId;
    testApplicationData.timeSlots[0].timeSlotId = targetJob.timeSlots[0]._id;

    const applicationResponse = await axios.post(
      `${API_BASE_URL}/api/gig-applications`,
      testApplicationData,
      {
        headers: {
          'Authorization': `Bearer ${studentToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Application submitted successfully');
    const applicationId = applicationResponse.data.data._id;

    // Step 7: Employer views applications
    console.log('\\n👀 Testing employer application review...');
    const employerApplicationsResponse = await axios.get(
      `${API_BASE_URL}/api/employers/applications`,
      {
        headers: {
          'Authorization': `Bearer ${employerToken}`
        }
      }
    );
    console.log(`✅ Employer has ${employerApplicationsResponse.data.count} applications`);

    // Step 8: Employer accepts the application
    console.log('\\n✅ Testing application acceptance...');
    const acceptResponse = await axios.patch(
      `${API_BASE_URL}/api/employers/applications/${applicationId}/accept`,
      { employerFeedback: 'Great application! Looking forward to working with you.' },
      {
        headers: {
          'Authorization': `Bearer ${employerToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('✅ Application accepted successfully');

    // Step 9: Student checks application status
    console.log('\\n📋 Testing student application status check...');
    const studentApplicationsResponse = await axios.get(
      `${API_BASE_URL}/api/gig-applications/my-applications`,
      {
        headers: {
          'Authorization': `Bearer ${studentToken}`
        }
      }
    );
    const acceptedApplication = studentApplicationsResponse.data.data.find(app => app._id === applicationId);
    console.log(`✅ Application status: ${acceptedApplication?.status}`);

    // Step 10: Cleanup - Delete test job
    console.log('\\n🧹 Cleaning up test data...');
    await axios.delete(
      `${API_BASE_URL}/api/employers/jobs/${jobId}`,
      {
        headers: {
          'Authorization': `Bearer ${employerToken}`
        }
      }
    );
    console.log('✅ Test job deleted successfully');

    console.log('\\n🎉 Complete workflow test passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\\n🔐 Authentication required. Please:');
      console.log('1. Login as employer and get token');
      console.log('2. Login as student and get token'); 
      console.log('3. Update the tokens in this script');
    }
  }
}

// Helper function to test individual endpoints
async function testEndpoint(method, url, data = null, token = null, description = '') {
  try {
    console.log(`🔍 ${description}: ${method} ${url}`);
    
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      timeout: 10000
    };

    if (token) {
      config.headers = { 'Authorization': `Bearer ${token}` };
    }

    if (data) {
      config.data = data;
      if (!config.headers) config.headers = {};
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    console.log(`✅ ${description} successful:`, response.status);
    return response.data;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.response?.status, error.response?.data?.message || error.message);
    throw error;
  }
}

// Export functions for use in other test files
module.exports = {
  testCompleteWorkflow,
  testEndpoint,
  testJobData,
  testApplicationData
};

// Run the test if this file is executed directly
if (require.main === module) {
  testCompleteWorkflow();
}
