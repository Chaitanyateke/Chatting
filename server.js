const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Message schema
const MessageSchema = new mongoose.Schema({
  username: String,
  message: String,
  room: String,
  timestamp: { type: Date, default: Date.now },
  deleted: { type: Boolean, default: false }, // Add deleted flag
});
const Message = mongoose.model('Message', MessageSchema);

// API endpoint to fetch messages by room
app.get('/messages', async (req, res) => {
  const { room } = req.query;
  const messages = await Message.find({ room, deleted: false }).sort({ timestamp: 1 });
  res.json(
    messages.map((msg) => ({
      _id: msg._id,
      username: msg.username,
      message: msg.message,
      timestamp: msg.timestamp.toLocaleTimeString(),
    }))
  );
});

// API endpoint to mark a message as deleted (don't remove from DB)
app.patch('/deleteMessage/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Mark the message as deleted (do not remove it)
    const updatedMessage = await Message.findByIdAndUpdate(id, { deleted: true }, { new: true });

    if (!updatedMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Emit the deletion event to all users in the room
    io.to(updatedMessage.room).emit('messageDeleted', { id });

    res.json({ message: 'Message marked as deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting message', error: err });
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on('sendMessage', async (data) => {
    const { username, message, room } = data;

    // Generate a single timestamp for the message
    const timestamp = new Date().toLocaleTimeString();

    // Save message to database
    const newMessage = new Message({ username, message, room });
    await newMessage.save();

    // Emit message to users in the room
    io.to(room).emit('receiveMessage', {
      _id: newMessage._id,
      username,
      message,
      room,
      timestamp,
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Start server
const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
