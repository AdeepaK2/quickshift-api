const GigCompletion = require('../models/gigCompletion');
const GigRequest = require('../models/gigRequest');
const GigApply = require('../models/gigApply');
const User = require('../models/user');
const Employer = require('../models/employer');
const stripeService = require('../services/stripeService');
const mongoose = require('mongoose');

/**
 * Initialize a gig completion record when a gig starts
 * POST /api/gig-completions/initialize
 */
exports.initializeGigCompletion = async (req, res) => {
  try {
    const { gigRequestId } = req.body;

    // Validate gigRequestId
    if (!mongoose.Types.ObjectId.isValid(gigRequestId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig request ID'
      });
    }

    // Check if gig request exists and get details
    const gigRequest = await GigRequest.findById(gigRequestId);
    if (!gigRequest) {
      return res.status(404).json({
        success: false,
        message: 'Gig request not found'
      });
    }

    // Check if the gig is in the right status to be initialized for completion
    if (gigRequest.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Gig must be in progress to initialize completion'
      });
    }

    // Check if a completion record already exists
    const existingCompletion = await GigCompletion.findOne({ gigRequest: gigRequestId });
    if (existingCompletion) {
      return res.status(400).json({
        success: false,
        message: 'Completion record already exists for this gig'
      });
    }

    // Find all hired applicants for this gig
    const hiredApplications = await GigApply.find({
      gigRequest: gigRequestId,
      status: 'hired'
    }).populate('user');

    if (hiredApplications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hired workers found for this gig'
      });
    }

    // Create worker entries from hired applications
    const workers = hiredApplications.map(application => {
      // Map time slots from application to completion format
      const completedTimeSlots = application.timeSlots.map(slot => ({
        timeSlotId: slot.timeSlotId,
        date: slot.date,
        actualStartTime: slot.startTime, // Initialize with planned times
        actualEndTime: slot.endTime,     // These will be updated later
        hoursWorked: (new Date(slot.endTime) - new Date(slot.startTime)) / (1000 * 60 * 60),
        breakTime: 0
      }));

      // Determine rate and rate type from the gig request
      const baseRate = gigRequest.payRate.amount;
      const rateType = gigRequest.payRate.rateType;
      
      // Initialize with zero amount, will be calculated later
      return {
        worker: application.user._id,
        application: application._id,
        completedTimeSlots,
        payment: {
          status: 'pending',
          amount: 0, // Will be calculated later
          calculationDetails: {
            baseRate,
            rateType,
            totalHours: 0, // Will be calculated later
            overtimeHours: 0,
            overtimeRate: baseRate * 1.5, // Assuming overtime is 1.5x base rate
          }
        }
      };
    });

    // Create the gig completion record
    const gigCompletion = new GigCompletion({
      gigRequest: gigRequestId,
      employer: gigRequest.employer,
      status: 'in_progress',
      workers,
      paymentSummary: {
        totalAmount: 0, // Will be calculated by pre-save hook
        finalAmount: 0  // Will be calculated by pre-save hook
      }
    });

    // Calculate payment for each worker
    workers.forEach(worker => {
      gigCompletion.calculateWorkerPayment(worker.worker);
    });

    await gigCompletion.save();

    // Update gig request status if needed
    if (gigRequest.status !== 'in_progress') {
      await GigRequest.findByIdAndUpdate(gigRequestId, {
        status: 'in_progress'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Gig completion record initialized successfully',
      data: gigCompletion
    });
  } catch (error) {
    console.error('Error initializing gig completion:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing gig completion',
      error: error.message
    });
  }
};

/**
 * Update worker's completed time slots
 * PUT /api/gig-completions/:id/worker/:workerId
 */
