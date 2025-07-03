const axios = require('axios');

async function testSpecificEndpoints() {
  let accessToken = null;
  
  try {
    // Login first
    const loginResponse = await axios.post('http://localhost:5000/api/auth/admin/login', {
      email: 'testadmin@quickshift.com',
      password: 'TestAdmin123!',
      userType: 'admin'
    });
    
    accessToken = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Admin login successful');

    // Test users endpoint with specific filters
    console.log('\n=== Testing Users Endpoint ===');
    
    // Test without filters
    const allUsersResponse = await axios.get('http://localhost:5000/api/admin/users', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    console.log('All users response:');
    console.log('- Success:', allUsersResponse.data.success);
    console.log('- Total:', allUsersResponse.data.total);
    console.log('- Count:', allUsersResponse.data.count);
    console.log('- Users:', allUsersResponse.data.data?.map(u => ({ 
      id: u._id, 
      name: `${u.firstName} ${u.lastName}`, 
      email: u.email, 
      role: u.role 
    })));

    // Test with role filter
    const jobSeekersResponse = await axios.get('http://localhost:5000/api/admin/users?role=job_seeker', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    console.log('\nJob seekers response:');
    console.log('- Success:', jobSeekersResponse.data.success);
    console.log('- Total:', jobSeekersResponse.data.total);
    console.log('- Count:', jobSeekersResponse.data.count);
    console.log('- Users:', jobSeekersResponse.data.data?.map(u => ({ 
      id: u._id, 
      name: `${u.firstName} ${u.lastName}`, 
      email: u.email, 
      role: u.role 
    })));

    // Test employers endpoint
    console.log('\n=== Testing Employers Endpoint ===');
    
    const employersResponse = await axios.get('http://localhost:5000/api/admin/employers', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    console.log('Employers response:');
    console.log('- Success:', employersResponse.data.success);
    console.log('- Total:', employersResponse.data.total);
    console.log('- Count:', employersResponse.data.count);
    console.log('- Employers:', employersResponse.data.data?.map(e => ({ 
      id: e._id, 
      name: e.companyName, 
      email: e.email, 
      location: e.location 
    })));

  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

testSpecificEndpoints();
