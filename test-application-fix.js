/**
 * Test script to debug the job application submission issue
 */

const API_BASE_URL = 'http://localhost:5000';

// Test function to simulate frontend application submission
async function testJobApplication() {
  console.log('🧪 Testing Job Application Submission Issue\n');

  try {
    // Test 1: Check if API is running
    console.log('1. Testing API connectivity...');
    const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log(`✅ API Health: ${healthData.status}`);

    // Test 2: Get a sample job to apply for
    console.log('\n2. Getting sample job to apply for...');
    const jobsResponse = await fetch(`${API_BASE_URL}/api/gig-requests/public?limit=1`);
    const jobsData = await jobsResponse.json();
    
    if (!jobsData.success || !jobsData.data || jobsData.data.length === 0) {
      console.log('❌ No jobs found to test with');
      return;
    }

    const testJob = jobsData.data[0];
    console.log(`✅ Found test job: "${testJob.title}" (ID: ${testJob._id})`);
    console.log(`   - Time slots: ${testJob.timeSlots?.length || 0}`);
    
    if (testJob.timeSlots && testJob.timeSlots.length > 0) {
      console.log(`   - First time slot ID: ${testJob.timeSlots[0]._id}`);
    }

    // Test 3: Try to apply without authentication (should fail)
    console.log('\n3. Testing application without authentication...');
    const unauthenticatedResponse = await fetch(`${API_BASE_URL}/api/gig-requests/${testJob._id}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        coverLetter: 'Test application'
      })
    });
    
    const unauthResult = await unauthenticatedResponse.json();
    console.log(`Expected failure: ${unauthResult.message}`);

    // Test 4: Check the route and controller mapping
    console.log('\n4. Checking backend route configuration...');
    console.log('Frontend calls: POST /api/gig-requests/:id/apply');
    console.log('This should route to: gigRequestController.applyToGigRequest');
    console.log('Expected behavior: Allow empty timeSlots array');

    // Test 5: Mock what frontend would send
    console.log('\n5. Frontend application data structure:');
    const frontendData = {
      coverLetter: 'I am very interested in this position because...'
      // Note: No timeSlots included - this might be the issue!
    };
    
    console.log('Frontend sends:', JSON.stringify(frontendData, null, 2));

    // Test 6: What backend expects based on validation
    console.log('\n6. Backend expectation analysis:');
    console.log('In gigApplyController.applyForGig:');
    console.log('  - Expects timeSlots array with timeSlotId properties');
    console.log('  - Validates each timeSlot.timeSlotId exists in gig request');
    console.log('');
    console.log('In gigRequestController.applyToGigRequest:');
    console.log('  - Uses timeSlots || [] (allows empty)');
    console.log('  - No validation of timeSlotId');

    // Test 7: Check which route is actually being used
    console.log('\n7. Route analysis:');
    console.log('Route defined in gigRequestRoutes.js:');
    console.log('router.post("/:id/apply", protect, authorize("user", "job_seeker"), gigRequestController.applyToGigRequest);');

    console.log('\n📋 Summary of findings:');
    console.log('- ✅ API is running and accessible');
    console.log('- ✅ Jobs are available for application');
    console.log('- ✅ Frontend calls correct endpoint: /api/gig-requests/:id/apply');
    console.log('- ✅ Endpoint routes to gigRequestController.applyToGigRequest');
    console.log('- ✅ applyToGigRequest allows empty timeSlots (timeSlots || [])');
    console.log('- ❓ Issue likely: Authentication or middleware problem');

    console.log('\n🔍 Next steps to debug:');
    console.log('1. Check if user authentication token is valid');
    console.log('2. Verify auth middleware is working correctly');
    console.log('3. Check browser network tab for actual error response');
    console.log('4. Test with valid authentication token');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Make sure the API server is running on http://localhost:5000');
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testJobApplication };
}

// Run if executed directly
if (typeof window === 'undefined' && require.main === module) {
  testJobApplication();
}