exports.updateWorkerTimeSlots = async (req, res) => {
  try {
    const { id, workerId } = req.params;
    const { completedTimeSlots } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completion ID or worker ID'
      });
    }

    // Find the completion record
    const gigCompletion = await GigCompletion.findById(id);
    if (!gigCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Gig completion record not found'
      });
    }

    // Find the worker in the record
    const workerIndex = gigCompletion.workers.findIndex(
      worker => worker.worker.toString() === workerId
    );

    if (workerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found in this gig completion record'
      });
    }

    // Update time slots
    gigCompletion.workers[workerIndex].completedTimeSlots = completedTimeSlots;
    
    // Recalculate payment
    gigCompletion.calculateWorkerPayment(workerId);
    
    await gigCompletion.save();

    res.status(200).json({
      success: true,
      message: 'Worker time slots updated successfully',
      data: gigCompletion.workers[workerIndex]
    });
  } catch (error) {
    console.error('Error updating worker time slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating worker time slots',
      error: error.message
    });
  }
};

/**
 * Update worker's performance evaluation
 * PUT /api/gig-completions/:id/worker/:workerId/performance
 */
exports.updateWorkerPerformance = async (req, res) => {
  try {
    const { id, workerId } = req.params;
    const { rating, feedback, punctuality, quality, professionalism } = req.body;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completion ID or worker ID'
      });
    }

    // Find the completion record
    const gigCompletion = await GigCompletion.findById(id);
    if (!gigCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Gig completion record not found'
      });
    }

    // Find the worker in the record
    const workerIndex = gigCompletion.workers.findIndex(
      worker => worker.worker.toString() === workerId
    );

    if (workerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found in this gig completion record'
      });
    }

    // Update performance evaluation
    gigCompletion.workers[workerIndex].performance = {
      rating,
      feedback,
      punctuality,
      quality,
      professionalism
    };
    
    await gigCompletion.save();

    res.status(200).json({
      success: true,
      message: 'Worker performance evaluation updated successfully',
      data: gigCompletion.workers[workerIndex]
    });
  } catch (error) {
    console.error('Error updating worker performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating worker performance',
      error: error.message
    });
  }
};

/**
 * Process payment for a gig
 * POST /api/gig-completions/:id/process-payment
 */
/**
 * Process payment for a completed gig using Stripe
 * POST /api/gig-completions/:id/process-payment
 */
exports.processPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, notes } = req.body;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completion ID'
      });
    }

    // Find the completion record with populated references
    const gigCompletion = await GigCompletion.findById(id)
      .populate('employer')
      .populate('workers.worker');
      
    if (!gigCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Gig completion record not found'
      });
    }

    // Check if gig is ready for payment
    if (gigCompletion.status !== 'completed' && gigCompletion.status !== 'partially_completed') {
      return res.status(400).json({
        success: false,
        message: 'Gig must be completed before processing payment'
      });
    }

    // Check if payment already exists
    if (gigCompletion.paymentSummary.stripe?.paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment already initiated for this gig completion'
      });
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create Stripe payment intent for the employer to pay
    const paymentIntentData = {
      amount: gigCompletion.paymentSummary.finalAmount,
      currency: 'usd',
      gigCompletionId: id,
      employerId: gigCompletion.employer._id.toString(),
      metadata: {
        invoiceNumber,
        totalWorkers: gigCompletion.workers.length,
        gigTitle: gigCompletion.gigRequest?.title || 'QuickShift Gig'
      }
    };

    const paymentResult = await stripeService.createPaymentIntent(paymentIntentData);

    if (!paymentResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment intent',
        error: paymentResult.error
      });
    }

    // Update payment summary with Stripe information
    gigCompletion.paymentSummary.paymentStatus = 'processing';
    gigCompletion.paymentSummary.invoiceNumber = invoiceNumber;
    gigCompletion.paymentSummary.invoiceDate = new Date();
    gigCompletion.paymentSummary.stripe = {
      paymentIntentId: paymentResult.paymentIntent.id,
      paymentIntentStatus: paymentResult.paymentIntent.status,
      clientSecret: paymentResult.clientSecret
    };

    // Update worker payment statuses
    gigCompletion.workers.forEach(worker => {
      worker.payment.status = 'processing';
      worker.payment.paymentMethod = paymentMethod;
      worker.payment.transactionId = `PI-${paymentResult.paymentIntent.id}-${worker._id.toString().substring(0, 5)}`;
    });
    
    // Add notes if provided
    if (notes) {
      gigCompletion.documentation.notes = notes;
    }
    
    await gigCompletion.save();

    res.status(200).json({
      success: true,
      message: 'Payment intent created successfully. Please complete payment using the client secret.',
      data: {
        invoiceNumber: gigCompletion.paymentSummary.invoiceNumber,
        totalAmount: gigCompletion.paymentSummary.totalAmount,
        finalAmount: gigCompletion.paymentSummary.finalAmount,
        clientSecret: paymentResult.clientSecret,
        paymentIntentId: paymentResult.paymentIntent.id,
        status: 'processing'
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment',
      error: error.message
    });
  }
};

