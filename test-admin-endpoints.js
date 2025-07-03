const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:5000';

async function testAdminEndpoints() {
  let accessToken = null;
  
  try {
    // Step 1: Login as admin
    console.log('=== STEP 1: Admin Login ===');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/admin/login`, {
      email: 'testadmin@quickshift.com',
      password: 'TestAdmin123!',
      userType: 'admin'
    });
    
    if (loginResponse.data.success) {
      accessToken = loginResponse.data.data.tokens.accessToken;
      console.log('✅ Admin login successful');
      console.log('Token received:', accessToken ? 'Yes' : 'No');
    } else {
      console.log('❌ Admin login failed:', loginResponse.data.message);
      return;
    }

    // Step 2: Test dashboard stats
    console.log('\n=== STEP 2: Dashboard Stats ===');
    const dashboardResponse = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (dashboardResponse.data.success) {
      console.log('✅ Dashboard stats retrieved successfully');
      console.log('Stats:', JSON.stringify(dashboardResponse.data.data, null, 2));
    } else {
      console.log('❌ Dashboard stats failed:', dashboardResponse.data.message);
    }

    // Step 3: Test get all users
    console.log('\n=== STEP 3: Get All Users ===');
    const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (usersResponse.data.success) {
      console.log('✅ Users retrieved successfully');
      console.log(`Total users: ${usersResponse.data.total}`);
      console.log(`Users returned: ${usersResponse.data.count}`);
      console.log('First user:', usersResponse.data.data[0] ? 
        `${usersResponse.data.data[0].firstName} ${usersResponse.data.data[0].lastName}` : 'None');
    } else {
      console.log('❌ Get users failed:', usersResponse.data.message);
    }

    // Step 4: Test get all employers
    console.log('\n=== STEP 4: Get All Employers ===');
    const employersResponse = await axios.get(`${API_BASE_URL}/api/admin/employers`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (employersResponse.data.success) {
      console.log('✅ Employers retrieved successfully');
      console.log(`Total employers: ${employersResponse.data.total}`);
      console.log(`Employers returned: ${employersResponse.data.count}`);
      console.log('First employer:', employersResponse.data.data[0] ? 
        `${employersResponse.data.data[0].companyName}` : 'None');
    } else {
      console.log('❌ Get employers failed:', employersResponse.data.message);
    }

    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Test failed with error:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Request URL:', error.config.url);
    }
  }
}

testAdminEndpoints();
