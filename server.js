
require('dotenv').config();
const http = require('http');
const express = require('express');
const socketIo = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- File Storage System ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

function loadFromFile(filename) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function saveToFile(filename, data) {
  const filePath = path.join(dataDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getNextUserId() {
    const metadataPath = path.join(dataDir, 'metadata.json');
    let metadata = { nextUserId: 10000000 };
    if (fs.existsSync(metadataPath)) {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }
    const userId = metadata.nextUserId;
    metadata.nextUserId++;
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    return userId.toString();
}


// --- Data Access Layer ---
async function findUserByEmail(email) {
  const users = loadFromFile('users.json');
  return users.find(user => user.email === email);
}

async function findUserByUserId(userId) {
  const users = loadFromFile('users.json');
  return users.find(user => user.userId === userId);
}

async function createUser(userData) {
  const users = loadFromFile('users.json');
  users.push(userData);
  saveToFile('users.json', users);
  return userData;
}

async function updateUserStatus(userId, status) {
  const users = loadFromFile('users.json');
  const user = users.find(u => u.userId === userId);
  if (user) {
    user.status = status;
    user.lastSeen = new Date();
    saveToFile('users.json', users);
  }
  return user;
}

async function getUserContacts(userId) {
    const contacts = loadFromFile('contacts.json');
    const users = loadFromFile('users.json');
    const userContacts = contacts.filter(contact => contact.userId === userId);

    const contactDetails = userContacts.map(contact => {
        const contactUser = users.find(u => u.userId === contact.contactId);
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
    }).filter(contact => contact !== null);

    return contactDetails;
}

async function addContact(userId, contactId, contactName) {
    const contacts = loadFromFile('contacts.json');
    const existingContact = contacts.find(c => c.userId === userId && c.contactId === contactId);
    if (existingContact) {
        return existingContact;
    }
    const newContact = {
        _id: Math.random().toString(36).substr(2, 9),
        userId,
        contactId,
        contactName,
        createdAt: new Date()
    };
    contacts.push(newContact);
    saveToFile('contacts.json', contacts);
    return newContact;
}

async function getMessages(senderId, receiverId) {
    const messages = loadFromFile('messages.json');
    return messages
        .filter(msg =>
            (msg.senderId === senderId && msg.receiverId === receiverId) ||
            (msg.senderId === receiverId && msg.receiverId === senderId)
        )
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function saveMessage(messageData) {
    const messages = loadFromFile('messages.json');
    const message = {
        _id: Math.random().toString(36).substr(2, 9),
        ...messageData,
        createdAt: new Date()
    };
    messages.push(message);
    saveToFile('messages.json', messages);
    return message;
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
    const userId = getNextUserId();

    const newUser = {
      username,
      email,
      password: hashedPassword,
      userId,
      avatar: '',
      status: 'offline',
      lastSeen: new Date(),
    };

    const savedUser = await createUser(newUser);

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
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    console.log('Login attempt:', { email, password });
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
        res.status(500).json({ error: 'Failed to load contacts' });
    }
});

app.post('/api/contacts', authMiddleware, async (req, res) => {
    const { contactIdentifier, contactName } = req.body;
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
        const contact = await addContact(req.userId, user.userId, contactName);
        res.status(201).json({ contact });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add contact' });
    }
});

app.get('/api/messages/:contactId', authMiddleware, async (req, res) => {
    try {
        const messages = await getMessages(req.userId, req.params.contactId);
        res.json({ messages });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load messages' });
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
    const message = await saveMessage({ ...data, senderId: socket.userId });
    io.to(data.receiverId).emit('receive-message', message);
    io.to(socket.userId).emit('receive-message', message);
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
const PORT = process.env.PORT || 3001;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { loadFromFile };