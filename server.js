require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// 1. Connect to MongoDB Cloud Database
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Database'))
    .catch(err => console.error('Database connection error:', err));

// Database Schema (How user data is structured)
const UserSchema = new mongoose.Schema({
    userId: String,
    fullName: String,
    chapter: String,
    phone: String,
    email: String,
    group: String,
    pictureUrl: String
});
const User = mongoose.model('User', UserSchema);

// 2. Configure Cloudinary for Image Uploads
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: { folder: 'mzys_registration_2026' }
});
const upload = multer({ storage: storage });

// 3. REGISTRATION ENDPOINT
app.post('/api/register', upload.single('picture'), async (req, res) => {
    try {
        const { fullName, chapter, phone, email } = req.body;
        if (!req.file) return res.status(400).json({ error: "Please upload a picture." });

        // Smart Group Assignment (Checks database for group sizes)
        const groups = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Group 6'];
        let groupCounts = [];
        
        for (let g of groups) {
            const count = await User.countDocuments({ group: g });
            groupCounts.push(count);
        }

        let minIndex = groupCounts.indexOf(Math.min(...groupCounts));
        let assignedGroup = groups[minIndex];

        // Create User
        const userId = crypto.randomUUID();
        const newUser = new User({
            userId, fullName, chapter, phone, email,
            group: assignedGroup,
            pictureUrl: req.file.path // URL provided by Cloudinary
        });

        await newUser.save(); // Save permanently to MongoDB

        res.json({ success: true, userId: userId, group: assignedGroup });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error. Please try again." });
    }
});

// 4. SCANNER ENDPOINT
app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.id });
        if (user) {
            res.json({ success: true, user: user });
        } else {
            res.status(404).json({ success: false, error: "Attendee not found." });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Database error." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));