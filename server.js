const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const multer = require('multer'); // For handling file uploads
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2; // Cloudinary integration

// Load environment variables from .env file
dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// Configure multer with Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user_images', // Folder in Cloudinary where images will be stored
    allowed_formats: ['jpg', 'jpeg', 'png'], // Allowed file formats
  },
});
const upload = multer({ storage });

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  uniqueName: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  images: [{ type: String }], // Array to store multiple image URLs
  password: { type: String, required: true, minlength: 4, maxlength: 4 }, // 4-digit numeric password
});

const User = mongoose.model('User', userSchema);

// API to handle user creation with multiple image uploads
app.post('/api/createUser', upload.array('images', 7), async (req, res) => {
  const { username, uniqueName, password } = req.body;
  const baseUrl = 'https://maha-kumbh.netlify.app/user/';

  if (!username || !uniqueName || !password) {
    return res.status(400).json({ message: 'Username, unique name, and password are required!' });
  }

  if (!/^\d{4}$/.test(password)) {
    return res.status(400).json({ message: 'Password must be exactly 4 numeric digits!' });
  }

  try {
    const existingUser = await User.findOne({ uniqueName });

    if (existingUser) {
      return res.status(400).json({ message: 'Unique name already exists!' });
    }

    // Extract image URLs from uploaded files
    const imagePaths = req.files.map((file) => file.path);

    const newUrl = `${baseUrl}${uniqueName}`;
    const newUser = new User({ username, uniqueName, url: newUrl, images: imagePaths, password });
    await newUser.save();

    res.status(201).json({ message: 'User created successfully!', url: newUrl, images: imagePaths });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API to delete a user by uniqueName and password
app.delete('/api/deleteUser', async (req, res) => {
  const { uniqueName, password } = req.body;

  if (!uniqueName || !password) {
    return res.status(400).json({ message: 'Unique name and password are required!' });
  }

  if (!/^\d{4}$/.test(password)) {
    return res.status(400).json({ message: 'Password must be exactly 4 numeric digits!' });
  }

  try {
    const user = await User.findOne({ uniqueName });

    if (!user) {
      return res.status(404).json({ message: 'User not found!' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid password!' });
    }

    // Delete the user
    await User.deleteOne({ uniqueName });
    res.status(200).json({ message: 'User deleted successfully!' });
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

// API to fetch total user count
app.get('/api/userCount', async (req, res) => {
  try {
    const userCount = await User.countDocuments(); // Count total users in the database
    res.status(200).json({ count: userCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
