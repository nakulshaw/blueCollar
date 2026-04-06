const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Application = require('../models/Application');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// @route   POST api/jobs
// @desc    Post a job
// @access  Private (Employer)
router.post('/', auth, async (req, res) => {
    const { title, description, salary, locationPoint, locationName } = req.body;

    try {
        const newJob = new Job({
            employer: req.user.id,
            title,
            description,
            salary,
            location: {
                type: 'Point',
                coordinates: locationPoint // [longitude, latitude]
            },
            locationName
        });

        const job = await newJob.save();
        res.json(job);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/jobs
// @desc    Get all jobs based on distance from user location
// @access  Private
router.get('/', auth, async (req, res) => {
    const { lng, lat, maxDistance = 50000 } = req.query; // defaults to 50km

    try {
        let query = {};
        if (lng && lat && lng !== '0' && lat !== '0') {
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: parseInt(maxDistance)
                }
            };
        }

        const jobs = await Job.find(query).sort({ date: -1 });
        res.json(jobs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/jobs/employer/me
// @desc    Get jobs posted by the employer, including applications
// @access  Private (Employer)
router.get('/employer/me', auth, async (req, res) => {
    try {
        // Find jobs by this employer
        const jobs = await Job.find({ employer: req.user.id }).sort({ date: -1 });
        
        // Populate applications for each job
        const jobsWithApps = await Promise.all(jobs.map(async (job) => {
            const applications = await Application.find({ job: job._id })
                .populate('worker', 'name phone email aadharStatus')
                .sort({ createdAt: -1 });
            return {
                ...job._doc,
                applications
            };
        }));

        res.json(jobsWithApps);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/jobs/worker/applications
// @desc    Get applications submitted by the worker
// @access  Private (Worker)
router.get('/worker/applications', auth, async (req, res) => {
    try {
        const applications = await Application.find({ worker: req.user.id })
            .populate('job', 'title description salary locationName')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/jobs/:id/apply
// @desc    Apply for a job
// @access  Private (Worker)
router.post('/:id/apply', auth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) {
            return res.status(404).json({ msg: 'Job not found' });
        }

        // Prevent employer from applying
        if (job.employer.toString() === req.user.id) {
            return res.status(400).json({ msg: 'Employers cannot apply to their own jobs' });
        }

        // Check if already applied
        let application = await Application.findOne({ job: req.params.id, worker: req.user.id });
        if (application) {
            return res.status(400).json({ msg: 'Already applied for this job' });
        }

        application = new Application({
            job: req.params.id,
            worker: req.user.id,
            status: 'pending'
        });

        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/jobs/applications/:appId
// @desc    Update application status (Employer only)
// @access  Private (Employer)
router.put('/applications/:appId', auth, async (req, res) => {
    const { status } = req.body;
    try {
        let application = await Application.findById(req.params.appId).populate('job', 'employer');
        if (!application) return res.status(404).json({ msg: 'Application not found' });
        if (application.job.employer.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        application.status = status;
        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'bluecollar-work-evidence',
        allowed_formats: ['jpg', 'png', 'jpeg'],
    },
});

const upload = multer({ storage });

// @route   PUT api/jobs/applications/:appId/complete
// @desc    Mark application as completed and upload evidence (Worker only)
router.put('/applications/:appId/complete', auth, upload.array('workImages', 5), async (req, res) => {
    try {
        let application = await Application.findById(req.params.appId);
        if (!application) return res.status(404).json({ msg: 'Application not found' });
        if (application.worker.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        
        // Use file.path for Cloudinary URLs
        const imageUrls = req.files.map(file => file.path);
        
        application.status = 'completed';
        application.workImages = imageUrls;
        application.completedAt = Date.now();
        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/jobs/applications/:appId/review
// @desc    Rate and review a worker after job completion (Employer only)
router.put('/applications/:appId/review', auth, async (req, res) => {
    const { rating, review } = req.body;
    try {
        let application = await Application.findById(req.params.appId).populate('job');
        if (!application) return res.status(404).json({ msg: 'Application not found' });
        if (application.job.employer.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }
        if (application.status !== 'completed') {
            return res.status(400).json({ msg: 'Job must be completed before reviewing' });
        }
        application.rating = rating;
        application.review = review;
        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/jobs/applications/:appId
// @desc    Update application status (Employer only)
// @access  Private (Employer)
router.put('/applications/:appId', auth, async (req, res) => {
    const { status } = req.body;
    try {
        let application = await Application.findById(req.params.appId).populate('job', 'employer');
        if (!application) {
            return res.status(404).json({ msg: 'Application not found' });
        }
        // Only the employer who posted the job can modify the application
        if (application.job.employer.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized to perform this update' });
        }
        application.status = status;
        await application.save();
        res.json(application);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET api/jobs/worker/:workerId/history
router.get('/worker/:workerId/history', auth, async (req, res) => {
    try {
        const history = await Application.find({ 
            worker: req.params.workerId, 
            status: 'completed' 
        }).populate('job', 'title salary locationName employer');
        
        // Calculate average rating
        const ratings = history.filter(h => h.rating).map(h => h.rating);
        const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 0;

        res.json({ history, avgRating, count: history.length });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
