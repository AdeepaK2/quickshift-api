# Rating System API Documentation

## Overview
The Rating System allows employers to rate workers after gig completion. The system provides comprehensive rating capabilities with detailed breakdowns and statistics.

## Features
- ⭐ **1-5 Star Rating System** - Overall and detailed category ratings
- 📊 **Detailed Rating Categories** - Punctuality, Quality, Professionalism, Communication, Reliability
- 💬 **Written Feedback** - Optional text feedback with character limits
- 🎯 **Recommendation System** - Would recommend yes/no option
- 📈 **Rating Statistics** - Comprehensive analytics and breakdowns
- 🔒 **Authorization Controls** - Only employers can rate, only their own gigs
- ✅ **Validation** - Comprehensive input validation and constraints
- 🔄 **Update Support** - Ratings can be updated within 30 days
- 🗑️ **Soft Delete** - Ratings are marked as removed, not permanently deleted

## API Endpoints

### Create Rating
**POST** `/api/ratings/gig-completion/:gigCompletionId/worker/:workerCompletionId/user/:ratedUserId`

Rate a worker for a specific gig completion.

**Authorization:** Employer only

**Path Parameters:**
- `gigCompletionId` (string, required) - MongoDB ObjectId of the gig completion
- `workerCompletionId` (string, required) - MongoDB ObjectId of the worker completion record
- `ratedUserId` (string, required) - MongoDB ObjectId of the user being rated

**Request Body:**
```json
{
  "detailedRatings": {
    "punctuality": 5,      // Required: 1-5
    "quality": 4,          // Required: 1-5
    "professionalism": 5,  // Required: 1-5
    "communication": 4,    // Required: 1-5
    "reliability": 5       // Required: 1-5
  },
  "feedback": "Excellent worker, very reliable and professional. Would definitely hire again!",  // Optional: max 1000 chars
  "wouldRecommend": true   // Optional: boolean, default true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating created successfully",
  "data": {
    "_id": "64f5e8b2c9a8f123456789ab",
    "gigCompletion": "64f5e8b2c9a8f123456789cd",
    "ratedBy": {
      "_id": "64f5e8b2c9a8f123456789ef",
      "companyName": "Tech Solutions Inc",
      "profilePicture": "https://example.com/logo.jpg"
    },
    "ratedUser": {
      "_id": "64f5e8b2c9a8f123456789gh",
      "firstName": "John",
      "lastName": "Doe",
      "profilePicture": "https://example.com/profile.jpg"
    },
    "workerCompletion": "64f5e8b2c9a8f123456789ij",
    "overallRating": 4.6,
    "detailedRatings": {
      "punctuality": 5,
      "quality": 4,
      "professionalism": 5,
      "communication": 4,
      "reliability": 5
    },
    "feedback": "Excellent worker, very reliable and professional. Would definitely hire again!",
    "wouldRecommend": true,
    "status": "active",
    "createdAt": "2023-09-04T10:30:00.000Z",
    "updatedAt": "2023-09-04T10:30:00.000Z"
  }
}
```

### Get User Ratings
**GET** `/api/ratings/user/:userId`

Get all ratings for a specific user with pagination.

**Authorization:** Any authenticated user

**Path Parameters:**
- `userId` (string, required) - MongoDB ObjectId of the user

