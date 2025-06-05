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

const newJobAlert = (user, gigRequest) => {
  const jobUrl = `${process.env.FRONTEND_URL}/jobs/${gigRequest._id}`;
  const distance = user.coordinates ? 
    calculateDisplayDistance(user.coordinates, gigRequest.location.coordinates) : null;
  
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4a6cf7; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🚀 New Job Alert!</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
          <p style="font-size: 16px;">Hi <strong>${user.firstName}</strong>!</p>
          <p style="font-size: 16px;">We found a new job that matches your preferences:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #4a6cf7; margin: 0 0 10px 0;">${gigRequest.title}</h2>
            <p style="margin: 5px 0;"><strong>Company:</strong> ${gigRequest.employer ? gigRequest.employer.companyName : 'Company Name'}</p>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${gigRequest.category}</p>
            <p style="margin: 5px 0;"><strong>Pay:</strong> $${gigRequest.payRate.amount} ${gigRequest.payRate.rateType}</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> ${gigRequest.location.city}${distance ? ` (${distance} away)` : ''}</p>
            <p style="margin: 5px 0;"><strong>Posted:</strong> ${new Date(gigRequest.createdAt).toLocaleDateString()}</p>
          </div>
          
          <p style="font-size: 14px; color: #666;">${gigRequest.description.substring(0, 200)}${gigRequest.description.length > 200 ? '...' : ''}</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${jobUrl}" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">View Job</a>
            <a href="${jobUrl}/apply" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Apply Now</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e9e9e9; margin: 30px 0;">
          <p style="font-size: 12px; color: #999;">You're receiving this because you have job alerts enabled. <a href="${process.env.FRONTEND_URL}/profile/notifications">Manage your notification preferences</a></p>
        </div>
      </div>
    `,
    text: `
      🚀 New Job Alert!
      
      Hi ${user.firstName}!
      
      We found a new job that matches your preferences:
      
      ${gigRequest.title}
      Company: ${gigRequest.employer ? gigRequest.employer.companyName : 'Company Name'}
      Category: ${gigRequest.category}
      Pay: $${gigRequest.payRate.amount} ${gigRequest.payRate.rateType}
      Location: ${gigRequest.location.city}${distance ? ` (${distance} away)` : ''}
      Posted: ${new Date(gigRequest.createdAt).toLocaleDateString()}
      
      Description: ${gigRequest.description.substring(0, 300)}${gigRequest.description.length > 300 ? '...' : ''}
      
      View Job: ${jobUrl}
      Apply Now: ${jobUrl}/apply
      
      You're receiving this because you have job alerts enabled.
      Manage your notification preferences: ${process.env.FRONTEND_URL}/profile/notifications
    `
  };
};

const applicationStatusUpdate = (user, gigRequest, status) => {
  const statusMessages = {
    'shortlisted': 'Congratulations! You\'ve been shortlisted',
    'hired': 'Great news! You\'ve been hired',
    'rejected': 'Unfortunately, your application was not selected'
  };
  
  const statusColors = {
    'shortlisted': '#ffc107',
    'hired': '#28a745', 
    'rejected': '#dc3545'
  };
  
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${statusColors[status] || '#4a6cf7'}; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">Application Update</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
          <p style="font-size: 16px;">Hi <strong>${user.firstName}</strong>!</p>
          <p style="font-size: 16px;">${statusMessages[status] || 'Your application status has been updated'} for:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #4a6cf7; margin: 0 0 10px 0;">${gigRequest.title}</h2>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColors[status]}; font-weight: bold;">${status.charAt(0).toUpperCase() + status.slice(1)}</span></p>
          </div>
          
          ${status === 'hired' ? `
            <p style="font-size: 16px;">Please check your dashboard for next steps and contact information.</p>
          ` : status === 'shortlisted' ? `
            <p style="font-size: 16px;">The employer will be in touch soon with more details.</p>
          ` : `
            <p style="font-size: 16px;">Don't give up! There are many other opportunities waiting for you.</p>
          `}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/applications" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Applications</a>
          </div>
        </div>
      </div>
    `,
    text: `
      Application Update
      
      Hi ${user.firstName}!
      
      ${statusMessages[status] || 'Your application status has been updated'} for:
      
      ${gigRequest.title}
      Status: ${status.charAt(0).toUpperCase() + status.slice(1)}
      
      ${status === 'hired' ? 'Please check your dashboard for next steps and contact information.' : 
        status === 'shortlisted' ? 'The employer will be in touch soon with more details.' : 
        'Don\'t give up! There are many other opportunities waiting for you.'}
      
      View Applications: ${process.env.FRONTEND_URL}/applications
    `
  };
};

