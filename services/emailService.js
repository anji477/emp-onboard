import nodemailer from 'nodemailer';

// Configure email transporter
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com', // Change to your SMTP server
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

export const sendInvitationEmail = async (email, name, token) => {
  const inviteLink = `http://localhost:3001/setup-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER || 'noreply@company.com',
    to: email,
    subject: 'Welcome to Employee Onboarding Portal - Set Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Welcome to Our Team!</h2>
        <p>Hi ${name},</p>
        <p>You've been invited to join our Employee Onboarding Portal. To get started, please set up your password by clicking the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" 
             style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Set Up Password
          </a>
        </div>
        <p>This link will expire in 24 hours for security reasons.</p>
        <p>If you have any questions, please contact your HR representative.</p>
        <p>Best regards,<br>HR Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Invitation email sent to:', email);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};