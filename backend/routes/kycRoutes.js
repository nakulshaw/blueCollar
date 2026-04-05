const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        req.user = decoded.user;
        next();
    } catch(err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
}

// @route   POST api/kyc/verify
// @desc    Mock verify Aadhar
// @access  Private
router.post('/verify', auth, async (req, res) => {
    const { aadharNumber } = req.body;
    try {
        if (!aadharNumber || aadharNumber.length !== 12) {
            return res.status(400).json({ msg: 'Invalid Aadhar Number' });
        }
        
        let user = await User.findById(req.user.id);
        if(!user) return res.status(404).json({ msg: 'User not found' });

        // Simulate third-party Aadhar verification API success (e.g. Zoop)
        user.aadharStatus = 'verified';
        await user.save();

        res.json({ msg: 'Aadhar Verified Successfully', aadharStatus: user.aadharStatus });
    } catch(err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
