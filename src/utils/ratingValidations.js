const { body, param, validationResult } = require('express-validator');

// Validation for creating a rating
const createRatingValidation = [
  param('gigCompletionId')
    .isMongoId()
    .withMessage('Invalid gig completion ID'),
  
  param('workerCompletionId')
    .isMongoId()
    .withMessage('Invalid worker completion ID'),
  
  param('ratedUserId')
    .isMongoId()
    .withMessage('Invalid user ID'),

  body('detailedRatings.punctuality')
    .isInt({ min: 1, max: 5 })
    .withMessage('Punctuality rating must be between 1 and 5'),
  
  body('detailedRatings.quality')
    .isInt({ min: 1, max: 5 })
    .withMessage('Quality rating must be between 1 and 5'),
  
  body('detailedRatings.professionalism')
    .isInt({ min: 1, max: 5 })
    .withMessage('Professionalism rating must be between 1 and 5'),
  
  body('detailedRatings.communication')
    .isInt({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),
  
  body('detailedRatings.reliability')
    .isInt({ min: 1, max: 5 })
    .withMessage('Reliability rating must be between 1 and 5'),
  
  body('feedback')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Feedback must not exceed 1000 characters')
    .trim(),
  
  body('wouldRecommend')
    .optional()
    .isBoolean()
    .withMessage('Would recommend must be a boolean value')
];

// Validation for updating a rating
const updateRatingValidation = [
  param('ratingId')
    .isMongoId()
    .withMessage('Invalid rating ID'),

  body('detailedRatings.punctuality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Punctuality rating must be between 1 and 5'),
  
  body('detailedRatings.quality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Quality rating must be between 1 and 5'),
  
  body('detailedRatings.professionalism')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Professionalism rating must be between 1 and 5'),
  
  body('detailedRatings.communication')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),
  
  body('detailedRatings.reliability')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Reliability rating must be between 1 and 5'),
  
  body('feedback')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Feedback must not exceed 1000 characters')
    .trim(),
  
  body('wouldRecommend')
    .optional()
    .isBoolean()
    .withMessage('Would recommend must be a boolean value')
];

// Validation for user ID parameter
const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
];

// Validation for rating ID parameter
const ratingIdValidation = [
  param('ratingId')
    .isMongoId()
    .withMessage('Invalid rating ID')
];

// Middleware to check validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

module.exports = {
  createRatingValidation,
  updateRatingValidation,
  userIdValidation,
  ratingIdValidation,
  validate
};