**Query Parameters:**
- `page` (integer, optional) - Page number (default: 1)
- `limit` (integer, optional) - Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "ratings": [
      {
        "_id": "64f5e8b2c9a8f123456789ab",
        "ratedBy": {
          "_id": "64f5e8b2c9a8f123456789ef",
          "companyName": "Tech Solutions Inc",
          "profilePicture": "https://example.com/logo.jpg",
          "location": "New York, NY"
        },
        "gigCompletion": {
          "_id": "64f5e8b2c9a8f123456789cd",
          "gigRequest": {
            "_id": "64f5e8b2c9a8f123456789kl",
            "title": "Event Staff Needed",
            "jobType": "part_time",
            "location": "Downtown Convention Center"
          }
        },
        "overallRating": 4.6,
        "detailedRatings": {
          "punctuality": 5,
          "quality": 4,
          "professionalism": 5,
          "communication": 4,
          "reliability": 5
        },
        "feedback": "Excellent worker, very reliable and professional.",
        "wouldRecommend": true,
        "createdAt": "2023-09-04T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalRatings": 25,
      "limit": 10
    },
    "averageRatings": {
      "averageRating": 4.3,
      "totalRatings": 25,
      "averagePunctuality": 4.5,
      "averageQuality": 4.2,
      "averageProfessionalism": 4.4,
      "averageCommunication": 4.1,
      "averageReliability": 4.3
    }
  }
}
```

### Get User Rating Statistics
**GET** `/api/ratings/user/:userId/stats`

Get comprehensive rating statistics for a user.

**Authorization:** Any authenticated user

**Response:**
```json
{
  "success": true,
  "data": {
    "averageRatings": {
      "averageRating": 4.3,
      "totalRatings": 25,
      "averagePunctuality": 4.5,
      "averageQuality": 4.2,
      "averageProfessionalism": 4.4,
      "averageCommunication": 4.1,
      "averageReliability": 4.3
    },
    "ratingDistribution": [
      { "_id": 5, "count": 10 },
      { "_id": 4, "count": 12 },
      { "_id": 3, "count": 3 },
      { "_id": 2, "count": 0 },
      { "_id": 1, "count": 0 }
    ],
    "recentRatings": [
      {
        "_id": "64f5e8b2c9a8f123456789ab",
        "ratedBy": {
          "companyName": "Tech Solutions Inc",
          "profilePicture": "https://example.com/logo.jpg"
        },
        "overallRating": 4.6,
        "feedback": "Excellent worker!",
        "createdAt": "2023-09-04T10:30:00.000Z"
      }
    ]
  }
}
```

### Update Rating
**PATCH** `/api/ratings/:ratingId`

Update an existing rating (only by the employer who created it, within 30 days).

**Authorization:** Employer only (must be the creator)

**Path Parameters:**
- `ratingId` (string, required) - MongoDB ObjectId of the rating

**Request Body:**
```json
{
  "detailedRatings": {
    "punctuality": 5,      // Optional: 1-5
    "quality": 5,          // Optional: 1-5
    "professionalism": 5,  // Optional: 1-5
    "communication": 5,    // Optional: 1-5
    "reliability": 5       // Optional: 1-5
  },
  "feedback": "Updated: Exceptional worker, exceeded all expectations!",  // Optional: max 1000 chars
  "wouldRecommend": true   // Optional: boolean
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating updated successfully",
  "data": {
    "_id": "64f5e8b2c9a8f123456789ab",
    "overallRating": 5.0,
    "detailedRatings": {
      "punctuality": 5,
      "quality": 5,
      "professionalism": 5,
      "communication": 5,
      "reliability": 5
    },
    "feedback": "Updated: Exceptional worker, exceeded all expectations!",
    "wouldRecommend": true,
    "updatedAt": "2023-09-04T15:45:00.000Z"
  }
}
```

### Delete Rating
**DELETE** `/api/ratings/:ratingId`

Remove a rating (marks as removed, doesn't permanently delete).

**Authorization:** Employer only (must be the creator)

**Response:**
```json
{
  "success": true,
  "message": "Rating removed successfully"
}
```

### Get Workers for Rating
**GET** `/api/gig-completions/:gigCompletionId/workers-for-rating`

Get list of workers available for rating for a specific gig completion.

**Authorization:** Employer only

**Response:**
```json
{
  "success": true,
  "data": {
    "gigCompletion": {
      "_id": "64f5e8b2c9a8f123456789cd",
      "gigRequest": {
        "_id": "64f5e8b2c9a8f123456789kl",
        "title": "Event Staff Needed"
      },
      "status": "completed",
      "completedAt": "2023-09-04T08:00:00.000Z"
    },
    "workers": [
      {
        "workerCompletionId": "64f5e8b2c9a8f123456789mn",
        "worker": {
          "_id": "64f5e8b2c9a8f123456789gh",
          "firstName": "John",
          "lastName": "Doe",
          "profilePicture": "https://example.com/profile.jpg",
          "email": "john.doe@example.com",
          "averageRating": 4.2
        },
        "payment": {
          "amount": 240,
          "status": "paid"
        },
        "completedTimeSlots": 3,
        "totalHoursWorked": 16,
        "performance": {
          "rating": 0,
          "feedback": null
        },
        "alreadyRated": false,
        "canRate": true
      }
    ],
    "summary": {
      "totalWorkers": 3,
      "workersCanRate": 2,
      "workersAlreadyRated": 1
    }
  }
}
```

## Error Responses

### Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "detailedRatings.punctuality",
      "message": "Punctuality rating must be between 1 and 5",
      "value": 6
    }
  ]
}
```

### Authorization Error
```json
{
  "success": false,
  "message": "You are not authorized to rate this gig completion"
}
```

### Duplicate Rating Error
```json
{
  "success": false,
  "message": "You have already rated this worker for this gig"
}
```

### Rating Too Old Error
```json
{
  "success": false,
  "message": "Cannot update ratings older than 30 days"
}
```

## Business Rules

### Rating Creation Rules
1. **Gig Must Be Completed** - Can only rate workers for completed or verified gigs
2. **Payment Required** - Worker must be paid before rating can be created
3. **No Duplicates** - One rating per employer per worker per gig completion
4. **Employer Authorization** - Only the employer who hired the worker can rate them

### Rating Update Rules
1. **Owner Only** - Only the employer who created the rating can update it
2. **Time Limit** - Ratings can only be updated within 30 days of creation
3. **Partial Updates** - Any combination of fields can be updated

### Rating Calculation
- **Overall Rating** = Average of all detailed ratings (punctuality, quality, professionalism, communication, reliability)
- **User Average Rating** = Average of all active ratings for the user
- **Recommendation Rate** = Percentage of ratings where wouldRecommend is true

## Integration with User Profile

When a rating is created or updated, the system automatically updates the user's employment statistics:

```json
{
  "employmentStats": {
    "averageRating": 4.3,
    "totalReviews": 25,
    "ratingBreakdown": {
      "punctuality": 4.5,
      "quality": 4.2,
      "professionalism": 4.4,
      "communication": 4.1,
      "reliability": 4.3
    },
    "recommendationRate": 88
  }
}
```

## Performance Considerations

- **Indexing** - Ratings are indexed by user, employer, and gig completion for fast queries
- **Aggregation** - Rating statistics are calculated using MongoDB aggregation pipelines
- **Caching** - Consider implementing caching for frequently accessed rating statistics
- **Pagination** - All list endpoints support pagination to handle large datasets

## Security Features

- **Authentication Required** - All endpoints require valid JWT tokens
- **Role-Based Access** - Rating creation/updates restricted to employers
- **Owner Verification** - Users can only modify their own ratings
- **Input Validation** - Comprehensive validation on all inputs
- **Soft Deletes** - Ratings are never permanently deleted for audit purposes
