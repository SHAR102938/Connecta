const { loadFromFile } = require('./server');

// Test findUserByEmail functionality
const users = loadFromFile('users.json');
const user = users.find(u => u.email === 'demo2@chatapp.com');

console.log('Retrieved User:', user);