/**
 * Mark gig as completed
 * PUT /api/gig-completions/:id/complete
 */
exports.completeGig = async (req, res) => {
  try {
    const { id } = req.params;
    const { completionProof, notes } = req.body;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completion ID'
      });
    }

    // Find the completion record
    const gigCompletion = await GigCompletion.findById(id).populate('gigRequest');
    if (!gigCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Gig completion record not found'
      });
    }

    // Check for required worker data
    const incompleteWorkers = gigCompletion.workers.filter(
      worker => !worker.completedTimeSlots || worker.completedTimeSlots.length === 0
    );

    if (incompleteWorkers.length > 0) {
      // If some workers are incomplete, mark as partially completed
      gigCompletion.status = 'partially_completed';
    } else {
      gigCompletion.status = 'completed';
    }

    // Recalculate all worker payments before marking as completed
    gigCompletion.workers.forEach(worker => {
      // Ensure the worker has proper payment calculation details
      if (!worker.payment.calculationDetails.baseRate && gigCompletion.gigRequest.payRate) {
        worker.payment.calculationDetails.baseRate = gigCompletion.gigRequest.payRate.amount;
        worker.payment.calculationDetails.rateType = gigCompletion.gigRequest.payRate.rateType;
        worker.payment.calculationDetails.overtimeRate = gigCompletion.gigRequest.payRate.amount * 1.5;
      }
      
      // If worker has no completed time slots, use default hours based on original job posting
      if (!worker.completedTimeSlots || worker.completedTimeSlots.length === 0) {
        const baseRate = worker.payment.calculationDetails.baseRate;
        const rateType = worker.payment.calculationDetails.rateType;
        
        if (rateType === 'fixed') {
          worker.payment.amount = baseRate;
        } else if (rateType === 'hourly') {
          // Default to 8 hours if no time slots are specified
          worker.payment.amount = baseRate * 8;
          worker.payment.calculationDetails.totalHours = 8;
        } else if (rateType === 'daily') {
          worker.payment.amount = baseRate;
        }
      } else {
        // Calculate based on actual time slots
        gigCompletion.calculateWorkerPayment(worker.worker);
      }
    });

    // Update completion details
    gigCompletion.completedAt = new Date();
    
    if (completionProof && Array.isArray(completionProof)) {
      gigCompletion.documentation.completionProof = completionProof;
    }
    
    if (notes) {
      gigCompletion.documentation.notes = notes;
    }
    
    await gigCompletion.save();

    // Update associated gig request status
    await GigRequest.findByIdAndUpdate(
      gigCompletion.gigRequest,
      {
        status: 'completed'
      }
    );

    res.status(200).json({
      success: true,
      message: 'Gig marked as completed successfully',
      data: {
        status: gigCompletion.status,
        completedAt: gigCompletion.completedAt,
        paymentSummary: gigCompletion.paymentSummary
      }
    });
  } catch (error) {
    console.error('Error completing gig:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing gig',
      error: error.message
    });
  }
};

/**
 * Get all gig completions
 * GET /api/gig-completions
 */
