const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// @route   POST api/auth/register
// @desc    Register user (Email or Phone)
// @access  Public
router.post('/register', async (req, res) => {
    const { role, name, email, phone, password } = req.body;

    try {
        let user;
        if (email) user = await User.findOne({ email });
        else if (phone) user = await User.findOne({ phone });

        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ role, name, email, phone, password });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    role: user.role,
                    name: user.name,
                    email: user.email || '',
                    phone: user.phone || '',
                    aadharStatus: user.aadharStatus
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, phone, password } = req.body;

    try {
        let user;
        if (email) user = await User.findOne({ email });
        else if (phone) user = await User.findOne({ phone });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret123',
            { expiresIn: 360000 },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    role: user.role,
                    name: user.name,
                    email: user.email || '',
                    phone: user.phone || '',
                    aadharStatus: user.aadharStatus
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/me
// @desc    Get logged-in user's profile
// @access  Private
router.get('/me', async (req, res) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        const user = await User.findById(decoded.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(401).json({ msg: 'Token not valid' });
    }
});

module.exports = router;
