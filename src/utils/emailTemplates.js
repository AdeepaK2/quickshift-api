/**
 * Email templates for QuickShift
 */

const welcomeEmail = (name, userType) => {
  const roleSpecificText = userType === 'employer' 
    ? 'start posting jobs and finding great talent'
    : 'explore job opportunities that match your skills';
  
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4a6cf7; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to QuickShift!</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
          <p style="font-size: 16px;">Hello, <strong>${name}</strong>!</p>
          <p style="font-size: 16px;">Thank you for joining QuickShift. We're excited to have you on board!</p>
          <p style="font-size: 16px;">You can now ${roleSpecificText}.</p>
          <p style="font-size: 16px;">If you have any questions or need assistance, feel free to contact our support team.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL}" style="background-color: #4a6cf7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get Started</a>
          </div>
          <p style="font-size: 14px; margin-top: 30px; color: #666;">Best regards,<br>The QuickShift Team</p>
        </div>
      </div>
    `,
    text: `
      Welcome to QuickShift!
      
      Hello, ${name}!
      
      Thank you for joining QuickShift. We're excited to have you on board!
      
      You can now ${roleSpecificText}.
      
      If you have any questions or need assistance, feel free to contact our support team.
      
      Get Started: ${process.env.FRONTEND_URL}
      
      Best regards,
      The QuickShift Team
    `
  };
};

const verificationEmail = (name, verificationUrl) => {
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4a6cf7; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Verify Your Email</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
          <p style="font-size: 16px;">Hello, <strong>${name}</strong>!</p>
          <p style="font-size: 16px;">Thank you for registering with QuickShift. To complete your registration, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${verificationUrl}" style="background-color: #4a6cf7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p style="font-size: 16px; margin-top: 20px;">If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p style="font-size: 14px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${verificationUrl}</p>
          <p style="font-size: 16px;">This link will expire in 24 hours for security reasons.</p>
          <p style="font-size: 14px; margin-top: 30px; color: #666;">Best regards,<br>The QuickShift Team</p>
        </div>
      </div>
    `,
    text: `
      Verify Your Email
      
      Hello, ${name}!
      
      Thank you for registering with QuickShift. To complete your registration, please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours for security reasons.
      
      Best regards,
      The QuickShift Team
    `
  };
};

const passwordResetEmail = (name, resetUrl) => {
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4a6cf7; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
          <p style="font-size: 16px;">Hello, <strong>${name}</strong>!</p>
          <p style="font-size: 16px;">We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <p style="font-size: 16px;">To reset your password, click the button below:</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${resetUrl}" style="background-color: #4a6cf7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          <p style="font-size: 16px; margin-top: 20px;">If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p style="font-size: 14px; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${resetUrl}</p>
          <p style="font-size: 16px;">This link will expire in 1 hour for security reasons.</p>
          <p style="font-size: 14px; margin-top: 30px; color: #666;">Best regards,<br>The QuickShift Team</p>
        </div>
      </div>
    `,
    text: `
      Password Reset
      
      Hello, ${name}!
      
      We received a request to reset your password. If you didn't make this request, you can safely ignore this email.
      
      To reset your password, click the link below:
      
      ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      Best regards,
      The QuickShift Team
    `
  };
};

module.exports = {
  welcomeEmail,
  verificationEmail,
  passwordResetEmail
};