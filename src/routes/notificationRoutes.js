const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
// const { protect, authorize, adminOnly } = require('../middleware/auth'); // Commented out for testing

// Remove auth protection for testing
// router.use(protect);

// User notification preferences
router.get('/preferences', notificationController.getNotificationPreferences); // removed authorize(['user'])
router.put('/preferences', notificationController.updateNotificationPreferences); // removed authorize(['user'])

// Job recommendations
router.get('/recommendations', notificationController.getJobRecommendations); // removed authorize(['user'])
router.post('/send-recommendations', notificationController.sendJobRecommendations); // removed authorize(['user'])

// Admin testing routes
router.post('/test-job-alert', notificationController.testJobAlert); // removed adminOnly

// Public unsubscribe route (no auth required)
router.get('/unsubscribe/:token', notificationController.unsubscribeFromNotifications);

module.exports = router;
