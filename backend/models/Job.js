const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
    employer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    salary: {
        type: String,
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'], 
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true 
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes to support geospatial queries
JobSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('job', JobSchema);
