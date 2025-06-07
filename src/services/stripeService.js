const Stripe = require('stripe');

class StripeService {
    constructor() {
        // Check if we're in test environment or if API key is missing
        if (process.env.NODE_ENV === 'test' && !process.env.STRIPE_SECRET_KEY) {
            // Create a mock Stripe instance for testing
            this.stripe = this.createMockStripe();
            this.isMocked = true;
        } else if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY environment variable is required');
        } else {
            this.stripe = Stripe(process.env.STRIPE_SECRET_KEY);
            this.isMocked = false;
        }
    }

    createMockStripe() {
        return {
            paymentIntents: {
                create: () => Promise.resolve({
                    id: 'pi_mock_payment_intent',
                    client_secret: 'pi_mock_payment_intent_secret_mock',
                    status: 'requires_payment_method'
                }),
                confirm: () => Promise.resolve({
                    id: 'pi_mock_payment_intent',
                    status: 'succeeded'
                }),
                retrieve: () => Promise.resolve({
                    id: 'pi_mock_payment_intent',
                    status: 'succeeded'
                })
            },
            accounts: {
                create: () => Promise.resolve({
                    id: 'acct_mock_account',
                    type: 'express',
                    charges_enabled: false,
                    payouts_enabled: false
                }),
                retrieve: () => Promise.resolve({
                    id: 'acct_mock_account',
                    charges_enabled: true,
                    payouts_enabled: true
                })
            },
            accountLinks: {
                create: () => Promise.resolve({
                    object: 'account_link',
                    created: Date.now(),
                    expires_at: Date.now() + 3600,
                    url: 'https://connect.stripe.com/express/mock_link'
                })
            },
            transfers: {
                create: () => Promise.resolve({
                    id: 'tr_mock_transfer',
                    amount: 1000,
                    currency: 'usd',
                    destination: 'acct_mock_account'
                })
            },
            refunds: {
                create: () => Promise.resolve({
                    id: 're_mock_refund',
                    amount: 1000,
                    currency: 'usd',
                    status: 'succeeded'
                })
            },
            webhooks: {
                constructEvent: () => ({
                    id: 'evt_mock_event',
                    type: 'payment_intent.succeeded',
                    data: { object: { id: 'pi_mock_payment_intent' } }
                })
            }
        };
    }

    /**
     * Create a payment intent for employer to pay for completed gig
     * @param {Object} paymentData - Payment information
     * @param {number} paymentData.amount - Amount in cents
     * @param {string} paymentData.currency - Currency code (default: 'usd')
     * @param {string} paymentData.gigCompletionId - Gig completion ID
     * @param {string} paymentData.employerId - Employer ID
     * @param {Object} paymentData.metadata - Additional metadata
     * @returns {Promise<Object>} Payment intent object
     */
    async createPaymentIntent(paymentData) {
        try {
            const { amount, currency = 'usd', gigCompletionId, employerId, metadata = {} } = paymentData;

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency,
                automatic_payment_methods: {
                    enabled: true,
                },
                metadata: {
                    gigCompletionId,
                    employerId,
                    ...metadata
                },
                description: `Payment for QuickShift gig completion ${gigCompletionId}`
            });

            return {
                success: true,
                paymentIntent,
                clientSecret: paymentIntent.client_secret
            };
        } catch (error) {
            console.error('Error creating payment intent:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Confirm a payment intent
     * @param {string} paymentIntentId - Payment intent ID
     * @returns {Promise<Object>} Confirmation result
     */
    async confirmPaymentIntent(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
            return {
                success: true,
                paymentIntent
            };
        } catch (error) {
            console.error('Error confirming payment intent:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Retrieve a payment intent
     * @param {string} paymentIntentId - Payment intent ID
     * @returns {Promise<Object>} Payment intent object
     */
    async getPaymentIntent(paymentIntentId) {
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            return {
                success: true,
                paymentIntent
            };
        } catch (error) {
            console.error('Error retrieving payment intent:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create a Stripe Connect account for a worker to receive payments
     * @param {Object} workerData - Worker information
     * @param {string} workerData.email - Worker email
     * @param {string} workerData.country - Worker country code
     * @param {Object} workerData.individual - Individual information
     * @returns {Promise<Object>} Account creation result
     */
    async createConnectAccount(workerData) {
        try {
            const { email, country = 'US', individual = {} } = workerData;

            const account = await this.stripe.accounts.create({
                type: 'express',
                country,
                email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true }
                },
                business_type: 'individual',
                individual
            });

            return {
                success: true,
                account
            };
        } catch (error) {
            console.error('Error creating Connect account:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create account link for onboarding
     * @param {string} accountId - Stripe account ID
     * @param {string} refreshUrl - URL to redirect if refresh is needed
     * @param {string} returnUrl - URL to redirect after completion
     * @returns {Promise<Object>} Account link object
     */
    async createAccountLink(accountId, refreshUrl, returnUrl) {
        try {
            const accountLink = await this.stripe.accountLinks.create({
                account: accountId,
                refresh_url: refreshUrl,
                return_url: returnUrl,
                type: 'account_onboarding'
            });

            return {
                success: true,
                accountLink
            };
        } catch (error) {
            console.error('Error creating account link:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Transfer funds to worker's Stripe Connect account
     * @param {Object} transferData - Transfer information
     * @param {number} transferData.amount - Amount in dollars
     * @param {string} transferData.destination - Stripe account ID
     * @param {string} transferData.transferGroup - Transfer group ID
     * @param {Object} transferData.metadata - Additional metadata
     * @returns {Promise<Object>} Transfer result
     */
    async transferToWorker(transferData) {
        try {
            const { amount, destination, transferGroup, metadata = {} } = transferData;

            const transfer = await this.stripe.transfers.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency: 'usd',
                destination,
                transfer_group: transferGroup,
                metadata
            });

            return {
                success: true,
                transfer
            };
        } catch (error) {
            console.error('Error transferring to worker:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process payment distribution to multiple workers
     * @param {Object} distributionData - Distribution information
     * @param {string} distributionData.paymentIntentId - Source payment intent ID
     * @param {Array} distributionData.workers - Array of worker payment info
     * @param {string} distributionData.gigCompletionId - Gig completion ID
     * @returns {Promise<Object>} Distribution result
     */
    async distributePayment(distributionData) {
        try {
            const { paymentIntentId, workers, gigCompletionId } = distributionData;
            const transfers = [];
            const errors = [];

            // Create transfers for each worker
            for (const worker of workers) {
                if (!worker.stripeAccountId) {
                    errors.push({
                        workerId: worker.workerId,
                        error: 'No Stripe account ID found for worker'
                    });
                    continue;
                }

                const transferResult = await this.transferToWorker({
                    amount: worker.amount,
                    destination: worker.stripeAccountId,
                    transferGroup: gigCompletionId,
                    metadata: {
                        workerId: worker.workerId,
                        gigCompletionId,
                        paymentIntentId
                    }
                });

                if (transferResult.success) {
                    transfers.push({
                        workerId: worker.workerId,
                        transfer: transferResult.transfer
                    });
                } else {
                    errors.push({
                        workerId: worker.workerId,
                        error: transferResult.error
                    });
                }
            }

            return {
                success: errors.length === 0,
                transfers,
                errors,
                totalTransfers: transfers.length,
                totalErrors: errors.length
            };
        } catch (error) {
            console.error('Error distributing payment:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Create a refund for a payment intent
     * @param {Object} refundData - Refund information
     * @param {string} refundData.paymentIntentId - Payment intent ID
     * @param {number} refundData.amount - Amount to refund in dollars (optional, full refund if not specified)
     * @param {string} refundData.reason - Reason for refund
     * @param {Object} refundData.metadata - Additional metadata
     * @returns {Promise<Object>} Refund result
     */
    async createRefund(refundData) {
        try {
            const { paymentIntentId, amount, reason, metadata = {} } = refundData;

            const refundOptions = {
                payment_intent: paymentIntentId,
                reason: reason || 'requested_by_customer',
                metadata
            };

            if (amount) {
                refundOptions.amount = Math.round(amount * 100); // Convert to cents
            }

            const refund = await this.stripe.refunds.create(refundOptions);

            return {
                success: true,
                refund
            };
        } catch (error) {
            console.error('Error creating refund:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify webhook signature
     * @param {string} payload - Raw request body
     * @param {string} signature - Stripe signature header
     * @returns {Object} Verified event object or null
     */
    verifyWebhookSignature(payload, signature) {
        try {
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
            return event;
        } catch (error) {
            console.error('Webhook signature verification failed:', error);
            return null;
        }
    }

    /**
     * Get account details
     * @param {string} accountId - Stripe account ID
     * @returns {Promise<Object>} Account details
     */
    async getAccountDetails(accountId) {
        try {
            const account = await this.stripe.accounts.retrieve(accountId);
            return {
                success: true,
                account
            };
        } catch (error) {
            console.error('Error retrieving account details:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = new StripeService();
