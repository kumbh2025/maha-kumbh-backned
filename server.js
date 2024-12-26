const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// App setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
const mongoUri = process.env.MONGO_URI;
mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit the process if MongoDB connection fails
  });

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  uniqueName: { type: String, required: true, unique: true },
  url: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// API to handle user creation
app.post('/api/createUser', async (req, res) => {
  const { username, uniqueName } = req.body;
  const baseUrl = 'http://localhost:5173/user/';

  if (!username || !uniqueName) {
    return res.status(400).json({ message: 'Username and unique name are required!' });
  }

  try {
    const existingUser = await User.findOne({ uniqueName });

    if (existingUser) {
      return res.status(400).json({ message: 'Unique name already exists!' });
    }

    const newUrl = `${baseUrl}${uniqueName}`;
    const newUser = new User({ username, uniqueName, url: newUrl });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully!', url: newUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API to fetch user details
app.get('/api/user/:uniqueName', async (req, res) => {
  try {
    const user = await User.findOne({ uniqueName: req.params.uniqueName });

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start Server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
