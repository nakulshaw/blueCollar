const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['worker', 'employer'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true // allows multiple null values if phone is used
    },
    phone: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: true
    },
    aadharStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    location: {
        type: {
            type: String,
            enum: ['Point'], 
            required: false
        },
        coordinates: {
            type: [Number],
            required: false // [longitude, latitude]
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes to support geospatial queries
UserSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('user', UserSchema);
