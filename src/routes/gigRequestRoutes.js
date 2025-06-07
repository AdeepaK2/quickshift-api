const express = require('express');
const router = express.Router();
const gigRequestController = require('../controllers/gigRequestController');

// Special routes for getting gig requests by user or employer - these must come BEFORE the /:id route
router.get('/user/:userId', gigRequestController.getGigRequestsByUserId);
router.get('/employer/:employerId', gigRequestController.getGigRequestsByEmployerId);

// Instant apply eligible jobs route - must come BEFORE the /:id route
router.get('/instant-apply-eligible', gigRequestController.getInstantApplyEligibleJobs);

// Apply for a gig request - must come BEFORE the /:id route
router.post('/:id/apply', gigRequestController.applyToGigRequest);

// Base routes for gig requests
router.post('/', gigRequestController.createGigRequest);
router.get('/', gigRequestController.getAllGigRequests);
router.get('/:id', gigRequestController.getGigRequestById);
router.patch('/:id', gigRequestController.updateGigRequest);
router.delete('/:id', gigRequestController.deleteGigRequest);

module.exports = router;