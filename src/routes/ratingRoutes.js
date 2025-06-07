const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
// const { protect, authorize } = require('../middleware/auth'); // Commented out for testing
const { 
  createRatingValidation, 
  updateRatingValidation, 
  userIdValidation, 
  ratingIdValidation, 
  validate 
} = require('../utils/ratingValidations');

// Remove auth protection for testing
// router.use(protect);

// POST /api/ratings/gig-completion/:gigCompletionId/worker/:workerCompletionId/user/:ratedUserId
// Create a rating for a worker on a specific gig completion
router.post('/gig-completion/:gigCompletionId/worker/:workerCompletionId/user/:ratedUserId', 
  // authorize('employer'), // Commented out for testing
  createRatingValidation,
  validate,
  ratingController.createRating
);

// GET /api/ratings/user/:userId
// Get all ratings for a specific user
router.get('/user/:userId', 
  userIdValidation,
  validate,
  ratingController.getUserRatings
);

// GET /api/ratings/user/:userId/stats
// Get rating statistics for a specific user
router.get('/user/:userId/stats', 
  userIdValidation,
  validate,
  ratingController.getUserRatingStats
);

// PATCH /api/ratings/:ratingId
// Update a specific rating (only by the employer who created it)
router.patch('/:ratingId', 
  authorize('employer'), 
  updateRatingValidation,
  validate,
  ratingController.updateRating
);

// DELETE /api/ratings/:ratingId
// Remove a specific rating (only by the employer who created it)
router.delete('/:ratingId', 
  authorize('employer'), 
  ratingIdValidation,
  validate,
  ratingController.deleteRating
);

module.exports = router;
