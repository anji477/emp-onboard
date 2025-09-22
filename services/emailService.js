import nodemailer from 'nodemailer';
import db from '../db-mysql.js';

// Get email settings from database
const getEmailSettings = async () => {
  try {
    const [settings] = await db.execute(
      'SELECT setting_value FROM organization_settings WHERE setting_key = "email_settings"'
    );
    
    if (settings.length > 0) {
      return JSON.parse(settings[0].setting_value);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return null;
  }
};

// Create transporter with current settings
const createTransporter = async () => {
  const emailSettings = await getEmailSettings();
  
  if (!emailSettings || !emailSettings.smtp_host) {
    throw new Error('Email settings not configured');
  }
  
  return nodemailer.createTransport({
    host: emailSettings.smtp_host,
    port: emailSettings.smtp_port,
    secure: emailSettings.smtp_port === 465,
    auth: {
      user: emailSettings.smtp_user,
      pass: emailSettings.smtp_password,
    },
  });
};

// Send invitation email
export const sendInvitationEmail = async (email, name, token) => {
  try {
    const transporter = await createTransporter();
    const emailSettings = await getEmailSettings();
    
    const inviteUrl = `${process.env.BASE_URL || 'http://localhost:5173'}/#/setup-password?token=${token}`;
    
    const mailOptions = {
      from: `"${emailSettings.from_name}" <${emailSettings.from_email}>`,
      to: email,
      subject: 'Welcome to Onboardly - Set Up Your Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Welcome to Onboardly!</h2>
          <p>Hi ${name},</p>
          <p>You've been invited to join our employee onboarding portal. To get started, please set up your password by clicking the link below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Set Up Password</a>
          </div>
          <p>This invitation link will expire in 24 hours.</p>
          <p>If you have any questions, please contact your HR team.</p>
          <p>Best regards,<br>The Onboardly Team</p>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
};

// Send password reset email
export const sendResetEmail = async (email, name, token) => {
  try {
    const transporter = await createTransporter();
    const emailSettings = await getEmailSettings();
    
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:5173'}/#/reset-password?token=${token}`;
    
    const mailOptions = {
      from: `"${emailSettings.from_name}" <${emailSettings.from_email}>`,
      to: email,
      subject: 'Password Reset Request - Onboardly',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>You requested a password reset for your Onboardly account. Click the link below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
          </div>
          <p>This link will expire in 1 hour for security reasons.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
          <p>Best regards,<br>The Onboardly Team</p>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending reset email:', error);
    throw error;
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    const transporter = await createTransporter();
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};