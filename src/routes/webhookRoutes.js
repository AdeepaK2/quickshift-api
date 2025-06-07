const express = require('express');
const stripeWebhookController = require('../controllers/stripeWebhookController');
const router = express.Router();

// Stripe webhook handler
// Note: This route should use raw body parsing, not JSON
router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhookController.handleStripeWebhook);

module.exports = router;
