const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Protect all admin routes
router.use(protect);
router.use(authorize('admin', 'super_admin'));

// Admin management routes
router.post('/', authorize('super_admin'), adminController.createAdmin);
router.get('/', adminController.getAllAdmins);
router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsersForAdmin);
router.get('/employers', adminController.getAllEmployersForAdmin);
router.get('/:id', adminController.getAdminById);
router.patch('/:id', adminController.updateAdmin);
router.delete('/:id', authorize('super_admin'), adminController.deleteAdmin);

module.exports = router;
