# Gig Completion and Payment API Documentation

This document outlines the API endpoints for handling gig completions and payments in the QuickShift API.

## Gig Completion Endpoints

### Initialize a Gig Completion Record

Creates a new gig completion record when a gig starts.

- **URL:** `/api/gig-completions/initialize`
- **Method:** `POST`
- **Auth required:** Yes
- **Permissions required:** Employer

**Request Body:**
```json
{
  "gigRequestId": "60d21b4967d0d8992e610c85"
}
```

**Success Response:**
- **Code:** 201 Created
- **Content:**
```json
{
  "success": true,
  "message": "Gig completion record initialized successfully",
  "data": {
    "_id": "60d21b4967d0d8992e610c90",
    "gigRequest": "60d21b4967d0d8992e610c85",
    "employer": "60d21b4967d0d8992e610c80",
    "status": "in_progress",
    "workers": [
      {
        "worker": "60d21b4967d0d8992e610c82",
        "application": "60d21b4967d0d8992e610c88",
        "completedTimeSlots": [
          {
            "timeSlotId": "60d21b4967d0d8992e610c86",
            "date": "2023-05-22T00:00:00.000Z",
            "actualStartTime": "2023-05-22T09:00:00.000Z",
            "actualEndTime": "2023-05-22T17:00:00.000Z",
            "hoursWorked": 8,
            "breakTime": 0
          }
        ],
        "payment": {
          "status": "pending",
          "amount": 120,
          "calculationDetails": {
            "baseRate": 15,
            "rateType": "hourly",
            "totalHours": 8,
            "overtimeHours": 0,
            "overtimeRate": 22.5
          }
        }
      }
    ],
    "paymentSummary": {
      "totalAmount": 120,
      "serviceFee": 12,
      "taxAmount": 6.6,
      "finalAmount": 138.6,
      "currency": "USD",
      "paymentStatus": "pending"
    }
  }
}
```

### Get Gig Completion by ID

Retrieves a specific gig completion record.

- **URL:** `/api/gig-completions/:id`
- **Method:** `GET`
- **Auth required:** Yes
- **Permissions required:** Employer or Worker involved in the gig

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "data": {
    "_id": "60d21b4967d0d8992e610c90",
    "gigRequest": {
      "_id": "60d21b4967d0d8992e610c85",
      "title": "Event Staff",
      "category": "Events"
    },
    "employer": {
      "_id": "60d21b4967d0d8992e610c80",
      "companyName": "Example Company",
      "email": "employer@example.com",
      "phone": "+1234567890"
    },
    "status": "in_progress",
    "workers": [
      {
        "worker": {
          "_id": "60d21b4967d0d8992e610c82",
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com",
          "phone": "+0987654321"
        },
        "application": {
          "_id": "60d21b4967d0d8992e610c88"
        },
        "completedTimeSlots": [
          {
            "timeSlotId": "60d21b4967d0d8992e610c86",
            "date": "2023-05-22T00:00:00.000Z",
            "actualStartTime": "2023-05-22T09:00:00.000Z",
            "actualEndTime": "2023-05-22T17:00:00.000Z",
            "hoursWorked": 8,
            "breakTime": 0
          }
        ],
        "payment": {
          "status": "pending",
          "amount": 120,
          "calculationDetails": {
            "baseRate": 15,
            "rateType": "hourly",
            "totalHours": 8,
            "overtimeHours": 0,
            "overtimeRate": 22.5
          }
        }
      }
    ],
    "paymentSummary": {
      "totalAmount": 120,
      "serviceFee": 12,
      "taxAmount": 6.6,
      "finalAmount": 138.6,
      "currency": "USD",
      "paymentStatus": "pending"
    }
  }
}
```

### Update Worker's Time Slots

Updates the actual time worked by a worker.

- **URL:** `/api/gig-completions/:id/worker/:workerId`
- **Method:** `PUT`
- **Auth required:** Yes
- **Permissions required:** Employer or the Worker themselves

**Request Body:**
```json
{
  "completedTimeSlots": [
    {
      "timeSlotId": "60d21b4967d0d8992e610c86",
      "date": "2023-05-22T00:00:00.000Z",
      "actualStartTime": "2023-05-22T09:30:00.000Z",
      "actualEndTime": "2023-05-22T16:45:00.000Z",
      "hoursWorked": 7.25,
      "breakTime": 30
    }
  ]
}
```

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "message": "Worker time slots updated successfully",
  "data": {
    "worker": "60d21b4967d0d8992e610c82",
    "application": "60d21b4967d0d8992e610c88",
    "completedTimeSlots": [
      {
        "timeSlotId": "60d21b4967d0d8992e610c86",
        "date": "2023-05-22T00:00:00.000Z",
        "actualStartTime": "2023-05-22T09:30:00.000Z",
        "actualEndTime": "2023-05-22T16:45:00.000Z",
        "hoursWorked": 7.25,
        "breakTime": 30
      }
    ],
    "payment": {
      "status": "pending",
      "amount": 108.75,
      "calculationDetails": {
        "baseRate": 15,
        "rateType": "hourly",
        "totalHours": 7.25,
        "overtimeHours": 0,
        "overtimeRate": 22.5
      }
    }
  }
}
```

