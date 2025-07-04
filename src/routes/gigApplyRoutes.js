const express = require('express');
const router = express.Router();
const gigApplyController = require('../controllers/gigApplyController');
const { protect, authorize } = require('../middleware/auth');

// Public routes for job browsing
// Get applications for a specific gig request (public for viewing application count)
router.get('/gig/:gigRequestId', gigApplyController.getApplicationsByGigRequestId);

// Protected routes for authenticated users (students/job seekers)
// Get current user's applications
router.get('/my-applications', protect, authorize('user', 'job_seeker'), gigApplyController.getMyApplications);

// Apply for a gig - only users/students can apply
router.post('/', protect, authorize('user', 'job_seeker'), gigApplyController.applyForGig);

// Instant/One-click apply for a gig (mobile-optimized) - only users/students
router.post('/instant-apply', protect, authorize('user', 'job_seeker'), gigApplyController.instantApplyForGig);

// User can withdraw their own application
router.delete('/:id/withdraw', protect, authorize('user', 'job_seeker'), gigApplyController.withdrawApplication);

// Employer-specific routes (moved to employerRoutes.js but keeping these for backward compatibility)
// Get all applications for employer's gigs
router.get('/employer', protect, authorize('employer'), gigApplyController.getEmployerApplications);

// Get applications for a specific gig request (employer)
router.get('/employer/gig-request/:gigRequestId', protect, authorize('employer'), gigApplyController.getApplicationsForEmployerGig);

// Get a specific application by ID (employer)
router.get('/employer/:id', protect, authorize('employer'), gigApplyController.getApplicationByIdForEmployer);

// Update application status (employer)
router.patch('/employer/:id/status', protect, authorize('employer'), gigApplyController.updateApplicationStatusByEmployer);

// Accept/Reject applications (employer)
router.patch('/employer/:id/accept', protect, authorize('employer'), gigApplyController.acceptApplication);
router.patch('/employer/:id/reject', protect, authorize('employer'), gigApplyController.rejectApplication);

// Get applicant profile (employer)
router.get('/employer/applicant/:userId', protect, authorize('employer'), gigApplyController.getApplicantProfile);

// Get applications statistics for employer
router.get('/employer/stats', protect, authorize('employer'), gigApplyController.getEmployerApplicationsStats);

// General routes (admin access)
// Get all applications from a specific user (admin)
router.get('/user/:userId', protect, authorize('admin', 'super_admin'), gigApplyController.getApplicationsByUserId);

// Get a specific application by ID (admin)
router.get('/:id', protect, authorize('admin', 'super_admin'), gigApplyController.getApplicationById);

// Update application status (admin)
router.patch('/:id/status', protect, authorize('admin', 'super_admin'), gigApplyController.updateApplicationStatus);

// Update application feedback (admin)
router.patch('/:id/feedback', protect, authorize('admin', 'super_admin'), gigApplyController.updateApplicationFeedback);

// Delete an application (admin only)
router.delete('/:id', protect, authorize('admin', 'super_admin'), gigApplyController.deleteApplication);
router.delete('/:id', gigApplyController.deleteApplication);

module.exports = router;
