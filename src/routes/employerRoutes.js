const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');
const gigRequestController = require('../controllers/gigRequestController');
const gigApplyController = require('../controllers/gigApplyController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes for authenticated employers
// Get employer stats/dashboard data
router.get('/stats', protect, authorize('employer'), employerController.getEmployerStats);

// Employer's job management routes
router.get('/jobs', protect, authorize('employer'), gigRequestController.getEmployerJobs);
router.post('/jobs', protect, authorize('employer'), gigRequestController.createGigRequest);
router.get('/jobs/:id', protect, authorize('employer'), gigRequestController.getEmployerJobById);
router.patch('/jobs/:id', protect, authorize('employer'), gigRequestController.updateEmployerJob);
router.delete('/jobs/:id', protect, authorize('employer'), gigRequestController.deleteEmployerJob);
router.patch('/jobs/:id/status', protect, authorize('employer'), gigRequestController.updateGigRequestStatus);
router.patch('/jobs/:id/start', protect, authorize('employer'), gigRequestController.startJob);
router.patch('/jobs/:id/complete', protect, authorize('employer'), gigRequestController.completeJob);

// Application management for employers
router.get('/applications', protect, authorize('employer'), gigApplyController.getEmployerApplications);
router.get('/applications/:id', protect, authorize('employer'), gigApplyController.getApplicationByIdForEmployer);
router.patch('/applications/:id/accept', protect, authorize('employer'), gigApplyController.acceptApplication);
router.patch('/applications/:id/reject', protect, authorize('employer'), gigApplyController.rejectApplication);
router.patch('/applications/:id/status', protect, authorize('employer'), gigApplyController.updateApplicationStatusByEmployer);

// Upload employer logo
router.post('/logo', protect, authorize('employer'), employerController.uploadLogo);

// Payment methods
router.get('/payment-methods', protect, authorize('employer'), employerController.getPaymentMethods);
router.post('/payment-methods', protect, authorize('employer'), employerController.addPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', protect, authorize('employer'), employerController.deletePaymentMethod);

// Payments and financial data
router.get('/payments', protect, authorize('employer'), employerController.getPaymentHistory);
router.get('/financial-overview', protect, authorize('employer'), employerController.getFinancialOverview);

// GET all employers
router.get('/', employerController.getAllEmployers);

// POST create a new employer
router.post('/', employerController.createEmployer);

// GET a single employer by ID
router.get('/:id', employerController.getEmployerById);

// PATCH/PUT update an employer
router.patch('/:id', employerController.updateEmployer);

// DELETE an employer
router.delete('/:id', employerController.deleteEmployer);

module.exports = router;