### Update Worker's Performance Evaluation

Adds performance evaluation for a worker.

- **URL:** `/api/gig-completions/:id/worker/:workerId/performance`
- **Method:** `PUT`
- **Auth required:** Yes
- **Permissions required:** Employer

**Request Body:**
```json
{
  "rating": 4.5,
  "feedback": "Great work!",
  "punctuality": 4,
  "quality": 5,
  "professionalism": 4.5
}
```

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "message": "Worker performance evaluation updated successfully",
  "data": {
    "worker": "60d21b4967d0d8992e610c82",
    "application": "60d21b4967d0d8992e610c88",
    "performance": {
      "rating": 4.5,
      "feedback": "Great work!",
      "punctuality": 4,
      "quality": 5,
      "professionalism": 4.5
    }
  }
}
```

### Mark Gig as Completed

Marks a gig as completed.

- **URL:** `/api/gig-completions/:id/complete`
- **Method:** `PUT`
- **Auth required:** Yes
- **Permissions required:** Employer

**Request Body:**
```json
{
  "completionProof": ["https://example.com/proof1.jpg"],
  "notes": "Completed as expected"
}
```

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "message": "Gig marked as completed successfully",
  "data": {
    "status": "completed",
    "completedAt": "2023-05-22T18:00:00.000Z"
  }
}
```

### Process Payment for a Gig

Processes payment for a completed gig.

- **URL:** `/api/gig-completions/:id/process-payment`
- **Method:** `POST`
- **Auth required:** Yes
- **Permissions required:** Employer

**Request Body:**
```json
{
  "paymentMethod": "bank_transfer",
  "notes": "Payment processed on time"
}
```

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "message": "Payment processing initiated successfully",
  "data": {
    "invoiceNumber": "INV-1621677600000-123",
    "totalAmount": 120,
    "finalAmount": 138.6,
    "status": "processing"
  }
}
```

### Get All Gig Completions

Retrieves all gig completions with optional filters.

- **URL:** `/api/gig-completions`
- **Method:** `GET`
- **Auth required:** Yes
- **Permissions required:** Administrator
- **Query parameters:** 
  - `status`: Filter by status
  - `employerId`: Filter by employer
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d21b4967d0d8992e610c90",
      "status": "completed",
      "paymentSummary": {
        "totalAmount": 120,
        "finalAmount": 138.6,
        "paymentStatus": "completed"
      },
      "completedAt": "2023-05-22T18:00:00.000Z",
      "createdAt": "2023-05-22T08:00:00.000Z",
      "gigRequest": {
        "title": "Event Staff",
        "category": "Events"
      },
      "employer": {
        "companyName": "Example Company"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

### Get Gig Completions for a Worker

Retrieves all gig completions for a specific worker.

- **URL:** `/api/gig-completions/worker/:workerId`
- **Method:** `GET`
- **Auth required:** Yes
- **Permissions required:** Administrator or the Worker themselves
- **Query parameters:** 
  - `status`: Filter by status
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d21b4967d0d8992e610c90",
      "status": "completed",
      "workers": [
        {
          "worker": "60d21b4967d0d8992e610c82",
          "payment": {
            "status": "paid",
            "amount": 108.75
          },
          "performance": {
            "rating": 4.5
          }
        }
      ],
      "paymentSummary": {
        "paymentStatus": "completed"
      },
      "completedAt": "2023-05-22T18:00:00.000Z",
      "gigRequest": {
        "title": "Event Staff",
        "category": "Events"
      },
      "employer": {
        "companyName": "Example Company"
      }
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

## Error Responses

### Validation Error
- **Code:** 400 Bad Request
- **Content:**
```json
{
  "success": false,
  "message": "Error message explaining what went wrong"
}
```

### Not Found Error
- **Code:** 404 Not Found
- **Content:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

### Server Error
- **Code:** 500 Internal Server Error
- **Content:**
```json
{
  "success": false,
  "message": "An error occurred",
  "error": "Error details"
}
```
