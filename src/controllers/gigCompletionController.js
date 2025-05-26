const GigCompletion = require('../models/gigCompletion');
const GigRequest = require('../models/gigRequest');
const GigApply = require('../models/gigApply');
const User = require('../models/user');
const Employer = require('../models/employer');
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

    // Find the completion record
    const gigCompletion = await GigCompletion.findById(id);
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

    // In a real application, you would integrate with a payment processor here
    // For now, we'll simulate a successful payment

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Update payment status for all workers
    gigCompletion.workers.forEach(worker => {
      worker.payment.status = 'processing';
      worker.payment.paymentMethod = paymentMethod;
      worker.payment.transactionId = `TXN-${Date.now()}-${worker._id.toString().substring(0, 5)}`;
    });

    // Update payment summary
    gigCompletion.paymentSummary.paymentStatus = 'processing';
    gigCompletion.paymentSummary.invoiceNumber = invoiceNumber;
    gigCompletion.paymentSummary.invoiceDate = new Date();
    
    // Add notes if provided
    if (notes) {
      gigCompletion.documentation.notes = notes;
    }
    
    await gigCompletion.save();

    // In a real application, you might want to create a background job for payment processing
    // For demo purposes, we'll update the status immediately
      // Simulate payment processing delay
    setTimeout(async () => {
      try {
        // Fetch the document again to avoid version conflicts
        const updatedGigCompletion = await GigCompletion.findById(id);
        if (updatedGigCompletion) {
          // Update payment statuses to paid
          updatedGigCompletion.workers.forEach(worker => {
            worker.payment.status = 'paid';
            worker.payment.paymentDate = new Date();
          });
          
          updatedGigCompletion.paymentSummary.paymentStatus = 'completed';
          
          await updatedGigCompletion.save();
          
          // You might want to send notifications to workers here
        }
      } catch (error) {
        console.error('Error finalizing payment:', error);
      }
    }, 2000); // 2 second delay to simulate processing

    res.status(200).json({
      success: true,
      message: 'Payment processing initiated successfully',
      data: {
        invoiceNumber: gigCompletion.paymentSummary.invoiceNumber,
        totalAmount: gigCompletion.paymentSummary.totalAmount,
        finalAmount: gigCompletion.paymentSummary.finalAmount,
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
    const gigCompletion = await GigCompletion.findById(id);
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
        completedAt: gigCompletion.completedAt
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
