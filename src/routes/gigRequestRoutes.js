const express = require('express');
const router = express.Router();
const gigRequestController = require('../controllers/gigRequestController');
const { protect } = require('../middleware/auth');

// Public routes (no authentication required)
// Public endpoint for job seekers to view available jobs
router.get('/public', gigRequestController.getAllGigRequests);

// Public endpoint to get a single gig request
router.get('/public/:id', gigRequestController.getGigRequestById);

// Special routes for getting gig requests by user or employer - these must come BEFORE the /:id route
router.get('/user/:userId', gigRequestController.getGigRequestsByUserId);
router.get('/employer/:employerId', gigRequestController.getGigRequestsByEmployerId);

// Instant apply eligible jobs route - must come BEFORE the /:id route
router.get('/instant-apply-eligible', gigRequestController.getInstantApplyEligibleJobs);

// Apply for a gig request - must come BEFORE the /:id route
router.post('/:id/apply', gigRequestController.applyToGigRequest);

// Status update endpoint - must come BEFORE the /:id route
router.patch('/:id/status', protect, gigRequestController.updateGigRequestStatus);

// Base routes for gig requests
router.post('/', protect, gigRequestController.createGigRequest);
router.get('/', protect, gigRequestController.getAllGigRequests);
router.get('/:id', gigRequestController.getGigRequestById);
router.patch('/:id', protect, gigRequestController.updateGigRequest);
router.delete('/:id', protect, gigRequestController.deleteGigRequest);

module.exports = router;