const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');
const { protect } = require('../middleware/auth');

// Protected routes for authenticated employers
// Get employer stats/dashboard data
router.get('/stats', protect, employerController.getEmployerStats);

// Upload employer logo
router.post('/logo', protect, employerController.uploadLogo);

// Payment methods
router.get('/payment-methods', protect, employerController.getPaymentMethods);
router.post('/payment-methods', protect, employerController.addPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', protect, employerController.deletePaymentMethod);

// Payments and financial data
router.get('/payments', protect, employerController.getPaymentHistory);
router.get('/financial-overview', protect, employerController.getFinancialOverview);

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