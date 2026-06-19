import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'; // Use your verified domain here

export const sendVerificationEmail = async (email: string, code: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `OptiDrive <${fromEmail}>`,
      to: [email],
      subject: 'Verify your email address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Welcome to OptiDrive!</h1>
          <p style="font-size: 16px; color: #555;">
            Thank you for registering. Please use the verification code below to verify your email address and complete your registration.
          </p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <strong style="font-size: 24px; letter-spacing: 5px; color: #000;">${code}</strong>
          </div>
          <p style="font-size: 14px; color: #888;">
            This code will expire in 15 minutes. If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error('Failed to send verification email');
    }

    return data;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error; // Will be caught by auth.controller
  }
};

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `OptiDrive <${fromEmail}>`,
      to: [email],
      subject: 'Reset your OptiDrive password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p style="font-size: 16px; color: #555;">
            We received a request to reset your password. Click the button below to choose a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #888;">
            This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend API Error:', error);
      throw new Error('Failed to send reset password email');
    }

    return data;
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw error;
  }
};
