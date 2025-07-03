const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000';

// Test function to check API endpoints
async function testApiEndpoints() {
  console.log('Testing API endpoints...\n');
  
  // You'll need to replace this with a valid admin token
  // For testing, you can temporarily log in as an admin and copy the token
  const adminToken = 'YOUR_ADMIN_TOKEN_HERE'; // Replace with actual token
  
  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test users endpoint
    console.log('Testing /api/admin/users endpoint...');
    const usersResponse = await axios.get(`${API_BASE_URL}/api/admin/users?page=1&limit=10&role=job_seeker`, {
      headers,
      timeout: 10000
    });
    console.log('Users response:', usersResponse.data);
    console.log(`Found ${usersResponse.data.count} users out of ${usersResponse.data.total} total\n`);
    
    // Test employers endpoint
    console.log('Testing /api/admin/employers endpoint...');
    const employersResponse = await axios.get(`${API_BASE_URL}/api/admin/employers?page=1&limit=10`, {
      headers,
      timeout: 10000
    });
    console.log('Employers response:', employersResponse.data);
    console.log(`Found ${employersResponse.data.count} employers out of ${employersResponse.data.total} total\n`);
    
    // Test dashboard endpoint
    console.log('Testing /api/admin/dashboard endpoint...');
    const dashboardResponse = await axios.get(`${API_BASE_URL}/api/admin/dashboard`, {
      headers,
      timeout: 10000
    });
    console.log('Dashboard response:', dashboardResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Error: Cannot connect to API server. Make sure the server is running on', API_BASE_URL);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// First, let's test if the server is running
async function testServerConnection() {
  try {
    console.log('Testing server connection...');
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    console.log('Server is running:', response.data);
    return true;
  } catch (error) {
    console.log('Health check failed, trying basic connection...');
    try {
      await axios.get(`${API_BASE_URL}`, { timeout: 5000 });
      console.log('Server is running (no health endpoint)');
      return true;
    } catch (e) {
      console.error('Server is not running or not accessible');
      return false;
    }
  }
}

async function main() {
  const serverRunning = await testServerConnection();
  
  if (serverRunning) {
    console.log('\n⚠️  To test the API endpoints, you need to:');
    console.log('1. Log in as an admin in the frontend');
    console.log('2. Copy the access token from localStorage');
    console.log('3. Replace "YOUR_ADMIN_TOKEN_HERE" in this script with the actual token');
    console.log('4. Run this script again\n');
    
    console.log('For now, let\'s check the database counts directly...');
    // We'll modify the test-data script to also check counts
  }
}

main();
