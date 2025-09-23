// Simple test to check if server is running
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/test',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Server is running on port 3001 - Status: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log('Response:', chunk.toString());
  });
});

req.on('error', (err) => {
  console.error('Server is NOT running on port 3001:', err.message);
  console.log('\nTo fix this:');
  console.log('1. Open a new terminal');
  console.log('2. Navigate to the project directory');
  console.log('3. Run: npm run server');
  console.log('4. Then restart the frontend with: npm run dev');
});

req.end();