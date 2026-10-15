


const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const chatRoutes = require('./routes/chat');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);


app.use(express.json());


app.use('/api/auth', authRoutes);

app.use('/api/requests', requestRoutes);


app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.send('Garba Buddy backend is running!');
});


async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully!');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

startServer();
