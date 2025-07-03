#!/usr/bin/env node

// Simple server start script
const { spawn } = require('child_process');

console.log('Starting QuickShift API server...');
console.log('NOTE: All admin users now have access to platform settings by default.');

// Start the server
const server = spawn('node', ['src/server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});
