// Simple test script to check if bulk upload routes are working
import fetch from 'node-fetch';

const testRoutes = async () => {
  try {
    console.log('Testing bulk upload routes...');
    
    // Test template download route
    const templateResponse = await fetch('http://localhost:3001/api/employees/template', {
      method: 'GET',
      headers: {
        'Cookie': 'token=your_admin_token_here' // You'll need to replace this with actual token
      }
    });
    
    console.log('Template route status:', templateResponse.status);
    console.log('Template route headers:', templateResponse.headers.get('content-type'));
    
    if (templateResponse.status === 401) {
      console.log('✅ Route exists but requires authentication (expected)');
    } else if (templateResponse.status === 200) {
      console.log('✅ Template route working');
    } else {
      console.log('❌ Unexpected response:', templateResponse.status);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 3001');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
};

testRoutes();