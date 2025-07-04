// Simple test to check if server is accessible
const http = require('http');

function testConnection() {
  console.log('Testing connection to localhost:5000...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`Server responded with status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data);
    });
  });

  req.on('error', (error) => {
    console.error('Connection error:', error.message);
  });

  req.on('timeout', () => {
    console.error('Connection timeout');
    req.destroy();
  });

  req.end();
}

testConnection();
