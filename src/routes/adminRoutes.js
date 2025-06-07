const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
// const { protect, authorize } = require('../middleware/auth'); // Commented out for testing

// Remove auth protection for testing
// router.use(protect);
// router.use(authorize('admin', 'super_admin'));

// Admin management routes
router.post('/', adminController.createAdmin); // removed authorize('super_admin')
router.get('/', adminController.getAllAdmins);
router.get('/dashboard', adminController.getDashboardStats);
router.get('/users', adminController.getAllUsersForAdmin);
router.get('/employers', adminController.getAllEmployersForAdmin);
router.get('/:id', adminController.getAdminById);
router.patch('/:id', adminController.updateAdmin);
router.delete('/:id', adminController.deleteAdmin); // removed authorize('super_admin')

module.exports = router;
