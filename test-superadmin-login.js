const axios = require('axios');

async function testSuperAdminLogin() {
  try {
    console.log('Testing super admin login...');
    const response = await axios.post('http://localhost:5000/api/auth/admin/login', {
      email: 'superadmin@quickshift.com',
      password: 'SuperAdmin123!',
      userType: 'admin'
    });
    console.log('Login successful:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('Login failed:', error.response ? error.response.data : error.message);
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Headers:', JSON.stringify(error.response.headers, null, 2));
    }
    return false;
  }
}

testSuperAdminLogin();