exports.getAllGigCompletions = async (req, res) => {
  try {
    const { status, employerId, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (employerId && mongoose.Types.ObjectId.isValid(employerId)) {
      query.employer = employerId;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find gig completions
    const completions = await GigCompletion.find(query)
      .populate('gigRequest', 'title category')
      .populate('employer', 'companyName')
      .select('status paymentSummary completedAt createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Count total
    const total = await GigCompletion.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: completions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching gig completions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gig completions',
      error: error.message
    });
  }
};

/**
 * Get gig completion by ID
 * GET /api/gig-completions/:id
 */
exports.getGigCompletionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completion ID'
      });
    }

    // Find the completion record with populated references
    const gigCompletion = await GigCompletion.findById(id)
      .populate('gigRequest')
      .populate('employer', 'companyName email phone')
      .populate('workers.worker', 'firstName lastName email phone')
      .populate('workers.application');
    
    if (!gigCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Gig completion record not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: gigCompletion
    });
  } catch (error) {
    console.error('Error fetching gig completion:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching gig completion',
      error: error.message
    });
  }
};

/**
 * Get gig completions for a specific worker
 * GET /api/gig-completions/worker/:workerId
 */
exports.getWorkerGigCompletions = async (req, res) => {
  try {
    const { workerId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Validate worker ID
    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid worker ID'
      });
    }
    
    // Build query to find completions that include this worker
    const query = { 'workers.worker': workerId };
    if (status) query.status = status;
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Find gig completions for this worker
    const completions = await GigCompletion.find(query)
      .populate('gigRequest', 'title category')
      .populate('employer', 'companyName')
      .select('status workers.$ paymentSummary completedAt createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Count total
    const total = await GigCompletion.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: completions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching worker gig completions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching worker gig completions',
      error: error.message
    });
  }
};

/**
 * Get workers available for rating for a specific gig completion
 * GET /api/gig-completions/:gigCompletionId/workers-for-rating
 */
exports.getWorkersForRating = async (req, res) => {
  try {
    const { gigCompletionId } = req.params;

    // Validate gigCompletionId
    if (!mongoose.Types.ObjectId.isValid(gigCompletionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gig completion ID'
      });
    }

    // Find the gig completion record
    const gigCompletion = await GigCompletion.findById(gigCompletionId)
      .populate('workers.worker', 'firstName lastName profilePicture email averageRating')
      .populate('gigRequest', 'title');

    if (!gigCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Gig completion not found'
      });
    }

    // Check if the employer is authorized to view this gig completion
    if (req.userType === 'employer' && gigCompletion.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this gig completion'
      });
    }

    // Check if gig is completed or verified
    if (gigCompletion.status !== 'completed' && gigCompletion.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Can only rate workers for completed gigs'
      });
    }

    // Get existing ratings to check which workers have already been rated
    const Rating = require('../models/rating');
    const existingRatings = await Rating.find({
      gigCompletion: gigCompletionId,
      ratedBy: req.user._id
    }).select('ratedUser workerCompletion');

    // Create map of already rated workers
    const ratedWorkers = new Set();
    existingRatings.forEach(rating => {
      ratedWorkers.add(`${rating.ratedUser}_${rating.workerCompletion}`);
    });

    // Prepare workers data with rating status
    const workersForRating = gigCompletion.workers.map(workerCompletion => {
      const workerKey = `${workerCompletion.worker._id}_${workerCompletion._id}`;
      const alreadyRated = ratedWorkers.has(workerKey);

      return {
        workerCompletionId: workerCompletion._id,
        worker: workerCompletion.worker,
        payment: {
          amount: workerCompletion.payment.amount,
          status: workerCompletion.payment.status
        },
        completedTimeSlots: workerCompletion.completedTimeSlots.length,
        totalHoursWorked: workerCompletion.completedTimeSlots.reduce(
          (total, slot) => total + slot.hoursWorked, 0
        ),
        performance: workerCompletion.performance,
        alreadyRated,
        canRate: !alreadyRated && workerCompletion.payment.status === 'paid'
      };
    });

    res.status(200).json({
      success: true,
      data: {
        gigCompletion: {
          _id: gigCompletion._id,
          gigRequest: gigCompletion.gigRequest,
          status: gigCompletion.status,
          completedAt: gigCompletion.completedAt
        },
        workers: workersForRating,
        summary: {
          totalWorkers: workersForRating.length,
          workersCanRate: workersForRating.filter(w => w.canRate).length,
          workersAlreadyRated: workersForRating.filter(w => w.alreadyRated).length
        }
      }
    });

  } catch (error) {
    console.error('Error getting workers for rating:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching workers for rating',
      error: error.message
    });
  }
};

