import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const isDev = process.env.NODE_ENV === 'development';

function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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

interface EnterpriseRequestEmailOptions {
  requestId: string;
  workspaceId: string;
  workspaceName: string;
  contactName: string;
  contactEmail: string;
  companyName?: string;
  expectedStorage: string;
  expectedTraffic: string;
  expectedOptimizations?: string;
  teamSize?: string;
  message?: string;
}

export const sendEnterpriseRequestEmail = async (options: EnterpriseRequestEmailOptions) => {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL || 'admin@optidrive.app';

  const {
    requestId,
    workspaceId,
    workspaceName,
    contactName,
    contactEmail,
    companyName,
    expectedStorage,
    expectedTraffic,
    expectedOptimizations,
    teamSize,
    message,
  } = options;

  const safeRequestId = escapeHtml(requestId);
  const safeWorkspaceId = escapeHtml(workspaceId);
  const safeWorkspaceName = escapeHtml(workspaceName);
  const safeContactName = escapeHtml(contactName);
  const safeContactEmail = escapeHtml(contactEmail);
  const safeCompanyName = companyName ? escapeHtml(companyName) : '';
  const safeExpectedStorage = escapeHtml(expectedStorage);
  const safeExpectedTraffic = escapeHtml(expectedTraffic);
  const safeExpectedOptimizations = expectedOptimizations ? escapeHtml(expectedOptimizations) : '';
  const safeTeamSize = teamSize ? escapeHtml(teamSize) : '';
  const safeMessage = message ? escapeHtml(message) : '';

  try {
    const { data, error } = await sendEmail({
      to: adminEmail,
      subject: `🚀 New Enterprise Request from ${safeContactName} (${safeCompanyName || safeWorkspaceName})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

            <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6;">
              <h1 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #111827;">🚀 New Enterprise Request</h1>
              <p style="margin: 0; font-size: 13px; color: #6b7280;">Request ID: <code style="background: #f3f4f6; padding: 1px 6px; border-radius: 4px;">${safeRequestId}</code></p>
            </div>

            <h3 style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Contact Information</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 140px; font-weight: 500;">Name</td>
                <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 600;">${safeContactName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Email</td>
                <td style="padding: 10px 0; font-size: 14px;"><a href="mailto:${safeContactEmail}" style="color: #6366f1; text-decoration: none;">${safeContactEmail}</a></td>
              </tr>
              ${safeCompanyName ? `<tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Company</td><td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 600;">${safeCompanyName}</td></tr>` : ''}
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Workspace</td>
                <td style="padding: 10px 0; font-size: 14px; color: #111827;">${safeWorkspaceName} <span style="color: #9ca3af; font-size: 12px;">(${safeWorkspaceId})</span></td>
              </tr>
            </table>

            <h3 style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Business Requirements</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 140px; font-weight: 500;">Storage needed</td>
                <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 700;">${safeExpectedStorage}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Monthly traffic</td>
                <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 700;">${safeExpectedTraffic}</td>
              </tr>
              ${safeExpectedOptimizations ? `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Optimizations/mo</td>
                <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 700;">${safeExpectedOptimizations}</td>
              </tr>
              ` : ''}
              ${safeTeamSize ? `<tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Team size</td><td style="padding: 10px 0; font-size: 14px; color: #111827;">${safeTeamSize} people</td></tr>` : ''}
            </table>

            ${safeMessage ? `
            <h3 style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Additional Message</h3>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">${safeMessage}</p>
            </div>
            ` : ''}

            <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #4338ca;">Next step: Process Request in Admin Panel</p>
              <p style="margin: 0; font-size: 13px; color: #6366f1; line-height: 1.7;">
                1. Open OptiDrive Admin Panel &rarr; Enterprise Requests<br>
                2. Click <strong>Approve</strong> and configure custom limits and monthly price<br>
                3. The system will automatically create a Stripe checkout link and email it to the customer.
              </p>
            </div>

            <div style="text-align: center; display: flex; gap: 12px; justify-content: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin"
                 style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">
                Open Admin Panel
              </a>
              <a href="mailto:${safeContactEmail}?subject=OptiDrive Enterprise — Your Custom Quote"
                 style="display: inline-block; background: #f3f4f6; color: #374151; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; border: 1px solid #d1d5db;">
                Reply to Client
              </a>
            </div>

          </div>
          <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">OptiDrive Admin Notification • ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    if (error) {
      console.error('Email API Error (Enterprise Request):', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending enterprise request email:', error);
    return false;
  }
};

interface EnterpriseApprovalEmailOptions {
  contactEmail: string;
  contactName: string;
  workspaceName: string;
  storageGb: number;
  bandwidthGb: number;
  optimizations: number;
  price: number;
  paymentLink: string;
  currency?: string;
}

export const sendEnterpriseApprovalEmail = async (options: EnterpriseApprovalEmailOptions) => {
  const {
    contactEmail,
    contactName,
    workspaceName,
    storageGb,
    bandwidthGb,
    optimizations,
    price,
    paymentLink,
    currency,
  } = options;

  const safeContactName = escapeHtml(contactName);
  const safeWorkspaceName = escapeHtml(workspaceName);
  const safeContactEmail = escapeHtml(contactEmail);
  const safePaymentLink = escapeHtml(paymentLink);

  const currencySymbol = (currency || 'usd').toLowerCase() === 'eur' ? '€' : '$';

  try {
    const { data, error } = await sendEmail({
      to: safeContactEmail,
      subject: `🎉 Your Enterprise Request for ${safeWorkspaceName} has been approved!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: #f9fafb;">
          <div style="background: white; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6; text-align: center;">
              <h1 style="margin: 0 0 4px; font-size: 22px; font-weight: 700; color: #111827;">🎉 Enterprise Offer Approved!</h1>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">OptiDrive has created a custom plan for <strong>${safeWorkspaceName}</strong></p>
            </div>

            <p style="font-size: 16px; color: #374151; line-height: 1.6;">Hello ${safeContactName},</p>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              We are pleased to inform you that your request for an Enterprise subscription has been reviewed and approved by our team.
              We have configured a custom package based on your requirements:
            </p>

            <h3 style="font-size: 13px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 12px;">Your Custom Limits</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; width: 180px; font-weight: 500;">Storage Space</td>
                <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 700;">${storageGb} GB</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Monthly Bandwidth</td>
                <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 700;">${bandwidthGb} GB</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; font-size: 13px; color: #6b7280; font-weight: 500;">Monthly Optimizations</td>
                <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 700;">${optimizations.toLocaleString()}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f3f4f6; background-color: #f9fafb;">
                <td style="padding: 12px 10px; font-size: 13px; color: #4f46e5; font-weight: 700;">Custom Price</td>
                <td style="padding: 12px 10px; font-size: 16px; color: #4f46e5; font-weight: 800;">${currencySymbol}${price} / month</td>
              </tr>
            </table>

            <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
              <p style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #4c1d95;">To activate your Enterprise plan, please proceed to checkout:</p>
              <a href="${safePaymentLink}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.2);">
                Pay & Activate Subscription
              </a>
            </div>

            <p style="font-size: 13px; color: #6b7280; line-height: 1.5; text-align: center; margin-top: 24px;">
              If you have any questions or require adjustments to this offer, simply reply to this email to speak directly with our team.
            </p>
          </div>
          <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 16px;">OptiDrive Support • Kyiv, Ukraine</p>
        </div>
      `,
    });

    if (error) {
      console.error('Email API Error (Enterprise Approval):', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending enterprise approval email:', error);
    return false;
  }
};
