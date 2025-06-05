const stripeService = require('../services/stripeService');
const GigCompletion = require('../models/gigCompletion');
const User = require('../models/user');

/**
 * Handle Stripe webhook events
 * POST /api/webhooks/stripe
 */
exports.handleStripeWebhook = async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(payload, signature);
    
    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook signature'
      });
    }

    console.log(`Received Stripe webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object);
        break;

      case 'transfer.paid':
        await handleTransferPaid(event.data.object);
        break;

      case 'transfer.failed':
        await handleTransferFailed(event.data.object);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;

      case 'account.application.authorized':
        await handleAccountAuthorized(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
};

/**
 * Handle payment intent succeeded event
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const gigCompletionId = paymentIntent.metadata.gigCompletionId;
    
    if (!gigCompletionId) {
      console.log('No gig completion ID in payment intent metadata');
      return;
    }

    const gigCompletion = await GigCompletion.findById(gigCompletionId);
    if (!gigCompletion) {
      console.log(`Gig completion not found for ID: ${gigCompletionId}`);
      return;
    }

    // Update payment status
    gigCompletion.paymentSummary.stripe.paymentIntentStatus = 'succeeded';
    gigCompletion.paymentSummary.stripe.chargeId = paymentIntent.latest_charge;
    gigCompletion.paymentSummary.stripe.paymentDate = new Date();
    gigCompletion.paymentSummary.paymentStatus = 'completed';

    await gigCompletion.save();

    console.log(`Payment succeeded for gig completion: ${gigCompletionId}`);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
  }
}

/**
 * Handle payment intent failed event
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const gigCompletionId = paymentIntent.metadata.gigCompletionId;
    
    if (!gigCompletionId) {
      console.log('No gig completion ID in payment intent metadata');
      return;
    }

    const gigCompletion = await GigCompletion.findById(gigCompletionId);
    if (!gigCompletion) {
      console.log(`Gig completion not found for ID: ${gigCompletionId}`);
      return;
    }

    // Update payment status to failed
    gigCompletion.paymentSummary.stripe.paymentIntentStatus = 'payment_failed';
    gigCompletion.paymentSummary.paymentStatus = 'failed';

    // Update all worker payment statuses
    gigCompletion.workers.forEach(worker => {
      worker.payment.status = 'failed';
    });

    await gigCompletion.save();

    console.log(`Payment failed for gig completion: ${gigCompletionId}`);
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
  }
}

/**
 * Handle transfer created event
 */
async function handleTransferCreated(transfer) {
  try {
    const gigCompletionId = transfer.metadata.gigCompletionId;
    const workerId = transfer.metadata.workerId;

    if (!gigCompletionId || !workerId) {
      console.log('Missing gig completion ID or worker ID in transfer metadata');
      return;
    }

    const gigCompletion = await GigCompletion.findById(gigCompletionId);
    if (!gigCompletion) {
      console.log(`Gig completion not found for ID: ${gigCompletionId}`);
      return;
    }

    // Find the worker and update transfer information
    const worker = gigCompletion.workers.find(w => 
      w.worker.toString() === workerId
    );

    if (worker) {
      worker.payment.stripe = {
        transferId: transfer.id,
        transferStatus: 'pending',
        transferDate: new Date(),
        accountId: transfer.destination
      };
      await gigCompletion.save();
    }

    console.log(`Transfer created for worker ${workerId}: ${transfer.id}`);
  } catch (error) {
    console.error('Error handling transfer created:', error);
  }
}

/**
 * Handle transfer paid event
 */
async function handleTransferPaid(transfer) {
  try {
    const gigCompletionId = transfer.metadata.gigCompletionId;
    const workerId = transfer.metadata.workerId;

    if (!gigCompletionId || !workerId) {
      console.log('Missing gig completion ID or worker ID in transfer metadata');
      return;
    }

    const gigCompletion = await GigCompletion.findById(gigCompletionId);
    if (!gigCompletion) {
      console.log(`Gig completion not found for ID: ${gigCompletionId}`);
      return;
    }

    // Find the worker and update payment status
    const worker = gigCompletion.workers.find(w => 
      w.worker.toString() === workerId
    );

    if (worker) {
      worker.payment.status = 'paid';
      worker.payment.paymentDate = new Date();
      if (worker.payment.stripe) {
        worker.payment.stripe.transferStatus = 'paid';
        worker.payment.stripe.transferDate = new Date();
      }
      await gigCompletion.save();

      // Update worker employment stats
      await User.findByIdAndUpdate(workerId, {
        $inc: {
          'employmentStats.totalGigsCompleted': 1,
          'employmentStats.totalEarnings': worker.payment.amount
        }
      });
    }

    console.log(`Transfer paid for worker ${workerId}: ${transfer.id}`);
  } catch (error) {
    console.error('Error handling transfer paid:', error);
  }
}

/**
 * Handle transfer failed event
 */
async function handleTransferFailed(transfer) {
  try {
    const gigCompletionId = transfer.metadata.gigCompletionId;
    const workerId = transfer.metadata.workerId;

    if (!gigCompletionId || !workerId) {
      console.log('Missing gig completion ID or worker ID in transfer metadata');
      return;
    }

    const gigCompletion = await GigCompletion.findById(gigCompletionId);
    if (!gigCompletion) {
      console.log(`Gig completion not found for ID: ${gigCompletionId}`);
      return;
    }

    // Find the worker and update payment status
    const worker = gigCompletion.workers.find(w => 
      w.worker.toString() === workerId
    );

    if (worker) {
      worker.payment.status = 'failed';
      if (worker.payment.stripe) {
        worker.payment.stripe.transferStatus = 'failed';
      }
      await gigCompletion.save();
    }

    console.log(`Transfer failed for worker ${workerId}: ${transfer.id}`);
  } catch (error) {
    console.error('Error handling transfer failed:', error);
  }
}

/**
 * Handle account updated event
 */
async function handleAccountUpdated(account) {
  try {
    // Find user with this Stripe account ID
    const user = await User.findOne({ 'stripe.accountId': account.id });
    
    if (!user) {
      console.log(`User not found for Stripe account: ${account.id}`);
      return;
    }

    // Update user Stripe information
    user.stripe.chargesEnabled = account.charges_enabled;
    user.stripe.payoutsEnabled = account.payouts_enabled;
    user.stripe.onboardingCompleted = account.details_submitted;
    user.stripe.accountStatus = account.charges_enabled && account.payouts_enabled ? 'enabled' : 'pending';
    user.stripe.lastOnboardingUpdate = new Date();

    await user.save();

    console.log(`Account updated for user ${user._id}: ${account.id}`);
  } catch (error) {
    console.error('Error handling account updated:', error);
  }
}

/**
 * Handle account authorized event
 */
async function handleAccountAuthorized(account) {
  try {
    // Find user with this Stripe account ID
    const user = await User.findOne({ 'stripe.accountId': account.id });
    
    if (!user) {
      console.log(`User not found for Stripe account: ${account.id}`);
      return;
    }

    // Update user Stripe information
    user.stripe.onboardingCompleted = true;
    user.stripe.accountStatus = 'enabled';
    user.stripe.chargesEnabled = true;
    user.stripe.payoutsEnabled = true;
    user.stripe.lastOnboardingUpdate = new Date();

    await user.save();

    console.log(`Account authorized for user ${user._id}: ${account.id}`);
  } catch (error) {
    console.error('Error handling account authorized:', error);
  }
}

module.exports = {
  handleStripeWebhook
};
