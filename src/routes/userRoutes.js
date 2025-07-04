const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes for authenticated users (must come before /:id route)
// Get user profile stats/dashboard data
router.get('/stats', protect, userController.getUserStats);

// Upload profile picture
router.post('/profile-picture', protect, userController.uploadProfilePicture);

// Upload documents (student ID, etc.)
router.post('/documents', protect, userController.uploadDocument);

// Admin only routes for user management
router.patch('/:id/activate', protect, authorize('admin', 'super_admin'), userController.activateUser);
router.patch('/:id/deactivate', protect, authorize('admin', 'super_admin'), userController.deactivateUser);

// GET all users
router.get('/', userController.getAllUsers);

// GET a single user by ID
router.get('/:id', userController.getUserById);

// POST create a new user
router.post('/', userController.createUser);

// PATCH/PUT update a user
router.patch('/:id', userController.updateUser);

// DELETE a user
router.delete('/:id', userController.deleteUser);

module.exports = router;