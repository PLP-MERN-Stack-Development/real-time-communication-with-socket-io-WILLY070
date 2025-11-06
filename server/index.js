// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let onlineUsers = {}; // { socket.id: username }

io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // Handle user joining
  socket.on('join', (username) => {
    onlineUsers[socket.id] = username;
    console.log(`${username} joined`);
    io.emit('online_users', Object.values(onlineUsers));
    socket.broadcast.emit('notification', `${username} joined the chat`);
  });

  // 📨 Public messages (global chat)
  socket.on('send_message', (data) => {
    socket.broadcast.emit('receive_message', data);
  });

  // 💬 Private message
  socket.on('private_message', ({ to, from, message, time }) => {
    // Find recipient's socket ID
    const recipientSocketId = Object.keys(onlineUsers).find(
      (id) => onlineUsers[id] === to
    );

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('private_message', { from, message, time });
    }
  });

  // Typing indicator
  socket.on('typing', (data) => {
    socket.broadcast.emit('typing', data);
  });

  // Disconnect
  socket.on('disconnect', () => {
    const username = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    io.emit('online_users', Object.values(onlineUsers));

    if (username) {
      socket.broadcast.emit('notification', `${username} left the chat`);
      console.log(`🔴 ${username} disconnected`);
    }
  });
});

app.get('/', (req, res) => res.send('Server running 🚀'));

const PORT = 4000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
