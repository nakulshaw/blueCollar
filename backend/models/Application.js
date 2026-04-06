const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
    job: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'job',
        required: true
    },
    worker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed'],
        default: 'pending'
    },
    workImages: [String],
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    review: String,
    completedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('application', ApplicationSchema);
