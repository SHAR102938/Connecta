// Demo script to show application functionality
// This creates sample users for testing

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';

// Define schemas inline for demo
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    userId: { type: String, required: true, unique: true },
    avatar: { type: String, default: '' },
    status: { type: String, default: 'offline' },
    lastSeen: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createDemoUsers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB successfully!');

        // Check if demo users already exist
        const existingUsers = await User.find({ 
            username: { $in: ['demo_user1', 'demo_user2'] } 
        });

        if (existingUsers.length > 0) {
            console.log('Demo users already exist!');
            console.log('User 1 - Username: demo_user1, Email: demo1@chatapp.com, User ID:', existingUsers[0].userId);
            console.log('User 2 - Username: demo_user2, Email: demo2@chatapp.com, User ID:', existingUsers[1].userId);
            console.log('Password for both: demo123');
            return;
        }

        // Create demo users
        const demoUsers = [
            {
                username: 'demo_user1',
                email: 'demo1@chatapp.com',
                password: 'demo123',
                userId: '12345678'
            },
            {
                username: 'demo_user2',
                email: 'demo2@chatapp.com',
                password: 'demo123',
                userId: '87654321'
            }
        ];

        console.log('Creating demo users...');

        for (const userData of demoUsers) {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            
            const user = new User({
                username: userData.username,
                email: userData.email,
                password: hashedPassword,
                userId: userData.userId
            });

            await user.save();
            console.log(`Created user: ${userData.username} with ID: ${userData.userId}`);
        }

        console.log('\nDemo users created successfully!');
        console.log('\nYou can now test the application with these credentials:');
        console.log('\n=== DEMO USER 1 ===');
        console.log('Username: demo_user1');
        console.log('Email: demo1@chatapp.com');
        console.log('User ID: 12345678');
        console.log('Password: demo123');
        console.log('\n=== DEMO USER 2 ===');
        console.log('Username: demo_user2');
        console.log('Email: demo2@chatapp.com');
        console.log('User ID: 87654321');
        console.log('Password: demo123');
        console.log('\n=== TESTING INSTRUCTIONS ===');
        console.log('1. Open two different browsers or incognito windows');
        console.log('2. Login with each user in separate windows');
        console.log('3. Add each other as contacts using the User IDs');
        console.log('4. Start chatting in real-time!');
        console.log('\nMake sure the server is running: npm start');

    } catch (error) {
        console.error('Demo setup failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

// Run demo setup
createDemoUsers();