const jobRecommendations = (user, recommendedJobs) => {
  const jobsHtml = recommendedJobs.slice(0, 3).map(job => `
    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
      <h3 style="color: #4a6cf7; margin: 0 0 5px 0;">${job.title}</h3>
      <p style="margin: 5px 0;"><strong>Pay:</strong> $${job.payRate.amount} ${job.payRate.rateType}</p>
      <p style="margin: 5px 0;"><strong>Location:</strong> ${job.location.city}</p>
      <a href="${process.env.FRONTEND_URL}/jobs/${job._id}" style="color: #4a6cf7;">View Details</a>
    </div>
  `).join('');
  
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4a6cf7; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">💼 Job Recommendations</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
          <p style="font-size: 16px;">Hi <strong>${user.firstName}</strong>!</p>
          <p style="font-size: 16px;">Based on your profile and preferences, we've found some jobs you might like:</p>
          
          ${jobsHtml}
          
          ${recommendedJobs.length > 3 ? `
            <p style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/jobs" style="color: #4a6cf7;">View ${recommendedJobs.length - 3} more recommendations</a>
            </p>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/jobs" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Browse All Jobs</a>
          </div>
        </div>
      </div>
    `,
    text: `
      💼 Job Recommendations
      
      Hi ${user.firstName}!
      
      Based on your profile and preferences, we've found some jobs you might like:
      
      ${recommendedJobs.slice(0, 3).map(job => `
      ${job.title}
      Pay: $${job.payRate.amount} ${job.payRate.rateType}
      Location: ${job.location.city}
      View: ${process.env.FRONTEND_URL}/jobs/${job._id}
      `).join('\n')}
      
      Browse All Jobs: ${process.env.FRONTEND_URL}/jobs
    `
  };
};

const jobClosingSoon = (user, gigRequest) => {
  return {
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ffc107; padding: 20px; text-align: center;">
          <h1 style="color: #212529; margin: 0;">⏰ Job Closing Soon</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
          <p style="font-size: 16px;">Hi <strong>${user.firstName}</strong>!</p>
          <p style="font-size: 16px;">This job you're interested in is closing soon:</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h2 style="color: #856404; margin: 0 0 10px 0;">${gigRequest.title}</h2>
            <p style="margin: 5px 0;"><strong>Deadline:</strong> ${gigRequest.applicationDeadline ? new Date(gigRequest.applicationDeadline).toLocaleDateString() : 'Soon'}</p>
          </div>
          
          <p style="font-size: 16px;">Don't miss out! Apply now if you haven't already.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/jobs/${gigRequest._id}/apply" style="background-color: #ffc107; color: #212529; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Apply Now</a>
          </div>
        </div>
      </div>
    `,
    text: `
      ⏰ Job Closing Soon
      
      Hi ${user.firstName}!
      
      This job you're interested in is closing soon:
      
      ${gigRequest.title}
      Deadline: ${gigRequest.applicationDeadline ? new Date(gigRequest.applicationDeadline).toLocaleDateString() : 'Soon'}
      
      Don't miss out! Apply now if you haven't already.
      
      Apply Now: ${process.env.FRONTEND_URL}/jobs/${gigRequest._id}/apply
    `
  };
};

// Helper function to calculate display distance
function calculateDisplayDistance(userCoords, jobCoords) {
  if (!userCoords || !jobCoords) return null;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(jobCoords.latitude - userCoords.latitude);
  const dLon = toRadians(jobCoords.longitude - userCoords.longitude);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(userCoords.latitude)) * Math.cos(toRadians(jobCoords.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance < 1 ? 
    `${Math.round(distance * 1000)}m` : 
    `${Math.round(distance * 10) / 10}km`;
}

function toRadians(degrees) {
  return degrees * (Math.PI/180);
}

module.exports = {
  welcomeEmail,
  verificationEmail,
  passwordResetEmail,
  newJobAlert,
  applicationStatusUpdate,
  jobRecommendations,
  jobClosingSoon
};