// MongoDB Setup Script
// Run this file to create initial database and collections

const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatapp';

async function setupDatabase() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        
        console.log('Connected to MongoDB successfully!');
        
        // Create indexes for better performance
        const User = require('./server').User;
        const Message = require('./server').Message;
        const Contact = require('./server').Contact;
        
        // Create indexes
        await User.collection.createIndex({ userId: 1 }, { unique: true });
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ username: 1 }, { unique: true });
        
        await Message.collection.createIndex({ senderId: 1, receiverId: 1, timestamp: 1 });
        await Message.collection.createIndex({ timestamp: -1 });
        
        await Contact.collection.createIndex({ userId: 1, contactId: 1 }, { unique: true });
        
        console.log('Database setup completed!');
        console.log('Indexes created successfully!');
        
    } catch (error) {
        console.error('Database setup failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run setup
setupDatabase();