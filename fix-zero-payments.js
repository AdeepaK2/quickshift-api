#!/usr/bin/env node

const mongoose = require('mongoose');
const GigCompletion = require('./src/models/gigCompletion');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quickshift', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix zero payment amounts
const fixZeroPayments = async () => {
  try {
    console.log('Starting to fix zero payment amounts...');
    
    // Find all completed gig completions
    const completions = await GigCompletion.find({
      status: { $in: ['completed', 'verified'] }
    }).populate('gigRequest');
    
    console.log(`Found ${completions.length} completed gig completions`);
    
    let fixedCount = 0;
    
    for (const completion of completions) {
      let needsUpdate = false;
      
      // Check if any worker has zero payment amount
      const zeroPaymentWorkers = completion.workers.filter(worker => 
        worker.payment.amount === 0 || !worker.payment.amount
      );
      
      if (zeroPaymentWorkers.length > 0) {
        console.log(`\nFixing gig completion: ${completion._id}`);
        console.log(`Gig title: ${completion.gigRequest?.title || 'Unknown'}`);
        console.log(`Workers with zero payments: ${zeroPaymentWorkers.length}`);
        
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
              console.log(`  - Fixed rate: ${baseRate}`);
            } else if (rateType === 'hourly') {
              // If has time slots, calculate from them, otherwise default to 8 hours
              if (worker.completedTimeSlots && worker.completedTimeSlots.length > 0) {
                completion.calculateWorkerPayment(worker.worker);
                console.log(`  - Calculated from time slots: ${worker.payment.amount}`);
              } else {
                worker.payment.amount = baseRate * 8; // Default 8 hours
                worker.payment.calculationDetails.totalHours = 8;
                console.log(`  - Default 8 hours: ${worker.payment.amount}`);
              }
            } else if (rateType === 'daily') {
              worker.payment.amount = baseRate;
              console.log(`  - Daily rate: ${baseRate}`);
            }
            
            needsUpdate = true;
          }
        });
        
        if (needsUpdate) {
          await completion.save();
          fixedCount++;
          console.log(`✓ Fixed gig completion: ${completion._id}`);
        }
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} gig completions with zero payment amounts`);
    
  } catch (error) {
    console.error('Error fixing zero payments:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixZeroPayments();
  await mongoose.disconnect();
  console.log('Script completed');
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixZeroPayments };
