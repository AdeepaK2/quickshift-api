const sgMail = require('@sendgrid/mail');
const templates = require('../utils/emailTemplates');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class EmailService {
  constructor() {
    this.sender = {
      email: process.env.FROM_EMAIL || 'info@quickshift.com',
      name: process.env.FROM_NAME || 'QuickShift'
    };
  }

  /**
   * Send email using SendGrid
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} [options.text] - Plain text content
   */
  async sendEmail(options) {
    try {
      const msg = {
        to: options.to,
        from: this.sender,
        subject: options.subject,
        text: options.text || '',
        html: options.html
      };

      const response = await sgMail.send(msg);
      return response;
    } catch (error) {
      console.error('Email sending error:', error);
      if (error.response) {
        console.error(error.response.body);
      }
      throw error;
    }
  }

  /**
   * Send welcome email to new users
   * @param {Object} user - User object
   * @param {string} userType - User type (user, employer, admin)
   */
  async sendWelcomeEmail(user, userType) {
    const name = userType === 'employer' ? user.companyName : `${user.firstName} ${user.lastName}`;
    const template = templates.welcomeEmail(name, userType);
    
    await this.sendEmail({
      to: user.email,
      subject: 'Welcome to QuickShift! 🚀',
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send password reset OTP email
   * @param {Object} user - User object
   * @param {string} otp - OTP code
   * @param {string} userType - User type (user, employer, admin)
   */
  async sendPasswordResetOTP(user, otp, userType) {
    const name = userType === 'employer' ? user.companyName : `${user.firstName} ${user.lastName}`;
    const template = templates.passwordResetOTP(name, otp);
    
    await this.sendEmail({
      to: user.email,
      subject: 'Password Reset OTP - QuickShift',
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send login OTP email (if needed for future use)
   * @param {Object} user - User object
   * @param {string} otp - OTP code
   * @param {string} userType - User type (user, employer, admin)
   */
  async sendLoginOTP(user, otp, userType) {
    const name = userType === 'employer' ? user.companyName : `${user.firstName} ${user.lastName}`;
    const template = templates.loginOTP(name, otp);
    
    await this.sendEmail({
      to: user.email,
      subject: 'Login Verification OTP - QuickShift',
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send new job alert
   * @param {Object} user - User object
   * @param {Object} gigRequest - Gig request object
   */
  async sendNewJobAlert(user, gigRequest) {
    const template = templates.newJobAlert(user, gigRequest);
    
    await this.sendEmail({
      to: user.email,
      subject: '🚀 New Job Alert - QuickShift',
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send application status update
   * @param {Object} user - User object
   * @param {Object} gigRequest - Gig request object
   * @param {string} status - Application status
   */
  async sendApplicationStatusUpdate(user, gigRequest, status) {
    const template = templates.applicationStatusUpdate(user, gigRequest, status);
    
    await this.sendEmail({
      to: user.email,
      subject: 'Application Status Update - QuickShift',
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send job recommendations
   * @param {Object} user - User object
   * @param {Array} recommendedJobs - Array of recommended jobs
   */
  async sendJobRecommendations(user, recommendedJobs) {
    const template = templates.jobRecommendations(user, recommendedJobs);
    
    await this.sendEmail({
      to: user.email,
      subject: '💼 Job Recommendations - QuickShift',
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send job closing soon notification
   * @param {Object} user - User object
   * @param {Object} gigRequest - Gig request object
   */
  async sendJobClosingSoon(user, gigRequest) {
    const template = templates.jobClosingSoon(user, gigRequest);
    
    await this.sendEmail({
      to: user.email,
      subject: '⏰ Job Closing Soon - QuickShift',
      html: template.html,
      text: template.text
    });
  }
}

module.exports = new EmailService();