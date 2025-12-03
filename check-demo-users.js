// Simple test to check demo users
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function checkDemoUsers() {
  try {
    console.log('Checking demo users...');
    
    // Test demo_user1 login
    console.log('Testing demo_user1 login...');
    const login1 = await axios.post(`${API_BASE}/login`, {
      email: 'demo1@example.com',
      password: 'password'
    });
    console.log('✅ demo_user1 login successful');
    
    // Test demo_user2 login
    console.log('Testing demo_user2 login...');
    const login2 = await axios.post(`${API_BASE}/login`, {
      email: 'demo2@example.com',
      password: 'password'
    });
    console.log('✅ demo_user2 login successful');
    
    console.log('All demo users are working correctly!');
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }
}

checkDemoUsers();