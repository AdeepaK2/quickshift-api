const mongoose = require('mongoose');

// Schema for tracking work hours and payments for each worker
const workerCompletionSchema = new mongoose.Schema({
  // Worker who completed the gig
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // The application associated with this worker
  application: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GigApply',
    required: true
  },
  
  // Completed time slots with actual hours worked
  completedTimeSlots: [{
    timeSlotId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    actualStartTime: {
      type: Date,
      required: true
    },
    actualEndTime: {
      type: Date,
      required: true
    },
    hoursWorked: {
      type: Number,
      required: true
    },
    breakTime: {
      type: Number,
      default: 0  // In minutes
    }
  }],
  
  // Payment information for this worker
  payment: {
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'disputed'],
      default: 'pending'
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    calculationDetails: {
      baseRate: {
        type: Number,
        required: true
      },
      rateType: {
        type: String,
        enum: ['hourly', 'fixed', 'daily'],
        required: true
      },
      totalHours: {
        type: Number
      },
      overtimeHours: {
        type: Number,
        default: 0
      },
      overtimeRate: {
        type: Number,
        default: 0
      },
      bonusAmount: {
        type: Number,
        default: 0
      },
      deductions: {
        type: Number,
        default: 0
      },
      deductionReason: {
        type: String
      }    },
    paymentMethod: {
      type: String
    },
    transactionId: {
      type: String
    },
    paymentDate: {
      type: Date
    },
    receipt: {
      type: String  // URL or path to receipt file
    },
    // Stripe-specific fields
    stripe: {
      transferId: {
        type: String  // Stripe transfer ID for this worker
      },
      transferStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'canceled', 'reversed']
      },
      transferDate: {
        type: Date
      },
      accountId: {
        type: String  // Worker's Stripe Connect account ID
      }
    }
  },
  
  // Performance evaluation
  performance: {
    rating: {
      type: Number,
      min: 0,
      max: 5
    },
    feedback: {
      type: String
    },
    punctuality: {
      type: Number,
      min: 0,
      max: 5
    },
    quality: {
      type: Number,
      min: 0,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 0,
      max: 5
    }
  }
});

// Main schema for gig completion
const gigCompletionSchema = new mongoose.Schema({
  // Reference to the original gig request
  gigRequest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GigRequest',
    required: true
  },
  
  // Reference to the employer
  employer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    required: true
  },
  
  // Overall status of the gig completion
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'partially_completed', 'verified', 'disputed'],
    default: 'in_progress'
  },
  
  // Workers who completed the gig
  workers: [workerCompletionSchema],
  
  // Overall payment information
  paymentSummary: {
    totalAmount: {
      type: Number,
      required: true
    },
    serviceFee: {
      type: Number,
      default: 0
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    invoiceNumber: {
      type: String
    },
    invoiceDate: {
      type: Date
    },    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'partial', 'completed', 'refunded'],
      default: 'pending'
    },
    // Stripe payment integration fields
    stripe: {
      paymentIntentId: {
        type: String  // Stripe payment intent ID
      },
      paymentIntentStatus: {
        type: String,
        enum: ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'succeeded', 'canceled']
      },
      clientSecret: {
        type: String  // For frontend payment confirmation
      },
      chargeId: {
        type: String  // Stripe charge ID after successful payment
      },
      paymentDate: {
        type: Date
      },
      refunds: [{
        refundId: String,
        amount: Number,
        reason: String,
        date: Date,
        status: String
      }]
    }
  },
  
  // Documentation and evidence
  documentation: {
    completionProof: [{
      type: String  // URLs or paths to proof files (images, signed documents)
    }],
    notes: {
      type: String
    }
  },
  
  // Important timestamps
  completedAt: {
    type: Date
  },
  verifiedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate total payment amount before saving
gigCompletionSchema.pre('save', function(next) {
  if (this.workers && this.workers.length > 0) {
    let totalAmount = 0;
    
    // Sum all worker payments
    this.workers.forEach(worker => {
      totalAmount += worker.payment.amount;
    });
    
    // Calculate service fee (assuming 10% of total)
    const serviceFee = totalAmount * 0.1;
    
    // Calculate tax (assuming 5% of total + service fee)
    const taxAmount = (totalAmount + serviceFee) * 0.05;
    
    // Update payment summary
    this.paymentSummary.totalAmount = totalAmount;
    this.paymentSummary.serviceFee = serviceFee;
    this.paymentSummary.taxAmount = taxAmount;
    this.paymentSummary.finalAmount = totalAmount + serviceFee + taxAmount;
  }
  
  next();
});

// Method to calculate payment for a worker based on hours and rate
gigCompletionSchema.methods.calculateWorkerPayment = function(workerId) {
  const worker = this.workers.find(w => w.worker.toString() === workerId.toString());
  
  if (!worker) return null;
  
  let totalAmount = 0;
  const { baseRate, rateType } = worker.payment.calculationDetails;
  
  if (rateType === 'hourly') {
    // Calculate total hours across all time slots
    let totalHours = 0;
    worker.completedTimeSlots.forEach(slot => {
      totalHours += slot.hoursWorked;
    });
    
    // Calculate regular pay
    totalAmount = baseRate * totalHours;
    
    // Add overtime if applicable
    if (worker.payment.calculationDetails.overtimeHours > 0) {
      totalAmount += worker.payment.calculationDetails.overtimeHours * 
                    worker.payment.calculationDetails.overtimeRate;
    }
    
    // Store total hours
    worker.payment.calculationDetails.totalHours = totalHours;
  } 
  else if (rateType === 'fixed') {
    // For fixed rate, just use the base rate
    totalAmount = baseRate;
  }
  else if (rateType === 'daily') {
    // Count unique days
    const uniqueDays = new Set(
      worker.completedTimeSlots.map(slot => 
        new Date(slot.date).toISOString().split('T')[0]
      )
    );
    
    // Calculate daily rate
    totalAmount = baseRate * uniqueDays.size;
  }
  
  // Add bonus if any
  if (worker.payment.calculationDetails.bonusAmount) {
    totalAmount += worker.payment.calculationDetails.bonusAmount;
  }
  
  // Subtract deductions if any
  if (worker.payment.calculationDetails.deductions) {
    totalAmount -= worker.payment.calculationDetails.deductions;
  }
  
  // Update the worker's payment amount
  worker.payment.amount = totalAmount;
  
  return totalAmount;
};

const GigCompletion = mongoose.model('GigCompletion', gigCompletionSchema);

module.exports = GigCompletion;
