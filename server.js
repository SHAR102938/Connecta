
require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Database Connection ---
const MONGO_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1); // Exit process with failure
  }
};

connectDB();

// --- Mongoose Schemas and Models ---

// Counter for unique user IDs
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 10000000 }
});
const Counter = mongoose.model('Counter', CounterSchema);

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: '' },
  status: { type: String, default: 'offline' },
  lastSeen: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const ContactSchema = new mongoose.Schema({
  userId: { type: String, ref: 'User', required: true },
  contactId: { type: String, ref: 'User', required: true },
  contactName: { type: String },
  createdAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', ContactSchema);

const MessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);


// --- Data Access Layer (MongoDB) ---

async function getNextUserId() {
    const randomId = Math.floor(10000000 + Math.random() * 90000000).toString();
    const existingUser = await User.findOne({ userId: randomId });
    if (existingUser) {
        return getNextUserId();
    }
    return randomId;
}

async function findUserByEmail(email) {
  return User.findOne({ email });
}

async function findUserByUserId(userId) {
  return User.findOne({ userId });
}

async function createUser(userData) {
  const newUser = new User(userData);
  await newUser.save();
  return newUser;
}

async function updateUserStatus(userId, status) {
  return User.findOneAndUpdate(
    { userId },
    { status, lastSeen: new Date() },
    { new: true }
  );
}

async function getUserContacts(userId) {
    const contacts = await Contact.find({ userId });
    const contactDetails = await Promise.all(contacts.map(async (contact) => {
        const contactUser = await User.findOne({ userId: contact.contactId });
        if (!contactUser) return null;
        return {
            _id: contact._id,
            userId: contact.userId,
            contactId: contactUser.userId,
            contactName: contact.contactName || contactUser.username,
            contactEmail: contactUser.email,
            contactAvatar: contactUser.avatar,
            status: contactUser.status,
            lastSeen: contactUser.lastSeen,
            createdAt: contact.createdAt
        };
    }));
    return contactDetails.filter(c => c !== null && c.userId === userId);
}

async function addContact(userId, contactId, contactName) {
    const existingContact = await Contact.findOne({ userId, contactId });
    if (existingContact) {
        return existingContact;
    }
    const newContact = new Contact({ userId, contactId, contactName });
    await newContact.save();
    return newContact;
}

async function getMessages(senderId, receiverId) {
    return Message.find({
        $or: [
            { senderId, receiverId },
            { senderId: receiverId, receiverId: senderId }
        ]
    }).sort({ createdAt: 'asc' });
}

async function saveMessage(messageData) {
    const newMessage = new Message(messageData);
    await newMessage.save();
    return newMessage;
}


// --- API Routes ---
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await getNextUserId();

    const savedUser = await createUser({
      username,
      email,
      password: hashedPassword,
      userId,
    });

    const token = jwt.sign({ userId: savedUser.userId, username: savedUser.username }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });

    res.status(201).json({
      token,
      user: {
        userId: savedUser.userId,
        username: savedUser.username,
        email: savedUser.email,
        avatar: savedUser.avatar,
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await updateUserStatus(user.userId, 'online');

    const token = jwt.sign({ userId: user.userId, username: user.username }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });

    res.json({
      token,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Middleware to protect routes
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        req.userId = decoded.userId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
};


app.get('/api/contacts', authMiddleware, async (req, res) => {
    try {
        const contacts = await getUserContacts(req.userId);
        res.json({ contacts });
    } catch (error) {
        console.error('Get Contacts Error:', error);
        res.status(500).json({ error: 'Failed to load contacts' });
    }
});

app.post('/api/contacts', authMiddleware, async (req, res) => {
    const { contactIdentifier } = req.body; // Assuming contactName is not used for now
    if (!contactIdentifier) {
        return res.status(400).json({ error: 'Contact identifier (user ID) is required' });
    }
    if (contactIdentifier === req.userId) {
        return res.status(400).json({ error: 'You cannot add yourself as a contact' });
    }
    try {
        const user = await findUserByUserId(contactIdentifier);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const contact = await addContact(req.userId, user.userId, user.username);
        res.status(201).json({ contact });
    } catch (error) {
        console.error('Add Contact Error:', error);
        res.status(500).json({ error: 'Failed to add contact' });
    }
});

app.get('/api/messages/:contactId', authMiddleware, async (req, res) => {
    try {
        const messages = await getMessages(req.userId, req.params.contactId);
        res.json({ messages });
    } catch (error) {
        console.error('Get Messages Error:', error);
        res.status(500).json({ error: 'Failed to load messages' });
    }
});

app.post('/api/messages', authMiddleware, async (req, res) => {
    const { receiverId, text } = req.body;
    if (!receiverId || !text) {
        return res.status(400).json({ error: 'Receiver ID and text are required' });
    }
    try {
        const message = await saveMessage({
            senderId: req.userId,
            receiverId,
            text,
        });
        io.to(receiverId).emit('receive-message', message);
        io.to(req.userId).emit('receive-message', message);
        res.status(201).json({ message });
    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.get('/api/search-user/:userId', authMiddleware, async (req, res) => {
    try {
        const user = await findUserByUserId(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: { userId: user.userId, username: user.username } });
    } catch (error) {
        console.error('Search User Error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});


// --- Socket.IO ---
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        socket.userId = decoded.userId;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.userId);

  socket.join(socket.userId);
  updateUserStatus(socket.userId, 'online');
  socket.broadcast.emit('user-status-changed', { userId: socket.userId, status: 'online' });

  socket.on('send-message', async (data) => {
    try {
      const message = await saveMessage({ ...data, senderId: socket.userId, text: data.text });
      socket.to(data.receiverId).emit('receive-message', message);
      socket.emit('receive-message', message);
    } catch (err) {
      console.error('Message sending error:', err);
      socket.emit('message-error', { error: 'Failed to send message' });
    }
  });

  socket.on('typing', (data) => {
    io.to(data.receiverId).emit('user-typing', { userId: socket.userId });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.userId);
    if (socket.userId) {
        updateUserStatus(socket.userId, 'offline');
        socket.broadcast.emit('user-status-changed', { userId: socket.userId, status: 'offline' });
    }
  });
});


// --- Server ---
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = server; // Export server for testing purposes