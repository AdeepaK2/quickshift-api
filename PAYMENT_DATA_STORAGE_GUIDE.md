# Payment Data Storage in QuickShift API

This document outlines where payment transaction data is stored throughout the payment lifecycle in the QuickShift Stripe integration.

## 📊 Payment Data Flow & Storage Locations

### 1. **User Model** (`src/models/user.js`)
**Stores Stripe Connect account information for workers**

```javascript
{
  stripe: {
    accountId: "acct_1234567890",           // Stripe Connect account ID
    accountStatus: "enabled",              // pending/restricted/enabled/disabled
    onboardingCompleted: true,             // Has completed Stripe onboarding
    onboardingLink: "https://...",         // Onboarding URL
    lastOnboardingUpdate: "2024-01-15",    // Last status update
    chargesEnabled: true,                  // Can receive payments
    payoutsEnabled: true                   // Can transfer to bank
  },
  
  employmentStats: {
    totalGigsCompleted: 15,                // Updated when payment completes
    totalEarnings: 2450.75                 // Cumulative earnings
  }
}
```

### 2. **GigCompletion Model** (`src/models/gigCompletion.js`)
**Central hub for all payment transaction data**

#### A. Payment Summary (Employer Payment)
```javascript
{
  paymentSummary: {
    totalAmount: 500.00,                   // Total before fees
    serviceFee: 25.00,                     // Platform service fee
    taxAmount: 45.50,                      // Tax amount
    finalAmount: 570.50,                   // Final amount charged
    invoiceNumber: "INV-1705234567-123",   // Generated invoice number
    invoiceDate: "2024-01-15T10:30:00Z",   // Invoice creation date
    paymentStatus: "completed",            // pending/processing/completed/refunded
    
    // Stripe Payment Intent Data
    stripe: {
      paymentIntentId: "pi_3ABC123...",    // Stripe payment intent ID
      paymentIntentStatus: "succeeded",    // Stripe payment status
      clientSecret: "pi_3ABC123..._secret", // For frontend confirmation
      chargeId: "ch_3ABC123...",          // Charge ID after payment
      paymentDate: "2024-01-15T10:35:00Z", // When payment succeeded
      
      // Refund tracking
      refunds: [{
        refundId: "re_3ABC123...",         // Stripe refund ID
        amount: 100.00,                    // Refund amount
        reason: "requested_by_customer",    // Refund reason
        date: "2024-01-16T14:20:00Z",      // Refund date
        status: "succeeded"                // Refund status
      }]
    }
  }
}
```

#### B. Worker Payment Data (Individual Worker Payments)
```javascript
{
  workers: [{
    worker: "60f7b1234567890123456789",    // User ID reference
    
    payment: {
      status: "paid",                      // pending/processing/paid/failed
      amount: 150.00,                      // Worker's payment amount
      currency: "USD",                     // Payment currency
      paymentMethod: "stripe",             // Payment method used
      transactionId: "PI-pi_3ABC123-12345", // Transaction identifier
      paymentDate: "2024-01-15T10:40:00Z", // When worker was paid
      
      // Stripe Transfer Data
      stripe: {
        transferId: "tr_3DEF456...",       // Stripe transfer ID
        transferStatus: "paid",            // pending/paid/failed/canceled
        transferDate: "2024-01-15T10:40:00Z", // Transfer completion date
        accountId: "acct_1234567890"       // Worker's Stripe account ID
      },
      
      calculationDetails: {
        baseRate: 15.00,                   // Hourly rate
        rateType: "hourly",               // Rate calculation method
        totalHours: 10,                   // Hours worked
        overtimeHours: 2,                 // Overtime hours
        overtimeRate: 22.50,              // Overtime rate
        bonusAmount: 0,                   // Performance bonus
        deductions: 0                     // Any deductions
      }
    }
  }]
}
```

## 🔄 Payment Lifecycle & Data Updates

### Phase 1: Payment Intent Creation
**Endpoint:** `POST /api/gig-completions/:id/process-payment`

```javascript
// Data stored in gigCompletion.paymentSummary.stripe
{
  paymentIntentId: "pi_3ABC123...",
  paymentIntentStatus: "requires_payment_method",
  clientSecret: "pi_3ABC123..._secret"
}

// Data stored in gigCompletion.workers[].payment
{
  status: "processing",
  transactionId: "PI-pi_3ABC123-12345"
}
```

### Phase 2: Payment Confirmation & Distribution
**Endpoint:** `POST /api/gig-completions/:id/confirm-payment`

```javascript
// Updated in gigCompletion.paymentSummary.stripe
{
  paymentIntentStatus: "succeeded",
  chargeId: "ch_3ABC123...",
  paymentDate: "2024-01-15T10:35:00Z"
}

// Updated in gigCompletion.workers[].payment.stripe
{
  transferId: "tr_3DEF456...",
  transferStatus: "pending",
  transferDate: "2024-01-15T10:40:00Z",
  accountId: "acct_1234567890"
}
```

### Phase 3: Webhook Updates
**Endpoint:** `POST /api/webhooks/stripe`

#### When transfer completes:
```javascript
// Updated in gigCompletion.workers[].payment
{
  status: "paid",
  paymentDate: "2024-01-15T10:42:00Z"
}

// Updated in gigCompletion.workers[].payment.stripe
{
  transferStatus: "paid"
}

// Updated in user.employmentStats
{
  totalGigsCompleted: 16,  // Incremented
  totalEarnings: 2600.75   // Added worker amount
}
```

## 💾 Database Collections & Fields

### Primary Storage Collections:

1. **`gigcompletions`** - Main transaction records
2. **`users`** - Stripe account info & earnings stats

### Key Searchable Fields:

- `gigCompletion.paymentSummary.stripe.paymentIntentId`
- `gigCompletion.workers.payment.stripe.transferId`
- `gigCompletion.workers.payment.stripe.accountId`
- `user.stripe.accountId`
- `gigCompletion.paymentSummary.invoiceNumber`

## 🔍 Querying Payment Data

### Find Payment by Invoice:
```javascript
const payment = await GigCompletion.findOne({
  'paymentSummary.invoiceNumber': 'INV-1705234567-123'
});
```

### Find Worker Payments:
```javascript
const workerPayments = await GigCompletion.find({
  'workers.worker': userId,
  'workers.payment.status': 'paid'
});
```

### Find Stripe Transfers:
```javascript
const transfers = await GigCompletion.find({
  'workers.payment.stripe.transferId': 'tr_3DEF456...'
});
```

## 📈 Payment Reporting Data

All payment data is automatically stored for comprehensive reporting:

- **Transaction History**: Complete audit trail in `gigCompletion` records
- **Worker Earnings**: Aggregated in `user.employmentStats`
- **Payment Status Tracking**: Real-time status updates via webhooks
- **Refund Management**: Complete refund history in `stripe.refunds` array
- **Financial Reconciliation**: Stripe IDs stored for easy reconciliation

## 🛡️ Data Integrity

- **Atomic Updates**: Payment status changes are atomic
- **Webhook Idempotency**: Webhook events are handled idempotently
- **Error Tracking**: Failed payments and transfers are logged
- **Audit Trail**: Complete history of all payment state changes

This architecture ensures complete traceability of all payment transactions while maintaining data consistency and enabling comprehensive financial reporting.
