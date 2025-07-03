// Test script to manually test the API endpoints with proper authentication
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5000';

async function testAdminEndpoints() {
  console.log('Testing admin endpoints without authentication first...\n');

  try {
    // Test without auth to see error message
    console.log('1. Testing /api/admin/users without auth...');
    const usersResponse = await fetch(`${API_BASE_URL}/api/admin/users?page=1&limit=10&role=job_seeker`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const usersData = await usersResponse.json();
    console.log('Status:', usersResponse.status);
    console.log('Response:', usersData);

    console.log('\n2. Testing /api/admin/employers without auth...');
    const employersResponse = await fetch(`${API_BASE_URL}/api/admin/employers?page=1&limit=10`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const employersData = await employersResponse.json();
    console.log('Status:', employersResponse.status);
    console.log('Response:', employersData);

    console.log('\n3. Testing /api/admin/dashboard without auth...');
    const dashboardResponse = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const dashboardData = await dashboardResponse.json();
    console.log('Status:', dashboardResponse.status);
    console.log('Response:', dashboardData);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAdminEndpoints();
