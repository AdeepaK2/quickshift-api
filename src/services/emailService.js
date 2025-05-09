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
   * @param {string} userType - User type (user or employer)
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
   * Send verification email
   * @param {Object} user - User object
   * @param {string} token - Verification token
   * @param {string} userType - User type (user or employer)
   */
  async sendVerificationEmail(user, token, userType) {
    const name = userType === 'employer' ? user.companyName : `${user.firstName} ${user.lastName}`;
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    const template = templates.verificationEmail(name, verificationUrl);
    
    await this.sendEmail({
      to: user.email,
      subject: 'Please Verify Your Email Address',
      html: template.html,
      text: template.text
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} token - Reset token
   * @param {string} userType - User type (user or employer)
   */
  async sendPasswordResetEmail(user, token, userType) {
    const name = userType === 'employer' ? user.companyName : `${user.firstName} ${user.lastName}`;
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const template = templates.passwordResetEmail(name, resetUrl);
    
    await this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: template.html,
      text: template.text
    });
  }
}

module.exports = new EmailService();