// Test script for demo users
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testDemoUsers() {
  try {
    console.log('Testing demo users...');
    
    // Test login with demo user 1
    console.log('\n1. Testing login with demo_user1 (test3@gmail.com)');
    const login1 = await axios.post(`${API_BASE}/login`, {
      email: 'test3@gmail.com',
      password: 'password' // Replace with the actual password if known
    });
    console.log('✅ Login successful:', login1.data);
    
    // Test login with demo user 2
    console.log('\n2. Testing login with demo_user2 (demo2@example.com)');
    const login2 = await axios.post(`${API_BASE}/login`, {
      email: 'demo2@example.com',
      password: 'password123'
    });
    console.log('✅ Login successful:', login2.data);
    
    // Test user search
    console.log('\n3. Testing user search');
    const search = await axios.get(`${API_BASE}/users/search?query=demo`, {
      headers: {
        'Authorization': `Bearer ${login1.data.token}`
      }
    });
    console.log('✅ Search results:', search.data);
    
    console.log('\n🎉 All tests passed! The server is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDemoUsers();