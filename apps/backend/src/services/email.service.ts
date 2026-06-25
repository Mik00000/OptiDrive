import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const isDev = process.env.NODE_ENV === 'development';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'; // Use your verified domain here

const mailtrapTransport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER || "6a9ded8dcb2549",
    pass: process.env.MAILTRAP_PASS || "****5eed"
  }
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

const sendEmail = async ({ to, subject, html }: SendEmailOptions) => {
  if (isDev) {
    try {
      const info = await mailtrapTransport.sendMail({
        from: `"OptiDrive" <${fromEmail}>`,
        to,
        subject,
        html,
      });
      return { data: info, error: null };
    } catch (error) {
      console.error('Mailtrap Error:', error);
      return { data: null, error };
    }
  } else {
    return await resend.emails.send({
      from: `OptiDrive <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });
  }
};

export const sendVerificationEmail = async (email: string, code: string) => {
  try {
    const { data, error } = await sendEmail({
      to: email,
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
      console.error('Email API Error:', error);
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
    const { data, error } = await sendEmail({
      to: email,
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
      console.error('Email API Error:', error);
      throw new Error('Failed to send reset password email');
    }

    return data;
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw error;
  }
};

export const sendInvitationEmail = async (email: string, workspaceName: string) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;

  try {
    const { data, error } = await sendEmail({
      to: email,
      subject: `Запрошення до команди ${workspaceName} на OptiDrive`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Вас запрошено до ${workspaceName}</h1>
          <p style="font-size: 16px; color: #555;">Привіт!</p>
          <p style="font-size: 16px; color: #555;">
            Вас запросили приєднатися до робочого простору <strong>${workspaceName}</strong> на платформі OptiDrive.
          </p>
          <p style="font-size: 16px; color: #555;">Увійдіть у свій обліковий запис або зареєструйтесь, щоб прийняти запрошення:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Відкрити OptiDrive
            </a>
          </div>
          <p style="font-size: 14px; color: #888;">
            Якщо кнопка не працює, скопіюйте це посилання у ваш браузер:<br>
            <a href="${dashboardUrl}">${dashboardUrl}</a>
          </p>
          <p style="font-size: 14px; color: #888;">
            Запрошення дійсне протягом 7 днів.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Email API Error (Invite):', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending invite email:', error);
    return false;
  }
};
