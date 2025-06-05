const express = require('express');
const router = express.Router();
const gigApplyController = require('../controllers/gigApplyController');

// Apply for a gig
router.post('/', gigApplyController.applyForGig);

// Instant/One-click apply for a gig (mobile-optimized)
router.post('/instant-apply', gigApplyController.instantApplyForGig);

// Get all applications for a specific gig request
router.get('/gig/:gigRequestId', gigApplyController.getApplicationsByGigRequestId);

// Get all applications from a specific user
router.get('/user/:userId', gigApplyController.getApplicationsByUserId);

// Get a specific application by ID
router.get('/:id', gigApplyController.getApplicationById);

// Update application status
router.patch('/:id/status', gigApplyController.updateApplicationStatus);

// Update application feedback
router.patch('/:id/feedback', gigApplyController.updateApplicationFeedback);

// Delete an application
router.delete('/:id', gigApplyController.deleteApplication);

module.exports = router;
