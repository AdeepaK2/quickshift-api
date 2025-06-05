const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect, authorize, adminOnly } = require('../middleware/auth');

// Protect all notification routes
router.use(protect);

// User notification preferences
router.get('/preferences', authorize(['user']), notificationController.getNotificationPreferences);
router.put('/preferences', authorize(['user']), notificationController.updateNotificationPreferences);

// Job recommendations
router.get('/recommendations', authorize(['user']), notificationController.getJobRecommendations);
router.post('/send-recommendations', authorize(['user']), notificationController.sendJobRecommendations);

// Admin testing routes
router.post('/test-job-alert', adminOnly, notificationController.testJobAlert);

// Public unsubscribe route (no auth required)
router.get('/unsubscribe/:token', notificationController.unsubscribeFromNotifications);

module.exports = router;
