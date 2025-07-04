const express = require('express');
const gigCompletionController = require('../controllers/gigCompletionController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Protected routes for authenticated users
// Get current user's gig completions
router.get('/my-completions', protect, gigCompletionController.getMyCompletions);

// Get employer's completed gigs
router.get('/employer/completed', protect, authorize('employer'), gigCompletionController.getEmployerCompletedGigs);

// Initialize a gig completion record
router.post('/initialize', gigCompletionController.initializeGigCompletion);

// Update worker's time slots
router.put('/:id/worker/:workerId', gigCompletionController.updateWorkerTimeSlots);

// Update worker's performance evaluation
router.put('/:id/worker/:workerId/performance', gigCompletionController.updateWorkerPerformance);

// Process payment for a gig (creates Stripe payment intent)
router.post('/:id/process-payment', gigCompletionController.processPayment);

// Confirm payment and distribute funds to workers
router.post('/:id/confirm-payment', gigCompletionController.confirmPayment);

// Stripe Connect account management for workers
router.post('/create-worker-account', gigCompletionController.createWorkerStripeAccount);
router.post('/create-onboarding-link', gigCompletionController.createOnboardingLink);
router.get('/worker-account-status/:userId', gigCompletionController.checkWorkerAccountStatus);

// Mark gig as completed
router.put('/:id/complete', gigCompletionController.completeGig);

// Recalculate payments for a gig completion
router.post('/:id/recalculate-payments', protect, gigCompletionController.recalculatePayments);

// Admin endpoint to fix zero payment amounts
router.post('/admin/fix-zero-payments', protect, authorize('admin'), gigCompletionController.fixZeroPayments);

// Get all gig completions (with optional filters)
router.get('/', gigCompletionController.getAllGigCompletions);

// Get gig completion by ID
router.get('/:id', gigCompletionController.getGigCompletionById);

// Get gig completions for a specific worker
router.get('/worker/:workerId', gigCompletionController.getWorkerGigCompletions);

// Get workers available for rating for a specific gig completion
router.get('/:gigCompletionId/workers-for-rating', gigCompletionController.getWorkersForRating);

module.exports = router;
