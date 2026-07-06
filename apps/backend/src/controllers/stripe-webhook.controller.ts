import { Request, Response } from 'express';
import { stripe } from '../config/stripe';
import { prisma } from '../config/prisma';
import Stripe from 'stripe';

import fs from 'fs';
import path from 'path';

// Функція для логування у файл для відладки
const logDebug = (message: string) => {
  const logPath = path.join(__dirname, '../../stripe-webhook-debug.log');
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
};

/**
 * POST /api/webhook
 * Обробляє вебхуки від Stripe (підпис перевіряється через raw body)
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  logDebug(`Received webhook request. Signature: ${sig ? 'present' : 'missing'}, Secret: ${webhookSecret ? 'present' : 'missing'}`);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    logDebug(`Event constructed successfully: ${event.type}`);
  } catch (err: any) {
    logDebug(`Signature verification failed: ${err.message}`);
    console.error('[Stripe Webhook] Signature verification failed:', err.message);
    res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    return;
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        logDebug(`Processing checkout.session.completed for session: ${session.id}`);
        await handleCheckoutCompleted(session);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        logDebug(`Processing invoice.payment_succeeded for invoice: ${invoice.id}`);
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        logDebug(`Processing invoice.payment_failed for invoice: ${invoice.id}`);
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        logDebug(`Processing customer.subscription.deleted for subscription: ${subscription.id}`);
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        logDebug(`Processing customer.subscription.updated for subscription: ${subscription.id}`);
        await handleSubscriptionUpdated(subscription);
        break;
      }

      default:
        logDebug(`Unhandled event type: ${event.type}`);
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    logDebug(`Error processing ${event.type}: ${error.message}`);
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, error);
    // Повертаємо 200, щоб Stripe не ретраїв (помилку логуємо)
    res.json({ received: true, error: error.message });
  }
};

/**
 * Допоміжна функція: отримує current_period_end з items підписки
 * (у новій версії Stripe API current_period_end перенесено на SubscriptionItem)
 */
async function getSubscriptionPeriodEnd(subscriptionId: string): Promise<Date | null> {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data'],
    });
    
    // current_period_end тепер на items
    const firstItem = subscription.items?.data?.[0];
    if (firstItem && firstItem.current_period_end) {
      return new Date(firstItem.current_period_end * 1000);
    }
    
    return null;
  } catch (e: any) {
    logDebug(`Error retrieving subscription period end: ${e.message}`);
    return null;
  }
}

