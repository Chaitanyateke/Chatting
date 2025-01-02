import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  Paper,
  IconButton,
  InputAdornment,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import DeleteIcon from '@mui/icons-material/Delete';

const socket = io('http://localhost:5000');

const App = () => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState('');
  const [messages, setMessages] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [clickedMessageId, setClickedMessageId] = useState(null); // Track clicked message

  // Fetch messages when the room changes
  useEffect(() => {
    if (room) {
      axios
        .get(`http://localhost:5000/messages?room=${room}`)
        .then((res) => setMessages(res.data))
        .catch((err) => console.error(err));

      socket.emit('joinRoom', room);
    }
  }, [room]);

  // Listen for incoming messages
  useEffect(() => {
    const handleMessage = (newMessage) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    };

    socket.on('receiveMessage', handleMessage);

    socket.on('messageDeleted', (data) => {
      // Remove the deleted message from the list
      setMessages((prevMessages) => prevMessages.filter((msg) => msg._id !== data.id));
    });

    return () => {
      socket.off('receiveMessage', handleMessage); // Clean up listener
      socket.off('messageDeleted'); // Clean up the delete listener
    };
  }, []);

  const handleSendMessage = () => {
    if (message.trim() && room.trim()) {
      const timestamp = new Date().toLocaleTimeString();
      socket.emit('sendMessage', { username, message, room, timestamp });
      setMessage('');
    }
  };

  const handleDeleteMessage = (messageId) => {
    axios
      .patch(`http://localhost:5000/deleteMessage/${messageId}`)
      .then(() => {
        // Optimistically remove the deleted message from the UI
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg._id !== messageId)
        );
      })
      .catch((err) => {
        console.error('Error deleting message:', err);
        alert('Failed to delete message.');
      });
  };

  const handleMessageClick = (messageId) => {
    // Toggle delete button visibility
    if (clickedMessageId === messageId) {
      setClickedMessageId(null); // Hide delete button
    } else {
      setClickedMessageId(messageId); // Show delete button
    }
  };

  if (!loggedIn) {
    return (
      <Container
        maxWidth="sm"
        style={{
          marginTop: '50px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #74ebd5 0%, #9face6 100%)',
          padding: '40px',
          borderRadius: '10px',
          boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)',
        }}
      >
        <ChatIcon color="primary" style={{ fontSize: 60, marginBottom: '20px' }} />
        <Typography variant="h4" gutterBottom style={{ color: '#fff', fontWeight: 'bold' }}>
          Welcome to Chat App
        </Typography>
        <TextField
          label="Enter Username"
          fullWidth
          margin="normal"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => setLoggedIn(true)}
          style={{ marginTop: '10px' }}
        >
          Join Chat
        </Button>
      </Container>
    );
  }

  return (
    <Box
      style={{
        background: 'linear-gradient(135deg, #FFDEE9 0%, #B5FFFC 100%)',
        minHeight: '100vh',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Container
        maxWidth="md"
        style={{
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.2)',
          padding: '20px',
          marginTop: '30px',
        }}
      >
        <Typography variant="h5" style={{ marginBottom: '20px', fontWeight: 'bold' }}>
          Chat Room: {room || 'None'}
        </Typography>
        <TextField
          label="Enter Room"
          fullWidth
          margin="normal"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          style={{ marginBottom: '20px' }}
        />
        <Paper
          style={{
            padding: '10px',
            height: '400px',
            overflowY: 'scroll',
            backgroundColor: '#f9f9f9',
            borderRadius: '10px',
          }}
          elevation={3}
        >
          <List>
            {messages.map((msg) => (
              <ListItem
                key={msg._id}
                style={{
                  display: 'flex',
                  justifyContent: msg.username === username ? 'flex-end' : 'flex-start',
                  marginBottom: '10px',
                }}
                onClick={() => handleMessageClick(msg._id)} // Add click handler
              >
                <Box
                  style={{
                    maxWidth: '70%',
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: msg.username === username ? '#d1ffd6' : '#f2f2f2',
                    position: 'relative',
                  }}
                >
                  <Box
                    style={{
                      display: 'flex',
                      flexDirection: 'row', // Align name and message in a row
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="body2"
                      style={{
                        fontWeight: 'bold',
                        color: 'red', // Sender name in red
                        marginRight: '10px', // Space between name and message
                      }}
                    >
                      {msg.username}
                    </Typography>
                    <Typography
                      variant="body2"
                      style={{
                        wordWrap: 'break-word', // Wrap long messages to new lines
                        flex: 1, // Make sure the message takes up remaining space
                      }}
                    >
                      {msg.message}
                    </Typography>
                  </Box>
                  
                  {/* Timestamp below the message */}
                  <Typography
                    variant="caption"
                    style={{
                      fontStyle: 'italic',
                      color: '#777',
                      marginTop: '5px', // Space above the timestamp
                      textAlign: 'right', // Right-aligned timestamp
                    }}
                  >
                    {msg.timestamp}
                  </Typography>

                  {/* Conditionally show delete button after the message */}
                  {clickedMessageId === msg._id && (
                    <IconButton
                      size="small"
                      color="secondary"
                      style={{
                        position: 'absolute',
                        bottom: '-10px',
                        right: '5px',
                      }}
                      onClick={() => handleDeleteMessage(msg._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>

        <TextField
          label="Enter message"
          fullWidth
          margin="normal"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={handleSendMessage}
                  color="primary"
                  disabled={!message.trim()}
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Container>
    </Box>
  );
};

export default App;
