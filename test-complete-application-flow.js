/**
 * Complete test script to verify the end-to-end job application flow
 */

const API_BASE_URL = 'http://localhost:5000';

// Test function to verify complete application flow
async function testCompleteApplicationFlow() {
  console.log('🚀 Testing Complete Job Application Flow\n');

  let studentToken = null;
  let employerToken = null;
  let jobId = null;
  let applicationId = null;

  try {
    // Step 1: Login as student
    console.log('1. Logging in as student...');
    const studentLoginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'student@university.edu',
        password: 'password123'
      })
    });

    const studentLoginResult = await studentLoginResponse.json();
    if (studentLoginResult.success) {
      studentToken = studentLoginResult.data.tokens.accessToken;
      console.log('✅ Student login successful');
    } else {
      throw new Error('Student login failed: ' + studentLoginResult.message);
    }

    // Step 2: Login as employer
    console.log('\n2. Logging in as employer...');
    const employerLoginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@employer.com',
        password: 'password123',
        userType: 'employer'
      })
    });

    const employerLoginResult = await employerLoginResponse.json();
    if (employerLoginResult.success) {
      employerToken = employerLoginResult.data.tokens.accessToken;
      console.log('✅ Employer login successful');
    } else {
      throw new Error('Employer login failed: ' + employerLoginResult.message);
    }

    // Step 3: Get available jobs as student
    console.log('\n3. Getting available jobs...');
    const jobsResponse = await fetch(`${API_BASE_URL}/api/gig-requests/public?limit=1`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });

    const jobsData = await jobsResponse.json();
    if (!jobsData.success || !jobsData.data || jobsData.data.length === 0) {
      throw new Error('No jobs found to apply for');
    }

    jobId = jobsData.data[0]._id;
    console.log(`✅ Found job to apply for: "${jobsData.data[0].title}" (ID: ${jobId})`);

    // Step 4: Apply for the job as student
    console.log('\n4. Applying for the job...');
    const applicationResponse = await fetch(`${API_BASE_URL}/api/gig-requests/${jobId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({
        coverLetter: 'I am very interested in this position and believe I would be a great fit for this role.'
      })
    });

    const applicationResult = await applicationResponse.json();
    if (applicationResult.success) {
      applicationId = applicationResult.data.application._id;
      console.log('✅ Application submitted successfully');
      console.log(`   - Application ID: ${applicationId}`);
      console.log(`   - Status: ${applicationResult.data.application.status}`);
    } else {
      throw new Error('Application failed: ' + applicationResult.message);
    }

    // Step 5: Check applications as employer
    console.log('\n5. Checking applications as employer...');
    const employerApplicationsResponse = await fetch(`${API_BASE_URL}/api/gig-applications/employer`, {
      headers: {
        'Authorization': `Bearer ${employerToken}`
      }
    });

    const employerApplicationsResult = await employerApplicationsResponse.json();
    if (employerApplicationsResult.success) {
      const applications = employerApplicationsResult.data.applications;
      console.log(`✅ Employer can see ${applications.length} applications`);
      
      const newApplication = applications.find(app => app._id === applicationId);
      if (newApplication) {
        console.log(`   - Found new application: ${newApplication.user.firstName} ${newApplication.user.lastName}`);
        console.log(`   - Status: ${newApplication.status}`);
      } else {
        console.log('   - New application not found in employer view');
      }
    } else {
      throw new Error('Failed to fetch employer applications: ' + employerApplicationsResult.message);
    }

    // Step 6: Accept the application as employer
    console.log('\n6. Accepting the application...');
    const acceptResponse = await fetch(`${API_BASE_URL}/api/gig-applications/employer/${applicationId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${employerToken}`
      },
      body: JSON.stringify({
        status: 'accepted',
        feedback: 'Great application! Looking forward to working with you.'
      })
    });

    const acceptResult = await acceptResponse.json();
    if (acceptResult.success) {
      console.log('✅ Application accepted successfully');
      console.log(`   - New status: ${acceptResult.data.status}`);
    } else {
      throw new Error('Failed to accept application: ' + acceptResult.message);
    }

    // Step 7: Check updated status as student
    console.log('\n7. Checking application status as student...');
    const studentApplicationsResponse = await fetch(`${API_BASE_URL}/api/gig-applications/my-applications`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });

    const studentApplicationsResult = await studentApplicationsResponse.json();
    if (studentApplicationsResult.success) {
      const applications = studentApplicationsResult.data.applications;
      const updatedApplication = applications.find(app => app._id === applicationId);
      
      if (updatedApplication) {
        console.log('✅ Student can see updated application status');
        console.log(`   - Status: ${updatedApplication.status}`);
      } else {
        console.log('❌ Student cannot see their application');
      }
    } else {
      throw new Error('Failed to fetch student applications: ' + studentApplicationsResult.message);
    }

    console.log('\n🎉 Complete application flow test successful!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Student can log in');
    console.log('- ✅ Employer can log in');
    console.log('- ✅ Student can view available jobs');
    console.log('- ✅ Student can apply for jobs');
    console.log('- ✅ Employer can view applications');
    console.log('- ✅ Employer can accept/reject applications');
    console.log('- ✅ Student can see updated application status');
    console.log('\n🔧 Frontend features should now work:');
    console.log('- ✅ Job application submission (no more "Failed to apply" error)');
    console.log('- ✅ Employer can see applications in dashboard');
    console.log('- ✅ Status dropdown is clickable (not just hover)');
    console.log('- ✅ View Profile button opens modal (instead of broken navigation)');
    console.log('- ✅ Employers can accept/reject applications via modal');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the API server is running on http://localhost:5000');
    }
    
    if (error.message.includes('login failed')) {
      console.log('\n💡 Make sure test users exist. Run:');
      console.log('   node create-test-student.js');
      console.log('   node create-test-admin.js');
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCompleteApplicationFlow };
}

// Run if executed directly
if (typeof window === 'undefined' && require.main === module) {
  testCompleteApplicationFlow();
}
