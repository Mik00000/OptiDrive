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

export const sendEmailChangeVerificationEmail = async (newEmail: string, code: string) => {
  try {
    const { data, error } = await sendEmail({
      to: newEmail,
      subject: 'Confirm your new email address – OptiDrive',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">Confirm Your New Email</h1>
          <p style="font-size: 16px; color: #555;">
            You requested to change your OptiDrive account email to <strong>${newEmail}</strong>.
            Use the verification code below to confirm this change.
          </p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <strong style="font-size: 28px; letter-spacing: 6px; color: #000;">${code}</strong>
          </div>
          <p style="font-size: 14px; color: #888;">
            This code will expire in 15 minutes. If you did not request this change, you can safely ignore this email — your account email will remain unchanged.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Email API Error:', error);
      throw new Error('Failed to send email change verification');
    }

    return data;
  } catch (error) {
    console.error('Error sending email change verification:', error);
    throw error;
  }
};

export const sendInvitationEmail = async (email: string, workspaceName: string) => {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;

  try {
    const { data, error } = await sendEmail({
      to: email,
      subject: `Invitation to join ${workspaceName} on OptiDrive`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">You are invited to join ${workspaceName}</h1>
          <p style="font-size: 16px; color: #555;">Hello!</p>
          <p style="font-size: 16px; color: #555;">
            You have been invited to join the workspace <strong>${workspaceName}</strong> on the OptiDrive platform.
          </p>
          <p style="font-size: 16px; color: #555;">Please log in or sign up to accept the invitation:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Open OptiDrive
            </a>
          </div>
          <p style="font-size: 14px; color: #888;">
            If the button above does not work, copy and paste this link into your browser:<br>
            <a href="${dashboardUrl}">${dashboardUrl}</a>
          </p>
          <p style="font-size: 14px; color: #888;">
            This invitation is valid for 7 days.
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

export const sendQuotaWarningEmail = async (
  email: string,
  workspaceName: string,
  type: 'storage' | 'bandwidth' | 'optimizations',
  percent: number,
  currentVal: string,
  limitVal: string
) => {
  const subjectMap = {
    storage: `Warning: Workspace ${workspaceName} storage is ${percent}% full`,
    bandwidth: `Warning: Workspace ${workspaceName} bandwidth usage is at ${percent}%`,
    optimizations: `Warning: Workspace ${workspaceName} optimizations usage is at ${percent}%`
  };

  const nameMap = {
    storage: 'Storage Space',
    bandwidth: 'Bandwidth Limit',
    optimizations: 'Monthly Optimizations'
  };

  const severity = percent >= 100 ? 'CRITICAL' : 'Warning';

  try {
    const { data, error } = await sendEmail({
      to: email,
      subject: `[${severity}] ${subjectMap[type] || 'OptiDrive Limit Warning'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${percent >= 100 ? '#ef4444' : '#f59e0b'};">${severity}: Workspace Limit Reached</h2>
          <p style="font-size: 16px; color: #555;">Hello!</p>
          <p style="font-size: 16px; color: #555;">
            This is a notification that your workspace <strong>${workspaceName}</strong> has reached <strong>${percent}%</strong> of its limit for the resource: <strong>${nameMap[type]}</strong>.
          </p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Current Usage:</strong> ${currentVal}</p>
            <p style="margin: 5px 0;"><strong>Max Limit:</strong> ${limitVal}</p>
            <p style="margin: 5px 0;"><strong>Usage Percentage:</strong> ${percent}%</p>
          </div>
          ${percent >= 100 
            ? `<p style="font-size: 15px; color: #b91c1c; font-weight: bold;">Please upgrade your plan or delete unnecessary files to restore full service functionality.</p>`
            : `<p style="font-size: 15px; color: #555;">To prevent service interruption and avoid blocks on image compression/delivery, we recommend upgrading your limits in advance.</p>`
          }
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Manage Subscription
            </a>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Email API Error (Quota Warning):', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending quota warning email:', error);
    return false;
  }
};

export const sendSecurityAlertEmail = async (
  email: string,
  userName: string,
  actionType: string,
  actionDetails: string
) => {
  try {
    const { data, error } = await sendEmail({
      to: email,
      subject: `[Security] Security action notification in your OptiDrive account`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #3b82f6;">Account Security Alert</h2>
          <p style="font-size: 16px; color: #555;">Hello, ${userName || 'user'}!</p>
          <p style="font-size: 16px; color: #555;">
            An important security action has been performed in your OptiDrive account:
          </p>
          <div style="background-color: #f4f4f4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Action:</strong> ${actionType}</p>
            <p style="margin: 5px 0;"><strong>Details:</strong> ${actionDetails}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="font-size: 14px; color: #888;">
            If you did not perform this action, please change your profile password immediately and review your API keys and team members list.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Email API Error (Security Alert):', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending security email:', error);
    return false;
  }
};

export const sendBillingFailedEmail = async (
  email: string,
  workspaceName: string,
  declineReason: string
) => {
  try {
    const { data, error } = await sendEmail({
      to: email,
      subject: `[Important] Subscription payment failed for workspace ${workspaceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ef4444;">Payment Failed for Workspace ${workspaceName}</h2>
          <p style="font-size: 16px; color: #555;">Hello!</p>
          <p style="font-size: 16px; color: #555;">
            We were unable to process the recurring payment for your <strong>PRO plan</strong> subscription in the workspace <strong>${workspaceName}</strong>.
          </p>
          <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">Reason: ${declineReason}</p>
          </div>
          <p style="font-size: 15px; color: #555;">
            Please update your payment method to keep your PRO features active. If the issue is not resolved, your workspace will be downgraded to the FREE plan.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Update Payment Method
            </a>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Email API Error (Billing Failed):', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending billing failed email:', error);
    return false;
  }
};

export const sendSubscriptionCancelledEmail = async (
  email: string,
  workspaceName: string
) => {
  try {
    const { data, error } = await sendEmail({
      to: email,
      subject: `Subscription cancelled for workspace ${workspaceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6b7280;">Subscription Cancelled</h2>
          <p style="font-size: 16px; color: #555;">Hello!</p>
          <p style="font-size: 16px; color: #555;">
            The PRO plan subscription for workspace <strong>${workspaceName}</strong> has been cancelled and your workspace has been downgraded to the <strong>FREE plan</strong>.
          </p>
          <p style="font-size: 15px; color: #555;">
            Your storage quota is now limited to 1 GB. If you exceed this limit, your file optimizations and uploads may be temporarily blocked until you free up space or upgrade again.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Re-subscribe to PRO
            </a>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Email API Error (Subscription Cancelled):', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending subscription cancelled email:', error);
    return false;
  }
};
export const sendPaymentPastDueEmail = async (
  email: string,
  workspaceName: string
) => {
  const billingUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing`;

  try {
    const { data, error } = await sendEmail({
      to: email,
      subject: `[Action Required] Update your payment method for workspace ${workspaceName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #f59e0b;">⚠️ Payment Overdue — Action Required</h2>
          <p style="font-size: 16px; color: #555;">Hello!</p>
          <p style="font-size: 16px; color: #555;">
            We were unable to process a recurring payment for your <strong>PRO plan</strong> in workspace <strong>${workspaceName}</strong>. 
            Your subscription is currently marked as <strong>past due</strong>.
          </p>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-weight: bold;">Stripe will automatically retry the payment. If it fails again, your workspace will be downgraded to the FREE plan.</p>
          </div>
          <p style="font-size: 15px; color: #555;">
            To prevent service interruption, please update your payment method as soon as possible:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${billingUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Update Payment Method
            </a>
          </div>
          <p style="font-size: 14px; color: #888;">
            You can manage your payment methods and view invoices via the Stripe billing portal on the Billing page.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Email API Error (Past Due):', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending past_due email:', error);
    return false;
  }
};
