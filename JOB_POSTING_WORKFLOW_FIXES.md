# QuickShift Job Posting Platform - Fixed Workflow

## Overview
This document outlines the complete workflow for the job posting platform where employers can post jobs, undergraduates can apply, and employers can accept applications.

## Fixed Issues

### 1. Authentication & Authorization
- ✅ **Fixed**: Added proper role-based access control
- ✅ **Fixed**: Employers can only manage their own jobs
- ✅ **Fixed**: Students/users can only apply for jobs
- ✅ **Fixed**: Admins have oversight access

### 2. Employer Job Management
- ✅ **Fixed**: Dedicated employer routes for job management
- ✅ **Fixed**: Proper validation for job creation
- ✅ **Fixed**: Employer-specific job listing and editing
- ✅ **Fixed**: Job status management

### 3. Student Application Process
- ✅ **Fixed**: Role validation for job applications
- ✅ **Fixed**: Duplicate application prevention
- ✅ **Fixed**: Time slot validation
- ✅ **Fixed**: Application withdrawal functionality

### 4. Application Management
- ✅ **Fixed**: Accept/reject application workflow
- ✅ **Fixed**: Application status synchronization
- ✅ **Fixed**: Notification system integration
- ✅ **Fixed**: Employer feedback system

## Complete Workflow

### Phase 1: Employer Posts Job

**Endpoint**: `POST /api/gig-requests`
**Auth**: Bearer token (Employer only)

```javascript
// Required fields for job posting
{
  "title": "Campus Event Staff - University Fair",
  "description": "Looking for enthusiastic students...",
  "category": "Event Staff",
  "payRate": {
    "amount": 2500,
    "rateType": "hourly"
  },
  "location": {
    "address": "University of Colombo, Reid Avenue",
    "city": "Colombo",
    "postalCode": "00300",
    "coordinates": {
      "latitude": 6.9024,
      "longitude": 79.8607,
      "type": "Point"
    }
  },
  "timeSlots": [{
    "date": "2025-07-11T00:00:00.000Z",
    "startTime": "2025-07-11T08:00:00.000Z",
    "endTime": "2025-07-11T17:00:00.000Z",
    "peopleNeeded": 5,
    "peopleAssigned": 0
  }],
  "requirements": {
    "skills": ["Communication", "Customer Service"],
    "experience": "No prior experience required",
    "dress": "Business casual",
    "equipment": "Company will provide"
  },
  "totalPositions": 5,
  "status": "active",
  "applicationDeadline": "2025-07-09T00:00:00.000Z"
}
```

### Phase 2: Students Browse Jobs

**Endpoint**: `GET /api/gig-requests/public`
**Auth**: None required

Students can browse all active job postings without authentication.

### Phase 3: Students Apply for Jobs

**Endpoint**: `POST /api/gig-applications`
**Auth**: Bearer token (User/Student only)

```javascript
{
  "gigRequestId": "60f7b3b3b3b3b3b3b3b3b3b3",
  "timeSlots": [{
    "timeSlotId": "60f7b3b3b3b3b3b3b3b3b3b4",
    "date": "2025-07-11T00:00:00.000Z",
    "startTime": "2025-07-11T08:00:00.000Z",
    "endTime": "2025-07-11T17:00:00.000Z"
  }],
  "coverLetter": "I am very interested in this position..."
}
```

### Phase 4: Employer Reviews Applications

**Endpoint**: `GET /api/employers/applications`
**Auth**: Bearer token (Employer only)

Employers can view all applications for their job postings.

### Phase 5: Employer Accepts/Rejects Applications

**Accept Application**:
**Endpoint**: `PATCH /api/employers/applications/{applicationId}/accept`
**Auth**: Bearer token (Employer only)

```javascript
{
  "employerFeedback": "Great application! Looking forward to working with you."
}
```

**Reject Application**:
**Endpoint**: `PATCH /api/employers/applications/{applicationId}/reject`
**Auth**: Bearer token (Employer only)

```javascript
{
  "employerFeedback": "Thank you for your interest. We have selected other candidates."
}
```

## API Endpoints Summary

### Public Endpoints (No Auth Required)
- `GET /api/gig-requests/public` - Browse all active jobs
- `GET /api/gig-requests/public/{id}` - View specific job details
- `GET /api/gig-applications/gig/{gigRequestId}` - View application count for job

### Student/User Endpoints
- `POST /api/gig-applications` - Apply for a job
- `GET /api/gig-applications/my-applications` - View my applications
- `DELETE /api/gig-applications/{id}/withdraw` - Withdraw application

### Employer Endpoints
- `POST /api/gig-requests` - Create new job posting
- `GET /api/employers/jobs` - View my job postings
- `GET /api/employers/jobs/{id}` - View specific job with applications
- `PATCH /api/employers/jobs/{id}` - Update job posting
- `DELETE /api/employers/jobs/{id}` - Delete job posting
- `GET /api/employers/applications` - View all applications
- `PATCH /api/employers/applications/{id}/accept` - Accept application
- `PATCH /api/employers/applications/{id}/reject` - Reject application

### Admin Endpoints
- `GET /api/admin/users` - Manage users
- `GET /api/admin/employers` - Manage employers
- `GET /api/admin/dashboard` - Admin dashboard

## Data Models

### GigRequest (Job Posting)
```javascript
{
  title: String (required),
  description: String (required),
  category: String (required),
  employer: ObjectId (required, ref: 'Employer'),
  payRate: {
    amount: Number (required),
    rateType: String (required, enum: ['hourly', 'fixed', 'daily'])
  },
  timeSlots: [TimeSlotSchema],
  location: LocationSchema,
  requirements: RequirementsSchema,
  status: String (enum: ['draft', 'active', 'closed', 'completed', 'cancelled']),
  totalPositions: Number,
  filledPositions: Number,
  applicants: [ApplicantSchema],
  applicationDeadline: Date
}
```

### GigApply (Application)
```javascript
{
  user: ObjectId (required, ref: 'User'),
  gigRequest: ObjectId (required, ref: 'GigRequest'),
  timeSlots: [SelectedTimeSlotSchema],
  status: String (enum: ['pending', 'reviewed', 'accepted', 'rejected', 'withdrawn']),
  coverLetter: String,
  employerFeedback: String,
  appliedAt: Date,
  lastUpdated: Date
}
```

## Testing

Use the provided test script to verify the complete workflow:

```bash
node test-complete-workflow.js
```

**Note**: Update the `employerToken` and `studentToken` variables in the test script with actual authentication tokens.

## Security Features

1. **Role-based Authorization**: Each endpoint checks user roles
2. **Data Validation**: All inputs are validated
3. **Duplicate Prevention**: Users cannot apply twice for the same job
4. **Ownership Verification**: Users can only modify their own data
5. **Status Validation**: Prevents invalid state transitions

## Error Handling

All endpoints include comprehensive error handling with:
- Input validation
- Authentication checks
- Authorization verification
- Database error handling
- Proper HTTP status codes
- Descriptive error messages

## Notifications

The system includes notification hooks for:
- New job postings (to job seekers)
- New applications (to employers)
- Application status updates (to applicants)
- Application acceptance/rejection (to applicants)

## Next Steps

1. **Frontend Integration**: Update frontend to use the new endpoints
2. **Testing**: Run comprehensive tests with real data
3. **Performance**: Add database indexing for better performance
4. **Documentation**: Update API documentation
5. **Monitoring**: Add logging and monitoring for the workflow
