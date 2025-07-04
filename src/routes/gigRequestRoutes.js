const express = require('express');
const router = express.Router();
const gigRequestController = require('../controllers/gigRequestController');
const { protect, authorize } = require('../middleware/auth');

// Public routes (no authentication required) for job seekers to browse jobs
// Public endpoint for job seekers to view available jobs
router.get('/public', gigRequestController.getAllGigRequests);

// Public endpoint to get a single gig request
router.get('/public/:id', gigRequestController.getGigRequestById);

// Special routes for getting gig requests by user or employer - these must come BEFORE the /:id route
router.get('/user/:userId', protect, authorize('admin', 'super_admin'), gigRequestController.getGigRequestsByUserId);
router.get('/employer/:employerId', protect, authorize('admin', 'super_admin', 'employer'), gigRequestController.getGigRequestsByEmployerId);

// Instant apply eligible jobs route - must come BEFORE the /:id route (public for job seekers)
router.get('/instant-apply-eligible', gigRequestController.getInstantApplyEligibleJobs);

// Apply for a gig request - must come BEFORE the /:id route (users/students only)
router.post('/:id/apply', protect, authorize('user', 'job_seeker'), gigRequestController.applyToGigRequest);

// Status update endpoint - must come BEFORE the /:id route (employers and admins only)
router.patch('/:id/status', protect, authorize('employer', 'admin', 'super_admin'), gigRequestController.updateGigRequestStatus);

// Base routes for gig requests
// Create gig request (employers only)
router.post('/', protect, authorize('employer'), gigRequestController.createGigRequest);

// Get all gig requests (admins see all, employers see their own)
router.get('/', protect, gigRequestController.getAllGigRequests);

// Get single gig request (public access but different data based on role)
router.get('/:id', gigRequestController.getGigRequestById);

// Update gig request (employers can update their own, admins can update any)
router.patch('/:id', protect, authorize('employer', 'admin', 'super_admin'), gigRequestController.updateGigRequest);

// Delete gig request (employers can delete their own, admins can delete any)
router.delete('/:id', protect, authorize('employer', 'admin', 'super_admin'), gigRequestController.deleteGigRequest);

module.exports = router;