/**
 * checkout.session.completed — юзер успішно оплатив через Checkout
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspaceId;

  if (!workspaceId) {
    logDebug('[handleCheckoutCompleted] No workspaceId in checkout session metadata');
    console.error('[Stripe Webhook] No workspaceId in checkout session metadata');
    return;
  }

  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  if (!subscriptionId) {
    logDebug('[handleCheckoutCompleted] No subscription ID in checkout session');
    console.error('[Stripe Webhook] No subscription ID in checkout session');
    return;
  }

  // Отримуємо current_period_end з items підписки
  const periodEnd = await getSubscriptionPeriodEnd(subscriptionId);

  const enterpriseRequestId = session.metadata?.enterpriseRequestId;
  const isEnterprise = session.metadata?.plan === 'ENTERPRISE' || !!enterpriseRequestId;

  if (isEnterprise) {
    let approvedStorageGb = 250;
    let approvedBandwidthGb = 2000;
    let approvedOptimizations = 100000;

    if (enterpriseRequestId) {
      const entReq = await prisma.enterpriseRequest.findUnique({
        where: { id: enterpriseRequestId }
      });
      if (entReq) {
        if (entReq.approvedStorageGb) approvedStorageGb = entReq.approvedStorageGb;
        if (entReq.approvedBandwidthGb) approvedBandwidthGb = entReq.approvedBandwidthGb;
        if (entReq.approvedOptimizations) approvedOptimizations = entReq.approvedOptimizations;
      }
    }

    const GB = 1024 * 1024 * 1024;
    const storageBytes = BigInt(approvedStorageGb * GB);
    const bandwidthBytes = BigInt(approvedBandwidthGb * GB);

    logDebug(`[handleCheckoutCompleted] Updating workspace ${workspaceId} to ENTERPRISE. Subscription: ${subscriptionId}, Period End: ${periodEnd}`);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan: 'ENTERPRISE',
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'active',
        stripeCustomerId: typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null,
        currentPeriodEnd: periodEnd,
        enterpriseStorageBytes: storageBytes,
        enterpriseBandwidthBytes: bandwidthBytes,
        enterpriseOptimizations: approvedOptimizations,
      },
    });

    if (enterpriseRequestId) {
      await prisma.enterpriseRequest.update({
        where: { id: enterpriseRequestId },
        data: { status: 'CONVERTED' }
      });
    }

    // Скасовуємо стару підписку PRO, якщо вона існувала, щоб уникнути подвійного списання
    const cancelSubscriptionId = session.metadata?.cancelSubscriptionId;
    if (cancelSubscriptionId) {
      try {
        logDebug(`[handleCheckoutCompleted] Cancelling old PRO subscription: ${cancelSubscriptionId}`);
        await stripe.subscriptions.cancel(cancelSubscriptionId);
        
        await prisma.activityLog.create({
          data: {
            type: 'SETTING_CHANGED',
            description: `Cancelled old PRO subscription (${cancelSubscriptionId}) due to Enterprise upgrade`,
            workspaceId,
          },
        });
      } catch (err: any) {
        console.error('[Stripe Webhook] Error cancelling old PRO subscription:', err.message);
      }
    }

    // Логуємо апгрейд
    await prisma.activityLog.create({
      data: {
        type: 'PLAN_UPGRADED',
        description: `Workspace upgraded to ENTERPRISE plan. Limits: ${approvedStorageGb} GB Storage, ${approvedBandwidthGb} GB Bandwidth, ${approvedOptimizations} Optimizations/month`,
        workspaceId,
      },
    });

    logDebug(`[handleCheckoutCompleted] Workspace ${workspaceId} successfully upgraded to ENTERPRISE`);
    console.log(`[Stripe Webhook] Workspace ${workspaceId} upgraded to ENTERPRISE`);
  } else {
    logDebug(`[handleCheckoutCompleted] Updating workspace ${workspaceId} to PRO. Subscription: ${subscriptionId}, Period End: ${periodEnd}`);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan: 'PRO',
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'active',
        stripeCustomerId: typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null,
        currentPeriodEnd: periodEnd,
      },
    });

    // Логуємо апгрейд
    await prisma.activityLog.create({
      data: {
        type: 'PLAN_UPGRADED',
        description: 'Workspace upgraded to PRO plan',
        workspaceId,
      },
    });

    logDebug(`[handleCheckoutCompleted] Workspace ${workspaceId} successfully upgraded to PRO`);
    console.log(`[Stripe Webhook] Workspace ${workspaceId} upgraded to PRO`);
  }
}

/**
 * invoice.payment_succeeded — рекурентний платіж пройшов
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Зчитуємо ID підписки, щоб можна було завантажити її метадані
  const rawSub = (invoice as any).subscription || invoice.parent?.subscription_details?.subscription;
  const subscriptionId = typeof rawSub === 'string' ? rawSub : (rawSub as any)?.id || null;

  // Спочатку шукаємо workspaceId у метаданих самого інвойсу або в деталях підписки в інвойсі
  let metadataWorkspaceId = invoice.metadata?.workspaceId || (invoice as any).subscription_details?.metadata?.workspaceId;
  let metadataPlan = invoice.metadata?.plan || (invoice as any).subscription_details?.metadata?.plan;

  // Якщо немає в метаданих інвойсу, але є підписка — завантажуємо метадані підписки з Stripe API
  if (!metadataWorkspaceId && subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      metadataWorkspaceId = subscription.metadata?.workspaceId;
      metadataPlan = subscription.metadata?.plan;
      logDebug(`[handleInvoicePaymentSucceeded] Retrieved subscription metadata: workspaceId=${metadataWorkspaceId}, plan=${metadataPlan}`);
    } catch (e: any) {
      logDebug(`[handleInvoicePaymentSucceeded] Error retrieving subscription metadata: ${e.message}`);
    }
  }

  if (metadataWorkspaceId) {
    logDebug(`[handleInvoicePaymentSucceeded] Found workspaceId: ${metadataWorkspaceId}`);
    
    const workspace = await prisma.workspace.findUnique({
      where: { id: metadataWorkspaceId },
    });

    if (!workspace) {
      logDebug(`[handleInvoicePaymentSucceeded] Workspace not found for workspaceId: ${metadataWorkspaceId}`);
      console.error(`[Stripe Webhook] Workspace not found for workspaceId: ${metadataWorkspaceId}`);
      return;
    }

    // Визначаємо план: якщо вказано в метаданих — використовуємо його, інакше зберігаємо поточний план воркспейсу або за замовчуванням ставимо PRO
    const planToSet = (metadataPlan === 'PRO' || metadataPlan === 'FREE' || metadataPlan === 'ENTERPRISE')
      ? metadataPlan
      : (workspace.plan === 'ENTERPRISE' ? 'ENTERPRISE' : 'PRO');
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null;

    let periodEnd: Date | null = null;
    if (subscriptionId) {
      periodEnd = await getSubscriptionPeriodEnd(subscriptionId);
    }
    if (!periodEnd && invoice.lines?.data?.[0]?.period?.end) {
      periodEnd = new Date(invoice.lines.data[0].period.end * 1000);
    }
    if (!periodEnd) {
      const date = new Date();
      date.setMonth(date.getMonth() + 1);
      periodEnd = date;
    }

    logDebug(`[handleInvoicePaymentSucceeded] Updating workspace ${workspace.id} to plan: ${planToSet} via metadata. Customer: ${customerId}, Subscription: ${subscriptionId}, Period End: ${periodEnd}`);

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        plan: planToSet,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'active',
        currentPeriodEnd: periodEnd,
        gracePeriodStartedAt: null,
      },
    });

    // Оновлюємо статус EnterpriseRequest на CONVERTED, якщо є активні запити
    if (planToSet === 'ENTERPRISE') {
      try {
        await prisma.enterpriseRequest.updateMany({
          where: {
            workspaceId: workspace.id,
            status: { in: ['PENDING', 'CONTACTED', 'APPROVED'] },
          },
          data: {
            status: 'CONVERTED',
          },
        });
      } catch (err: any) {
        logDebug(`[handleInvoicePaymentSucceeded] Error updating enterprise requests: ${err.message}`);
      }
    }

    await prisma.activityLog.create({
      data: {
        type: 'PLAN_UPGRADED',
        description: `Workspace upgraded to ${planToSet} plan via custom invoice payment`,
        workspaceId: workspace.id,
      },
    });

    logDebug(`[handleInvoicePaymentSucceeded] Workspace ${workspace.id} successfully updated to ${planToSet}`);
    console.log(`[Stripe Webhook] Workspace ${workspace.id} upgraded to ${planToSet} via metadata`);
    return;
  }

  // subscriptionId вже успішно розраховано на початку функції handleInvoicePaymentSucceeded

  if (!subscriptionId) {
    logDebug('[handleInvoicePaymentSucceeded] No subscription ID found in invoice');
    return;
  }

  // Знаходимо воркспейс за subscription ID
  let workspace = await prisma.workspace.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  // Резервний варіант: шукаємо за customer ID, якщо підписка ще не асоційована
  if (!workspace && invoice.customer) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
    logDebug(`[handleInvoicePaymentSucceeded] Workspace not found by subscription, trying customerId: ${customerId}`);
    workspace = await prisma.workspace.findFirst({
      where: { stripeCustomerId: customerId },
    });
  }

  if (!workspace) {
    logDebug(`[handleInvoicePaymentSucceeded] No workspace found for subscription ${subscriptionId}`);
    console.log(`[Stripe Webhook] No workspace found for subscription ${subscriptionId}`);
    return;
  }

  // Отримуємо current_period_end з items підписки
  const periodEnd = await getSubscriptionPeriodEnd(subscriptionId);
  logDebug(`[handleInvoicePaymentSucceeded] Extending period for workspace ${workspace.id} to ${periodEnd}`);

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      plan: 'PRO',
      stripeSubscriptionId: subscriptionId, // Зберігаємо на випадок, якщо це перший платіж
      subscriptionStatus: 'active',
      currentPeriodEnd: periodEnd,
    },
  });

  logDebug(`[handleInvoicePaymentSucceeded] Workspace ${workspace.id} extended successfully`);
  console.log(`[Stripe Webhook] Payment succeeded for workspace ${workspace.id}, period extended`);
}

/**
 * customer.subscription.deleted — підписка скасована або закінчилась
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  let workspace = await prisma.workspace.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!workspace && subscription.customer) {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    logDebug(`[handleSubscriptionDeleted] Workspace not found by subscription, trying customerId: ${customerId}`);
    workspace = await prisma.workspace.findFirst({
      where: { stripeCustomerId: customerId },
    });
  }

  if (!workspace) {
    logDebug(`[handleSubscriptionDeleted] No workspace found for subscription ${subscription.id}`);
    console.log(`[Stripe Webhook] No workspace found for subscription ${subscription.id}`);
    return;
  }

  logDebug(`[handleSubscriptionDeleted] Downgrading workspace ${workspace.id} to FREE`);

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: {
      plan: 'FREE',
      stripeSubscriptionId: null,
      subscriptionStatus: 'canceled',
      currentPeriodEnd: null,
    },
  });

  // Логуємо даунгрейд
  await prisma.activityLog.create({
    data: {
      type: 'PLAN_DOWNGRADED',
      description: 'Workspace downgraded to FREE plan — subscription cancelled',
      workspaceId: workspace.id,
    },
  });

  // Відправляємо email користувачам воркспейсу
  try {
    const members = await prisma.workspaceUser.findMany({
      where: {
        workspaceId: workspace.id,
        user: {
          emailBillingAlerts: true,
        },
      },
      include: {
        user: true,
      },
    });

    const { sendSubscriptionCancelledEmail } = await import('../services/email.service');
    for (const member of members) {
      if (member.user.email) {
        await sendSubscriptionCancelledEmail(member.user.email, workspace.name);
        logDebug(`[handleSubscriptionDeleted] Sent subscription cancelled email to: ${member.user.email}`);
      }
    }
  } catch (err: any) {
    logDebug(`[handleSubscriptionDeleted] Error sending cancellation emails: ${err.message}`);
  }

  logDebug(`[handleSubscriptionDeleted] Workspace ${workspace.id} downgraded successfully`);
  console.log(`[Stripe Webhook] Workspace ${workspace.id} downgraded to FREE`);
}

/**
 * customer.subscription.updated — зміна статусу підписки
 * (наприклад, past_due якщо оплата не пройшла)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  let workspace = await prisma.workspace.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!workspace && subscription.customer) {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    logDebug(`[handleSubscriptionUpdated] Workspace not found by subscription, trying customerId: ${customerId}`);
    workspace = await prisma.workspace.findFirst({
      where: { stripeCustomerId: customerId },
    });
  }

  if (!workspace) {
    logDebug(`[handleSubscriptionUpdated] No workspace found for subscription ${subscription.id}`);
    return;
  }

  logDebug(`[handleSubscriptionUpdated] Subscription status updated: ${subscription.status} for workspace ${workspace.id}`);

  if (subscription.status === 'past_due') {
    // past_due: зберігаємо статус, але НЕ скидаємо план.
    // Stripe буде робити повторні спроби. Email вже відправлений через invoice.payment_failed.
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { 
        subscriptionStatus: 'past_due',
        gracePeriodStartedAt: workspace.gracePeriodStartedAt || new Date(),
      },
    });

    // Відправляємо email-нагадування оновити картку
    try {
      const members = await prisma.workspaceUser.findMany({
        where: { workspaceId: workspace.id, user: { emailBillingAlerts: true } },
        include: { user: true },
      });

      const { sendPaymentPastDueEmail } = await import('../services/email.service');
      for (const member of members) {
        if (member.user.email) {
          await sendPaymentPastDueEmail(member.user.email, workspace.name);
          logDebug(`[handleSubscriptionUpdated] Sent past_due email to: ${member.user.email}`);
        }
      }
    } catch (err: any) {
      logDebug(`[handleSubscriptionUpdated] Error sending past_due emails: ${err.message}`);
    }

    logDebug(`[handleSubscriptionUpdated] Workspace ${workspace.id} marked as past_due`);
    console.log(`[Stripe Webhook] Workspace ${workspace.id} is past_due — user notified`);

  } else if (subscription.status === 'unpaid' || subscription.status === 'canceled') {
    // unpaid/canceled: остаточний даунгрейд до FREE
    if (workspace.plan === 'PRO') {
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          plan: 'FREE',
          stripeSubscriptionId: null,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: null,
        },
      });

      await prisma.activityLog.create({
        data: {
          type: 'PLAN_DOWNGRADED',
          description: `Workspace downgraded to FREE plan due to subscription status: ${subscription.status}`,
          workspaceId: workspace.id,
        },
      });

      try {
        const members = await prisma.workspaceUser.findMany({
          where: { workspaceId: workspace.id, user: { emailBillingAlerts: true } },
          include: { user: true },
        });

        const { sendSubscriptionCancelledEmail } = await import('../services/email.service');
        for (const member of members) {
          if (member.user.email) {
            await sendSubscriptionCancelledEmail(member.user.email, workspace.name);
          }
        }
      } catch (err: any) {
        logDebug(`[handleSubscriptionUpdated] Error sending emails: ${err.message}`);
      }

      logDebug(`[handleSubscriptionUpdated] Workspace ${workspace.id} downgraded due to status ${subscription.status}`);
      console.log(`[Stripe Webhook] Workspace ${workspace.id} downgraded due to ${subscription.status}`);
    }
  } else if (subscription.status === 'active') {
    // Підписка активна (повернулась після past_due або звичайне оновлення)
    const periodEnd = await getSubscriptionPeriodEnd(subscription.id);
    logDebug(`[handleSubscriptionUpdated] Subscription active, updating period end to ${periodEnd}`);

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        plan: 'PRO',
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: 'active',
        currentPeriodEnd: periodEnd,
        gracePeriodStartedAt: null,
      },
    });
    logDebug(`[handleSubscriptionUpdated] Workspace ${workspace.id} updated to active`);
  } else {
    // Інші статуси (trialing, paused тощо) — просто зберігаємо
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { subscriptionStatus: subscription.status },
    });
    logDebug(`[handleSubscriptionUpdated] Workspace ${workspace.id} status updated to ${subscription.status}`);
  }
}

/**
 * invoice.payment_failed — платіж за підписку не пройшов
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  let subscriptionId: string | null = null;
  
  if (invoice.parent?.subscription_details?.subscription) {
    const sub = invoice.parent.subscription_details.subscription;
    subscriptionId = typeof sub === 'string' ? sub : sub.id;
  }

  if (!subscriptionId) {
    logDebug('[handleInvoicePaymentFailed] No subscription ID found in invoice');
    return;
  }

  let workspace = await prisma.workspace.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!workspace && invoice.customer) {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
    workspace = await prisma.workspace.findFirst({
      where: { stripeCustomerId: customerId },
    });
  }

  if (!workspace) {
    logDebug(`[handleInvoicePaymentFailed] No workspace found for subscription ${subscriptionId}`);
    return;
  }

  let declineReason = 'Unknown payment issue (Помилка платежу)';
  
  let paymentIntentId: string | null = null;
  if ((invoice as any).payment_intent) {
    paymentIntentId = (invoice as any).payment_intent;
  } else if (invoice.payments?.data?.[0]?.payment?.payment_intent) {
    const pi = invoice.payments.data[0].payment.payment_intent;
    paymentIntentId = typeof pi === 'string' ? pi : pi.id;
  }

  if (paymentIntentId) {
    try {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.last_payment_error) {
        const code = pi.last_payment_error.code;
        const declineCode = pi.last_payment_error.decline_code;
        
        logDebug(`[handleInvoicePaymentFailed] Payment error code: ${code}, decline_code: ${declineCode}`);

        if (declineCode === 'insufficient_funds') {
          declineReason = 'Недостатньо коштів на картці (Insufficient funds)';
        } else if (declineCode === 'expired_card') {
          declineReason = 'Картка прострочена (Expired card)';
        } else if (declineCode === 'incorrect_cvc') {
          declineReason = 'Невірний CVC-код (Incorrect CVC)';
        } else if (declineCode === 'fraudulent') {
          declineReason = 'Блокування: Підозра на шахрайство (Block: Suspected fraud)';
        } else {
          declineReason = pi.last_payment_error.message || 'Payment declined by bank';
        }
      }
    } catch (e: any) {
      logDebug(`[handleInvoicePaymentFailed] Error expanding payment intent: ${e.message}`);
    }
  }

  logDebug(`[handleInvoicePaymentFailed] Payment failed for workspace ${workspace.id} due to: ${declineReason}`);

  // Логуємо подію в активність
  await prisma.activityLog.create({
    data: {
      type: 'SETTING_CHANGED',
      description: `Subscription payment failed: ${declineReason}`,
      workspaceId: workspace.id,
    },
  });

  // Відправляємо email користувачам воркспейсу
  try {
    const members = await prisma.workspaceUser.findMany({
      where: {
        workspaceId: workspace.id,
        user: {
          emailBillingAlerts: true,
        },
      },
      include: {
        user: true,
      },
    });

    const { sendBillingFailedEmail } = await import('../services/email.service');
    for (const member of members) {
      if (member.user.email) {
        await sendBillingFailedEmail(member.user.email, workspace.name, declineReason);
        logDebug(`[handleInvoicePaymentFailed] Sent billing failure email to: ${member.user.email}`);
      }
    }
  } catch (err: any) {
    logDebug(`[handleInvoicePaymentFailed] Error sending billing failed emails: ${err.message}`);
  }
}
