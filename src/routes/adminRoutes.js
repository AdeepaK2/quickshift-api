const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Apply protection and authorization to all admin routes
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// Admin management routes
router.post('/', adminController.createAdmin); // Only super_admin checked in controller
router.get('/', adminController.getAllAdmins);
router.get('/profile', adminController.getCurrentAdminProfile); // Get current admin profile
router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsersForAdmin);
router.get('/employers', adminController.getAllEmployersForAdmin);

// Platform settings routes
router.get('/settings/platform', adminController.getPlatformSettings);
router.patch('/settings/platform', adminController.updatePlatformSettings);
router.patch('/:id/two-factor', adminController.toggleTwoFactorAuth);

// Admin user routes
router.get('/:id', adminController.getAdminById);
router.patch('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin); // Only super_admin checked in controller

module.exports = router;