/**
 * Confirm payment and distribute funds to workers
 * POST /api/gig-completions/:id/confirm-payment
 */
exports.confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentIntentId } = req.body;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completion ID'
      });
    }

    // Find the completion record with populated references
    const gigCompletion = await GigCompletion.findById(id)
      .populate('workers.worker');
      
    if (!gigCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Gig completion record not found'
      });
    }

    // Verify the payment intent matches
    if (gigCompletion.paymentSummary.stripe?.paymentIntentId !== paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment intent ID does not match'
      });
    }

    // Get payment intent status from Stripe
    const paymentIntentResult = await stripeService.getPaymentIntent(paymentIntentId);
    
    if (!paymentIntentResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment intent',
        error: paymentIntentResult.error
      });
    }

    const paymentIntent = paymentIntentResult.paymentIntent;

    // Check if payment was successful
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Payment not successful. Status: ${paymentIntent.status}`
      });
    }

    // Update payment summary status
    gigCompletion.paymentSummary.stripe.paymentIntentStatus = paymentIntent.status;
    gigCompletion.paymentSummary.stripe.chargeId = paymentIntent.latest_charge;
    gigCompletion.paymentSummary.stripe.paymentDate = new Date();
    gigCompletion.paymentSummary.paymentStatus = 'completed';

    // Prepare worker data for payment distribution
    const workersForDistribution = [];
    
    for (let worker of gigCompletion.workers) {
      const user = worker.worker;
      
      // Check if worker has Stripe Connect account
      if (!user.stripe?.accountId) {
        // Worker needs to set up Stripe Connect account
        worker.payment.status = 'failed';
        worker.payment.transactionId = `ERROR-NO-STRIPE-${Date.now()}`;
        continue;
      }

      workersForDistribution.push({
        workerId: user._id.toString(),
        amount: worker.payment.amount,
        stripeAccountId: user.stripe.accountId
      });
    }

    // Distribute payments to workers with Stripe Connect accounts
    if (workersForDistribution.length > 0) {
      const distributionResult = await stripeService.distributePayment({
        paymentIntentId,
        workers: workersForDistribution,
        gigCompletionId: id
      });

      // Update worker payment statuses based on distribution results
      if (distributionResult.success) {
        distributionResult.transfers.forEach(transfer => {
          const worker = gigCompletion.workers.find(w => 
            w.worker._id.toString() === transfer.workerId
          );
          if (worker) {
            worker.payment.status = 'paid';
            worker.payment.paymentDate = new Date();
            worker.payment.stripe = {
              transferId: transfer.transfer.id,
              transferStatus: transfer.transfer.status || 'paid',
              transferDate: new Date(),
              accountId: transfer.transfer.destination
            };
          }
        });

        // Handle any errors in distribution
        distributionResult.errors.forEach(error => {
          const worker = gigCompletion.workers.find(w => 
            w.worker._id.toString() === error.workerId
          );
          if (worker) {
            worker.payment.status = 'failed';
            worker.payment.transactionId = `ERROR-${Date.now()}`;
          }
        });
      }
    }

    await gigCompletion.save();

    // Update worker employment stats
    const successfulWorkers = gigCompletion.workers.filter(w => w.payment.status === 'paid');
    for (let worker of successfulWorkers) {
      await User.findByIdAndUpdate(worker.worker._id, {
        $inc: {
          'employmentStats.totalGigsCompleted': 1,
          'employmentStats.totalEarnings': worker.payment.amount
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and distributed successfully',
      data: {
        paymentIntentId,
        totalAmount: gigCompletion.paymentSummary.totalAmount,
        finalAmount: gigCompletion.paymentSummary.finalAmount,
        workersDistributed: workersForDistribution.length,
        successfulPayments: successfulWorkers.length,
        failedPayments: gigCompletion.workers.length - successfulWorkers.length,
        status: 'completed'
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming payment',
      error: error.message
    });
  }
};

/**
 * Create Stripe Connect account for worker
 * POST /api/gig-completions/create-worker-account
 */
exports.createWorkerStripeAccount = async (req, res) => {
  try {
    const { userId, country = 'US' } = req.body;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already has a Stripe account
    if (user.stripe?.accountId) {
      return res.status(400).json({
        success: false,
        message: 'User already has a Stripe Connect account',
        accountId: user.stripe.accountId
      });
    }

    // Create Stripe Connect account
    const accountData = {
      email: user.email,
      country,
      individual: {
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email
      }
    };

    const accountResult = await stripeService.createConnectAccount(accountData);

    if (!accountResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create Stripe Connect account',
        error: accountResult.error
      });
    }

    // Update user with Stripe account information
    user.stripe = {
      accountId: accountResult.account.id,
      accountStatus: 'pending',
      onboardingCompleted: false,
      chargesEnabled: accountResult.account.charges_enabled,
      payoutsEnabled: accountResult.account.payouts_enabled,
      lastOnboardingUpdate: new Date()
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Stripe Connect account created successfully',
      data: {
        accountId: accountResult.account.id,
        accountStatus: 'pending',
        needsOnboarding: true
      }
    });
  } catch (error) {
    console.error('Error creating worker Stripe account:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating Stripe Connect account',
      error: error.message
    });
  }
};

/**
 * Create onboarding link for worker Stripe Connect account
 * POST /api/gig-completions/create-onboarding-link
 */
exports.createOnboardingLink = async (req, res) => {
  try {
    const { userId, refreshUrl, returnUrl } = req.body;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has a Stripe account
    if (!user.stripe?.accountId) {
      return res.status(400).json({
        success: false,
        message: 'User does not have a Stripe Connect account. Please create one first.'
      });
    }

    // Create account link
    const linkResult = await stripeService.createAccountLink(
      user.stripe.accountId,
      refreshUrl || `${process.env.FRONTEND_URL}/stripe/refresh`,
      returnUrl || `${process.env.FRONTEND_URL}/stripe/return`
    );

    if (!linkResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create onboarding link',
        error: linkResult.error
      });
    }

    // Update user with onboarding link
    user.stripe.onboardingLink = linkResult.accountLink.url;
    user.stripe.lastOnboardingUpdate = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Onboarding link created successfully',
      data: {
        onboardingUrl: linkResult.accountLink.url,
        accountId: user.stripe.accountId
      }
    });
  } catch (error) {
    console.error('Error creating onboarding link:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating onboarding link',
      error: error.message
    });
  }
};

/**
 * Check worker Stripe account status
 * GET /api/gig-completions/worker-account-status/:userId
 */
exports.checkWorkerAccountStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.stripe?.accountId) {
      return res.status(200).json({
        success: true,
        data: {
          hasAccount: false,
          accountStatus: 'none',
          needsAccount: true
        }
      });
    }

    // Get account details from Stripe
    const accountResult = await stripeService.getAccountDetails(user.stripe.accountId);

    if (!accountResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve account details',
        error: accountResult.error
      });
    }

    const account = accountResult.account;

    // Update user account status
    user.stripe.chargesEnabled = account.charges_enabled;
    user.stripe.payoutsEnabled = account.payouts_enabled;
    user.stripe.onboardingCompleted = account.details_submitted;
    user.stripe.accountStatus = account.charges_enabled && account.payouts_enabled ? 'enabled' : 'pending';
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        hasAccount: true,
        accountId: account.id,
        accountStatus: user.stripe.accountStatus,
        onboardingCompleted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        canReceivePayments: account.charges_enabled && account.payouts_enabled
      }
    });
  } catch (error) {
    console.error('Error checking worker account status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking account status',
      error: error.message
    });
  }
};

/**
 * Get current user's gig completions
 * GET /api/gig-completions/my-completions
 */
exports.getMyCompletions = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Build filter object - students are in the workers array
    const filter = { 
      'workers.worker': userId,
      status: { $in: ['completed', 'verified'] }
    };
    
    // Add payment status filter if provided
    if (req.query.paymentStatus) {
      filter['workers.payment.status'] = req.query.paymentStatus;
    }
    
    // Add date range filters if provided
    if (req.query.startDate || req.query.endDate) {
      filter.completedAt = {};
      if (req.query.startDate) {
        filter.completedAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.completedAt.$lte = new Date(req.query.endDate);
      }
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Sorting
    const sortBy = req.query.sortBy || 'completedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };
    
    // Get completions with populated data
    const completions = await GigCompletion.find(filter)
      .populate({
        path: 'gigRequest',
        select: 'title category location payRate totalPositions filledPositions createdAt'
      })
      .populate({
        path: 'employer',
        select: 'companyName logo'
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Filter and format the data to only include the current user's work
    const formattedCompletions = completions.map(completion => {
      const userWorker = completion.workers.find(w => w.worker.toString() === userId.toString());
      
      return {
        _id: completion._id,
        gigRequest: completion.gigRequest,
        employer: completion.employer,
        status: completion.status,
        completedAt: completion.completedAt,
        myWork: userWorker ? {
          payment: userWorker.payment,
          completedTimeSlots: userWorker.completedTimeSlots,
          totalHours: userWorker.completedTimeSlots.reduce((total, slot) => total + slot.hoursWorked, 0),
          performance: userWorker.performance
        } : null
      };
    });
    
    const total = await GigCompletion.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: formattedCompletions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        completions: formattedCompletions
      }
    });
  } catch (error) {
    console.error('Error getting user completions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user completions',
      error: error.message
    });
  }
};

/**
 * Get completed gigs for employer
 * GET /api/gig-completions/employer/completed
 */
exports.getEmployerCompletedGigs = async (req, res) => {
  try {
    const employerId = req.user._id;
    
    // Build filter object for employer's completed gigs
    const filter = { 
      employer: employerId,
      status: { $in: ['completed', 'verified'] }
    };
    
    // Add payment status filter if provided
    if (req.query.paymentStatus) {
      filter['paymentSummary.paymentStatus'] = req.query.paymentStatus;
    }
    
    // Add date range filters if provided
    if (req.query.startDate || req.query.endDate) {
      filter.completedAt = {};
      if (req.query.startDate) {
        filter.completedAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.completedAt.$lte = new Date(req.query.endDate);
      }
    }
    
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Sorting
    const sortBy = req.query.sortBy || 'completedAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortOrder };
    
    // Get completed gigs with populated data
    const completedGigs = await GigCompletion.find(filter)
      .populate({
        path: 'gigRequest',
        select: 'title category location payRate totalPositions filledPositions createdAt'
      })
      .populate({
        path: 'workers.worker',
        select: 'firstName lastName email profilePicture'
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    const total = await GigCompletion.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: completedGigs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: completedGigs
    });
  } catch (error) {
    console.error('Error getting employer completed gigs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employer completed gigs',
      error: error.message
    });
  }
};

/**
 * Recalculate payments for a gig completion
 * POST /api/gig-completions/:id/recalculate-payments
 */
exports.recalculatePayments = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid completion ID'
      });
    }

    // Find the completion record
    const gigCompletion = await GigCompletion.findById(id).populate('gigRequest');
    if (!gigCompletion) {
      return res.status(404).json({
        success: false,
        message: 'Gig completion record not found'
      });
    }

    // Check if the user is authorized (employer or admin)
    if (req.userType === 'employer' && gigCompletion.employer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to recalculate payments for this gig'
      });
    }

    // Recalculate all worker payments
    gigCompletion.workers.forEach(worker => {
      // Ensure the worker has proper payment calculation details
      if (!worker.payment.calculationDetails.baseRate && gigCompletion.gigRequest.payRate) {
        worker.payment.calculationDetails.baseRate = gigCompletion.gigRequest.payRate.amount;
        worker.payment.calculationDetails.rateType = gigCompletion.gigRequest.payRate.rateType;
        worker.payment.calculationDetails.overtimeRate = gigCompletion.gigRequest.payRate.amount * 1.5;
      }
      
      const baseRate = worker.payment.calculationDetails.baseRate || 0;
      const rateType = worker.payment.calculationDetails.rateType || 'hourly';
      
      // If worker has no completed time slots, calculate based on job type
      if (!worker.completedTimeSlots || worker.completedTimeSlots.length === 0) {
        if (rateType === 'fixed') {
          worker.payment.amount = baseRate;
        } else if (rateType === 'hourly') {
          // Default to 8 hours if no time slots are specified
          worker.payment.amount = baseRate * 8;
          worker.payment.calculationDetails.totalHours = 8;
        } else if (rateType === 'daily') {
          worker.payment.amount = baseRate;
        }
      } else {
        // Calculate based on actual time slots
        gigCompletion.calculateWorkerPayment(worker.worker);
      }
    });

    await gigCompletion.save();

    res.status(200).json({
      success: true,
      message: 'Payments recalculated successfully',
      data: {
        paymentSummary: gigCompletion.paymentSummary,
        workers: gigCompletion.workers.map(worker => ({
          worker: worker.worker,
          payment: worker.payment
        }))
      }
    });
  } catch (error) {
    console.error('Error recalculating payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error recalculating payments',
      error: error.message
    });
  }
};

/**
 * Admin endpoint to fix zero payment amounts across all gig completions
 * POST /api/gig-completions/admin/fix-zero-payments
 */
exports.fixZeroPayments = async (req, res) => {
  try {
    // Find all completed gig completions with potential zero payments
    const completions = await GigCompletion.find({
      status: { $in: ['completed', 'verified'] }
    }).populate('gigRequest');
    
    let fixedCount = 0;
    const fixedCompletions = [];
    
    for (const completion of completions) {
      let needsUpdate = false;
      
      // Check if any worker has zero payment amount
      const zeroPaymentWorkers = completion.workers.filter(worker => 
        worker.payment.amount === 0 || !worker.payment.amount
      );
      
      if (zeroPaymentWorkers.length > 0) {
        // Fix each worker's payment
        completion.workers.forEach(worker => {
          if (worker.payment.amount === 0 || !worker.payment.amount) {
            // Get base rate from the original job
            const baseRate = completion.gigRequest?.payRate?.amount || 0;
            const rateType = completion.gigRequest?.payRate?.rateType || 'hourly';
            
            // Update calculation details if missing
            if (!worker.payment.calculationDetails.baseRate) {
              worker.payment.calculationDetails.baseRate = baseRate;
              worker.payment.calculationDetails.rateType = rateType;
              worker.payment.calculationDetails.overtimeRate = baseRate * 1.5;
            }
            
            // Calculate payment based on rate type
            if (rateType === 'fixed') {
              worker.payment.amount = baseRate;
            } else if (rateType === 'hourly') {
              // If has time slots, calculate from them, otherwise default to 8 hours
              if (worker.completedTimeSlots && worker.completedTimeSlots.length > 0) {
                completion.calculateWorkerPayment(worker.worker);
              } else {
                worker.payment.amount = baseRate * 8; // Default 8 hours
                worker.payment.calculationDetails.totalHours = 8;
              }
            } else if (rateType === 'daily') {
              worker.payment.amount = baseRate;
            }
            
            needsUpdate = true;
          }
        });
        
        if (needsUpdate) {
          await completion.save();
          fixedCount++;
          fixedCompletions.push({
            id: completion._id,
            gigTitle: completion.gigRequest?.title || 'Unknown',
            workersFixed: zeroPaymentWorkers.length
          });
        }
      }
    }
    
    res.status(200).json({
      success: true,
      message: `Fixed ${fixedCount} gig completions with zero payment amounts`,
      data: {
        totalFixed: fixedCount,
        totalChecked: completions.length,
        fixedCompletions
      }
    });
  } catch (error) {
    console.error('Error fixing zero payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing zero payments',
      error: error.message
    });
  }
};
