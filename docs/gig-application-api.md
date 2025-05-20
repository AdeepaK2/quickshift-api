# QuickShift API - Gig Application Documentation

## Overview
This document describes the endpoints available in the QuickShift API for users to apply for gigs and for employers to manage applications.

## Gig Applications

### Apply for a Gig
**Endpoint:** `POST /api/gig-applications`

**Description:** Allows a user to submit an application for a specific gig request.

**Request Body:**
```json
{
  "userId": "user_id_here",
  "gigRequestId": "gig_request_id_here",
  "timeSlots": [
    {
      "timeSlotId": "time_slot_id_here",
      "date": "2025-06-01",
      "startTime": "2025-06-01T09:00:00",
      "endTime": "2025-06-01T17:00:00"
    }
  ],
  "coverLetter": "I am very interested in this position because..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "_id": "application_id",
    "user": "user_id_here",
    "gigRequest": "gig_request_id_here",
    "status": "applied",
    "coverLetter": "I am very interested in this position because...",
    "appliedAt": "2025-05-20T12:00:00Z"
  }
}
```

### Alternative: Apply Directly Through Gig Request
**Endpoint:** `POST /api/gig-requests/:id/apply`

**Description:** Alternative endpoint that allows users to apply directly to a gig request.

**Request Body:**
```json
{
  "userId": "user_id_here",
  "timeSlots": [
    {
      "timeSlotId": "time_slot_id_here",
      "date": "2025-06-01",
      "startTime": "2025-06-01T09:00:00",
      "endTime": "2025-06-01T17:00:00"
    }
  ],
  "coverLetter": "I am very interested in this position because..."
}
```

**Response:** Same as the above endpoint.

### Get All Applications for a Gig Request
**Endpoint:** `GET /api/gig-applications/gig/:gigRequestId`

**Description:** Returns all applications for a specific gig request.

**Query Parameters:**
- `page`: Page number for pagination (default: 1)
- `limit`: Number of results per page (default: 10)
- `status`: Filter by application status (optional)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "total": 5,
  "page": 1,
  "pages": 1,
  "data": [
    {
      "_id": "application_id_1",
      "user": {
        "_id": "user_id_1",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      },
      "gigRequest": "gig_request_id",
      "status": "applied",
      "appliedAt": "2025-05-19T14:30:00Z"
    },
    {
      "_id": "application_id_2",
      "user": {
        "_id": "user_id_2",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com"
      },
      "gigRequest": "gig_request_id",
      "status": "shortlisted",
      "appliedAt": "2025-05-18T10:15:00Z"
    }
  ]
}
```

### Get All Applications for a User
**Endpoint:** `GET /api/gig-applications/user/:userId`

**Description:** Returns all applications submitted by a specific user.

**Query Parameters:**
- `page`: Page number for pagination (default: 1)
- `limit`: Number of results per page (default: 10)
- `status`: Filter by application status (optional)

**Response:** Similar to the above endpoint.

### Update Application Status
**Endpoint:** `PATCH /api/gig-applications/:id/status`

**Description:** Update the status of an application.

**Request Body:**
```json
{
  "status": "shortlisted" // or "hired" or "rejected"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application status updated successfully",
  "data": {
    "_id": "application_id",
    "user": "user_id",
    "gigRequest": "gig_request_id",
    "status": "shortlisted",
    "lastUpdated": "2025-05-20T13:45:00Z"
  }
}
```

### Update Application Feedback
**Endpoint:** `PATCH /api/gig-applications/:id/feedback`

**Description:** Add employer feedback to an application.

**Request Body:**
```json
{
  "employerFeedback": "Thank you for your application. We were impressed with your skills..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Application feedback updated successfully",
  "data": {
    "_id": "application_id",
    "employerFeedback": "Thank you for your application. We were impressed with your skills...",
    "lastUpdated": "2025-05-20T14:00:00Z"
  }
}
```

### Delete Application
**Endpoint:** `DELETE /api/gig-applications/:id`

**Description:** Delete an application. Only applications that are not in "hired" status can be deleted.

**Response:**
```json
{
  "success": true,
  "message": "Application deleted successfully"
}
```

## Notes
- A user can only apply once to a specific gig request.
- When a user is hired, the filledPositions count on the gig request is automatically incremented.
- Applications are tracked both in the GigApply collection and in the applicants array of the GigRequest.
