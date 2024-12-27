const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const multer = require('multer'); // For handling file uploads
const path = require('path'); // For managing file paths

// Load environment variables from .env file
dotenv.config();

// App setup
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const mongoUri = process.env.MONGO_URI;
mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit the process if MongoDB connection fails
  });

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Save files to 'uploads/' folder
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Generate unique filenames
  },
});

const upload = multer({ storage });

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  uniqueName: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  image: { type: String }, // Field to store the image path
});

const User = mongoose.model('User', userSchema);

// API to handle user creation with image upload
app.post('/api/createUser', upload.single('image'), async (req, res) => {
  const { username, uniqueName } = req.body;
  const baseUrl = 'https://maha-kumbh.netlify.app/user/';

  if (!username || !uniqueName) {
    return res.status(400).json({ message: 'Username and unique name are required!' });
  }

  try {
    const existingUser = await User.findOne({ uniqueName });

    if (existingUser) {
      return res.status(400).json({ message: 'Unique name already exists!' });
    }

    const imagePath = req.file ? `https://maha-kumbh-backned.onrender.com/uploads/${req.file.filename}` : null;
    const newUrl = `${baseUrl}${uniqueName}`;
    const newUser = new User({ username, uniqueName, url: newUrl, image: imagePath });
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
