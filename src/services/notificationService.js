const User = require('../models/user');
const emailService = require('./emailService');
const templates = require('../utils/emailTemplates');

class NotificationService {
  constructor() {
    this.emailService = emailService;
  }

  /**
   * Send job alert notifications to users based on their preferences
   * @param {Object} gigRequest - The newly created gig request
   */
  async sendJobAlertNotifications(gigRequest) {
    try {
      // Find users who should receive notifications for this job
      const interestedUsers = await this.findInterestedUsers(gigRequest);
      
      console.log(`Found ${interestedUsers.length} users interested in job: ${gigRequest.title}`);
      
      // Send notifications to each user
      for (const user of interestedUsers) {
        await this.sendJobAlertToUser(user, gigRequest);
      }
      
      return {
        success: true,
        notificationsSent: interestedUsers.length
      };
    } catch (error) {
      console.error('Error sending job alert notifications:', error);
      throw error;
    }
  }

  /**
   * Find users who should be notified about a new job
   * @param {Object} gigRequest - The gig request to match against user preferences
   * @returns {Array} Array of users who should be notified
   */
  async findInterestedUsers(gigRequest) {
    try {
      // Build query to find interested users
      const query = {
        isActive: true,
        isVerified: true,
        'notificationPreferences.newJobAlerts': true,
        'notificationPreferences.emailNotifications': true
      };

      // Get all users first, then filter based on preferences
      const users = await User.find(query);
      const interestedUsers = [];

      for (const user of users) {
        if (await this.userMatchesJobCriteria(user, gigRequest)) {
          interestedUsers.push(user);
        }
      }

      return interestedUsers;
    } catch (error) {
      console.error('Error finding interested users:', error);
      return [];
    }
  }

