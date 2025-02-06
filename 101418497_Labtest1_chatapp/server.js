
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const port = 3000;

// MongoDB connection
const dbURI = 'mongodb+srv://khoahuynh:PoKfMUW3TGBUKtwB@chatbot.bgfkt.mongodb.net/?retryWrites=true&w=majority&appName=chatbot';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('Error connecting to MongoDB:', err));

const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let users = {}; // Store online users

// Signup Route
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login Route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // DEBUG: send the stored hash for comparison
      return res.status(400).json({ 
        message: 'Invalid username or password', 
        storedPassword: user.password // remove in production!
      });
    }

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// Socket.io logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('setUsername', (username) => {
    users[socket.id] = username;
    io.emit('usersList', Object.values(users)); // Send updated users list
  });

  socket.on('joinRoom', async ({ username, room }) => {
    socket.join(room);
    socket.currentRoom = room;
    io.to(room).emit('chatMessage', { sender: 'System', message: `${username} joined ${room}` });

    // Load previous messages
    const messages = await Message.find({ room }).sort({ timestamp: 1 });
    socket.emit('loadMessages', messages);
  });

  socket.on('chatMessage', async ({ message, sender }) => {
    const room = socket.currentRoom;
    if (!room) return;

    // Save message
    const newMessage = new Message({ message, sender, room });
    await newMessage.save();

    // Broadcast to room
    io.to(room).emit('chatMessage', { sender, message });
  });

  socket.on('leaveRoom', (room) => {
    socket.leave(room);
    socket.emit('chatMessage', { sender: 'System', message: `You left ${room}` });
  });

  // Private Chat
  socket.on('privateMessage', ({ sender, recipient, message }) => {
    const recipientSocket = Object.keys(users).find(key => users[key] === recipient);
    if (recipientSocket) {
      io.to(recipientSocket).emit('privateMessage', { sender, message });
    }
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
    io.emit('usersList', Object.values(users));
    console.log('User disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

