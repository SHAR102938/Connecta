# 🚀 ChatApp - Full-Featured Real-Time Chat Application

A modern, full-featured chat website with user authentication, real-time messaging, and an attractive UI/UX design. Built with Node.js, Express.js, Socket.IO, and MongoDB (with in-memory fallback for demo).

## ✨ Features Implemented

### 🔐 Authentication & User Management
- **User Registration** with unique 8-digit user IDs
- **Secure Login** with JWT token-based authentication
- **Password Hashing** using bcryptjs for security
- **User Profiles** with avatars and online/offline status

### 💬 Real-Time Messaging
- **Instant Message Delivery** using Socket.IO
- **Typing Indicators** show when someone is typing
- **Online/Offline Status** tracking
- **Message History** stored permanently

### 👥 Contact Management
- **Add Contacts** by searching with username or email
- **Contact List** with status indicators
- **User Search** functionality
- **Contact Requests** system

### 🎨 Modern UI/UX
- **Responsive Design** that works on all devices
- **Attractive Landing Page** with login/signup forms
- **Modern Chat Interface** similar to popular chat apps
- **Smooth Animations** and transitions
- **Gradient Backgrounds** and modern styling

### 🛠️ Technical Features
- **MongoDB Integration** with automatic fallback to in-memory storage
- **RESTful API** for all operations
- **Real-time Communication** via WebSockets
- **Error Handling** and validation
- **Security Features** including CORS and input validation

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)
- MongoDB (optional - app works without it in demo mode)

### Installation

1. **Clone or download the project**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser and go to:**
   ```
   http://localhost:3000
   ```

## 🎯 Demo Users

The app comes with pre-configured demo users for testing:

- **Demo User 1:**
  - Email: `demo1@example.com`
  - Password: `password`
  - User ID: `12345678`

- **Demo User 2:**
  - Email: `demo2@example.com`
  - Password: `password`
  - User ID: `87654321`

## 📱 How to Use

### For Testing (No MongoDB Required)
1. Open the app in your browser
2. Use the demo credentials above to login
3. Add contacts by searching for "demo"
4. Start chatting in real-time!

### For Production (With MongoDB)
1. Install and start MongoDB
2. Update the `.env` file with your MongoDB connection string
3. The app will automatically connect to MongoDB

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `GET /api/user` - Get current user info

### Contacts
- `GET /api/contacts` - Get user's contacts
- `POST /api/contacts` - Add new contact
- `GET /api/users/search?query=searchterm` - Search users

### Messages
- `GET /api/messages/:userId` - Get message history with specific user

## 💻 Socket.IO Events

### Client → Server
- `join` - Join chat with user ID
- `sendMessage` - Send a message
- `typing` - Send typing indicator
- `stopTyping` - Stop typing indicator

### Server → Client
- `receiveMessage` - Receive a message
- `messageSent` - Message sent confirmation
- `typing` - Someone is typing
- `stopTyping` - Someone stopped typing
- `userStatus` - User status changed (online/offline)

## 📁 Project Structure

```
chat-app/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── public/                # Frontend files
│   ├── index.html        # Main HTML file
│   ├── css/styles.css    # Styles
│   ├── js/app.js         # Frontend JavaScript
│   └── test.html         # Test interface
├── node_modules/         # Dependencies
├── demo.js              # Demo user setup script
├── test-demo.js         # API test script
├── setup-mongodb.js     # MongoDB setup script
├── FEATURES.md          # Detailed feature list
└── README.md            # This file
```

## 🎨 Frontend Features

### Landing Page
- Beautiful gradient background
- Smooth login/signup form transitions
- Form validation and error handling
- Responsive design for mobile and desktop

### Chat Interface
- Modern chat layout with sidebar
- Real-time message updates
- Contact list with status indicators
- Typing indicators
- Message timestamps
- User avatars
- Smooth animations

## 🔒 Security Features

- **Password Hashing** - All passwords are hashed with bcryptjs
- **JWT Authentication** - Secure token-based authentication
- **CORS Protection** - Configured for security
- **Input Validation** - All inputs are validated
- **Error Handling** - Comprehensive error handling

## 🌐 Browser Compatibility

- ✅ Chrome (Recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

## 🛠️ Development

### Available Scripts
- `npm start` - Start the server
- `npm run dev` - Start with nodemon for development

### Environment Variables
Create a `.env` file with:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
- The app will automatically fall back to in-memory storage
- You can still test all features without MongoDB
- Check the console for connection error messages

### Port Already in Use
- Change the PORT in the `.env` file
- Or kill the process using port 3000

### Frontend Not Loading
- Make sure all dependencies are installed: `npm install`
- Check that the server is running: `npm start`
- Try refreshing the browser

## 🎉 Success!

Your chat application is now ready! 🎊

- **No MongoDB?** No problem! The app works perfectly in demo mode
- **Want to add MongoDB?** Just start MongoDB and the app will connect automatically
- **Ready to test?** Use the demo users provided above
- **Want to customize?** All code is well-commented and easy to modify

## 📞 Support

The application includes:
- ✅ Complete source code
- ✅ Demo users for testing
- ✅ Comprehensive documentation
- ✅ Test interface at `/test.html`
- ✅ Error handling and logging

Enjoy your new chat application! 🚀💬