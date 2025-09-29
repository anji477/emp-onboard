// services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
let transporter = null;

const createTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
};

export const sendMfaEmail = async (email, otpCode) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`MFA OTP for ${email}: ${otpCode} (Email not configured)`);
      return false;
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.MFA_SERVICE_NAME || 'Employee Portal'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your MFA Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Verification Code</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Hello,</p>
            <p>Your verification code for ${process.env.MFA_SERVICE_NAME || 'Employee Portal'} is:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; padding: 15px 30px; border: 2px dashed #667eea; display: inline-block;">
                ${otpCode}
              </span>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from ${process.env.MFA_SERVICE_NAME || 'Employee Portal'}. Please do not reply.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`MFA OTP sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending MFA email:', error);
    console.log(`MFA OTP for ${email}: ${otpCode} (Email failed)`);
    return false;
  }
};

export const sendInvitationEmail = async (email, name, token) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`Invitation token for ${email}: ${token} (Email not configured)`);
      return false;
    }

    const transporter = createTransporter();
    const inviteUrl = `${process.env.BASE_URL || 'http://localhost:5173'}/setup-password/${token}`;
    
    const mailOptions = {
      from: `"${process.env.MFA_SERVICE_NAME || 'Employee Portal'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome! Complete Your Account Setup',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to ${process.env.MFA_SERVICE_NAME || 'Employee Portal'}</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Hello ${name},</p>
            <p>You've been invited to join ${process.env.MFA_SERVICE_NAME || 'Employee Portal'}. Click the button below to set up your password and complete your account:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Set Up Account
              </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${inviteUrl}</p>
            <p>This invitation will expire in 24 hours.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from ${process.env.MFA_SERVICE_NAME || 'Employee Portal'}. Please do not reply.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Invitation sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
};

export const sendResetEmail = async (email, name, token) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`Reset token for ${email}: ${token} (Email not configured)`);
      return false;
    }

    const transporter = createTransporter();
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:5173'}/reset-password/${token}`;
    
    const mailOptions = {
      from: `"${process.env.MFA_SERVICE_NAME || 'Employee Portal'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Password Reset</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Hello ${name},</p>
            <p>You requested a password reset for your ${process.env.MFA_SERVICE_NAME || 'Employee Portal'} account. Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              This is an automated message from ${process.env.MFA_SERVICE_NAME || 'Employee Portal'}. Please do not reply.
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending reset email:', error);
    return false;
  }
};

export const testEmailConfig = async (testEmail, emailSettings = null) => {
  try {
    // Use provided settings or fall back to environment variables
    const config = emailSettings || {
      smtp_host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      smtp_port: parseInt(process.env.EMAIL_PORT) || 587,
      smtp_user: process.env.EMAIL_USER,
      smtp_password: process.env.EMAIL_PASS,
      from_email: process.env.EMAIL_USER,
      from_name: process.env.MFA_SERVICE_NAME || 'Employee Portal'
    };

    if (!config.smtp_user || !config.smtp_password) {
      return { success: false, message: 'Email credentials not configured. For Gmail: 1) Enable 2FA, 2) Generate App Password, 3) Use App Password (not regular password)' };
    }

    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: config.smtp_port,
      secure: config.smtp_port === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password
      }
    });
    
    // Verify connection
    await transporter.verify();
    
    // Send test email if testEmail provided, otherwise just verify connection
    if (testEmail) {
      await transporter.sendMail({
        from: `"${config.from_name}" <${config.from_email}>`,
        to: testEmail,
      subject: 'Email Configuration Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Email Test</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <p>Congratulations!</p>
            <p>Your email configuration is working correctly.</p>
            <p>This test was sent at: ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `
      });
      return { success: true, message: 'Test email sent successfully' };
    } else {
      return { success: true, message: 'SMTP connection verified successfully' };
    }
  } catch (error) {
    console.error('Email test failed:', error);
    return { success: false, message: error.message };
  }
};