  /**
   * Check if a user's preferences match a job's criteria
   * @param {Object} user - User with preferences
   * @param {Object} gigRequest - Job to match against
   * @returns {Boolean} Whether the user should be notified
   */
  async userMatchesJobCriteria(user, gigRequest) {
    try {
      const prefs = user.jobAlertPreferences;
      
      // Check location distance if user has coordinates
      if (user.coordinates && user.coordinates.latitude && user.coordinates.longitude) {
        const distance = this.calculateDistance(
          user.coordinates.latitude,
          user.coordinates.longitude,
          gigRequest.location.coordinates.latitude,
          gigRequest.location.coordinates.longitude
        );
        
        if (distance > prefs.maxDistance) {
          return false;
        }
      }

      // Check category preference
      if (prefs.preferredCategories && prefs.preferredCategories.length > 0) {
        if (!prefs.preferredCategories.includes(gigRequest.category)) {
          return false;
        }
      }

      // Check pay rate preferences
      if (prefs.minPayRate && gigRequest.payRate.amount < prefs.minPayRate) {
        return false;
      }

      if (prefs.maxPayRate && gigRequest.payRate.amount > prefs.maxPayRate) {
        return false;
      }

      // Check pay rate type
      if (prefs.payRateType && gigRequest.payRate.rateType !== prefs.payRateType) {
        return false;
      }

      // Check skills match
      if (prefs.preferredSkills && prefs.preferredSkills.length > 0) {
        const hasMatchingSkill = prefs.preferredSkills.some(skill =>
          gigRequest.requirements.skills.includes(skill)
        );
        if (!hasMatchingSkill) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error matching user criteria:', error);
      return false;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {Number} lat1 - Latitude of first point
   * @param {Number} lon1 - Longitude of first point
   * @param {Number} lat2 - Latitude of second point
   * @param {Number} lon2 - Longitude of second point
   * @returns {Number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {Number} degrees - Degrees to convert
   * @returns {Number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI/180);
  }

  /**
   * Send job alert email to a specific user
   * @param {Object} user - User to notify
   * @param {Object} gigRequest - Job to notify about
   */
  async sendJobAlertToUser(user, gigRequest) {
    try {
      // Check frequency preference
      if (user.jobAlertPreferences.alertFrequency !== 'immediate') {
        // For daily/weekly alerts, we would queue these for batch processing
        // For now, we'll implement immediate alerts only
        console.log(`User ${user.email} prefers ${user.jobAlertPreferences.alertFrequency} alerts - skipping immediate notification`);
        return;
      }

      const template = templates.newJobAlert(user, gigRequest);
      
      await this.emailService.sendEmail({
        to: user.email,
        subject: `🚀 New Job Alert: ${gigRequest.title}`,
        html: template.html,
        text: template.text
      });

      console.log(`Job alert sent to ${user.email} for job: ${gigRequest.title}`);
    } catch (error) {
      console.error(`Error sending job alert to ${user.email}:`, error);
      // Don't throw - we want to continue sending to other users
    }
  }

  /**
   * Send application status update notification
   * @param {Object} user - User whose application status changed
   * @param {Object} gigRequest - The job they applied to
   * @param {String} status - New application status
   */
  async sendApplicationStatusUpdate(user, gigRequest, status) {
    try {
      if (!user.notificationPreferences.applicationUpdates || 
          !user.notificationPreferences.emailNotifications) {
        return;
      }

      const template = templates.applicationStatusUpdate(user, gigRequest, status);
      
      await this.emailService.sendEmail({
        to: user.email,
        subject: `Application Update: ${gigRequest.title}`,
        html: template.html,
        text: template.text
      });

      console.log(`Application status update sent to ${user.email}: ${status}`);
    } catch (error) {
      console.error(`Error sending application status update:`, error);
    }
  }

  /**
   * Send job recommendation notifications (for AI-powered matching)
   * @param {Object} user - User to send recommendations to
   * @param {Array} recommendedJobs - Array of recommended job requests
   */
  async sendJobRecommendations(user, recommendedJobs) {
    try {
      if (!user.notificationPreferences.jobRecommendations || 
          !user.notificationPreferences.emailNotifications ||
          !recommendedJobs.length) {
        return;
      }

      const template = templates.jobRecommendations(user, recommendedJobs);
      
      await this.emailService.sendEmail({
        to: user.email,
        subject: `💼 Personalized Job Recommendations for You`,
        html: template.html,
        text: template.text
      });

      console.log(`Job recommendations sent to ${user.email}: ${recommendedJobs.length} jobs`);
    } catch (error) {
      console.error(`Error sending job recommendations:`, error);
    }
  }

  /**
   * Send notification when a job is about to close
   * @param {Object} gigRequest - Job that's closing soon
   */
  async sendJobClosingNotification(gigRequest) {
    try {
      // Find users who have this job in their watchlist or applied to it
      const interestedUsers = await User.find({
        $or: [
          { 'watchlist': gigRequest._id },
          { '_id': { $in: gigRequest.applicants.map(app => app.user) } }
        ],
        'notificationPreferences.emailNotifications': true
      });

      for (const user of interestedUsers) {
        const template = templates.jobClosingSoon(user, gigRequest);
        
        await this.emailService.sendEmail({
          to: user.email,
          subject: `⏰ Job Closing Soon: ${gigRequest.title}`,
          html: template.html,
          text: template.text
        });
      }

      console.log(`Job closing notifications sent for: ${gigRequest.title}`);
    } catch (error) {
      console.error(`Error sending job closing notifications:`, error);
    }
  }

  /**
   * Batch process daily/weekly notifications
   * This would typically be called by a cron job
   */
  async processBatchNotifications() {
    try {
      // This would process queued notifications for users who prefer
      // daily or weekly alerts instead of immediate ones
      console.log('Processing batch notifications...');
      
      // Implementation would depend on how we store queued notifications
      // For now, this is a placeholder for future enhancement
      
    } catch (error) {
      console.error('Error processing batch notifications:', error);
    }
  }
}

module.exports = new NotificationService();
