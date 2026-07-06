import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { stripe } from '../config/stripe';
import { prisma } from '../config/prisma';

/**
 * POST /api/internal/billing/create-checkout-session
 * Створює Stripe Checkout Session для підписки PRO
 */
export const createCheckoutSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    if (workspace.plan === 'PRO' && workspace.subscriptionStatus === 'active') {
      res.status(400).json({ error: 'Workspace is already on an active PRO plan' });
      return;
    }

    // Запитуємо безпосередньо Stripe, щоб переконатися, що у клієнта немає активної підписки
    if (workspace.stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: workspace.stripeCustomerId,
          status: 'active',
          limit: 5,
        });

        if (subscriptions.data.length > 0) {
          res.status(400).json({ error: 'You already have an active subscription. Please manage it via the Billing Portal.' });
          return;
        }
      } catch (err: any) {
        console.error('[Billing] Error checking Stripe active subscriptions:', err.message);
      }
    }

    // Знаходимо або створюємо Stripe Customer
    let customerId = workspace.stripeCustomerId;

    if (!customerId) {
      // Отримуємо email поточного юзера для створення customer
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
      });

      const customer = await stripe.customers.create({
        email: user?.email || '',
        metadata: {
          workspaceId: workspaceId,
          workspaceName: workspace.name,
        },
      });

      customerId = customer.id;

      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Отримуємо Price ID з Product ID (STRIPE_PRO_PRICE_ID може бути і Product, і Price)
    let priceId = process.env.STRIPE_PRO_PRICE_ID!;
    
    // Якщо передано Product ID (починається з prod_), знаходимо його дефолтну ціну
    if (priceId.startsWith('prod_')) {
      const prices = await stripe.prices.list({
        product: priceId,
        active: true,
        type: 'recurring',
        limit: 1,
      });

      const firstPrice = prices.data[0];
      if (!firstPrice) {
        res.status(500).json({ error: 'No active recurring price found for the PRO product. Please create a price in the Stripe Dashboard.' });
        return;
      }

      priceId = firstPrice.id;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${frontendUrl}/billing?status=cancelled`,
      metadata: {
        workspaceId: workspaceId,
        plan: 'PRO',
      },
      subscription_data: {
        metadata: {
          workspaceId: workspaceId,
          plan: 'PRO',
        },
      },
    });

    res.json({ success: true, url: session.url });
  } catch (error: any) {
    console.error('[Billing] Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
};

/**
 * POST /api/internal/billing/create-portal-session
 * Створює Stripe Customer Portal Session для управління підпискою
 */
export const createPortalSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    if (!workspace.stripeCustomerId) {
      res.status(400).json({ error: 'No billing information found for this workspace' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: workspace.stripeCustomerId,
      return_url: `${frontendUrl}/billing`,
    });

    res.json({ success: true, url: portalSession.url });
  } catch (error: any) {
    console.error('[Billing] Error creating portal session:', error);
    res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
};

/**
 * GET /api/internal/billing/status
 * Повертає поточний статус підписки воркспейсу
 */
export const getBillingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        plan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        gracePeriodStartedAt: true,
      },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // cancel_at_period_end не зберігається в БД — отримуємо з Stripe тільки якщо є активна підписка
    let cancelAtPeriodEnd = false;
    if (workspace.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(workspace.stripeSubscriptionId);
        cancelAtPeriodEnd = subscription.cancel_at_period_end;
      } catch {
        // Підписка могла бути видалена в Stripe
      }
    }

    res.json({
      success: true,
      data: {
        plan: workspace.plan,
        hasStripeCustomer: !!workspace.stripeCustomerId,
        hasSubscription: !!workspace.stripeSubscriptionId,
        subscriptionStatus: workspace.subscriptionStatus,
        cancelAtPeriodEnd,
        currentPeriodEnd: workspace.currentPeriodEnd,
        gracePeriodStartedAt: workspace.gracePeriodStartedAt,
      },
    });
  } catch (error: any) {
    console.error('[Billing] Error getting billing status:', error);
    res.status(500).json({ error: error.message || 'Failed to get billing status' });
  }
};

/**
 * POST /api/internal/billing/cancel-enterprise-request
 * Скасовує Enterprise запит та повертає воркспейс на безкоштовний тариф (FREE),
 * якщо підписку ще не було активовано/оплачено.
 */
export const cancelEnterpriseRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Дозволяємо скасування лише якщо підписка не є оплаченою/активною в Stripe
    if (workspace.plan === 'ENTERPRISE' && workspace.stripeSubscriptionId) {
      res.status(400).json({ error: 'Cannot cancel an active paid subscription directly. Please use the Billing Portal or contact support.' });
      return;
    }

    // Оновлюємо статус запитів у БД на DECLINED
    await prisma.enterpriseRequest.updateMany({
      where: {
        workspaceId,
        status: { in: ['PENDING', 'CONTACTED', 'APPROVED'] },
      },
      data: {
        status: 'DECLINED',
        adminNotes: 'Cancelled by user.',
      },
    });

    // Повертаємо воркспейс на тариф FREE
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan: 'FREE',
        stripeSubscriptionId: null,
        subscriptionStatus: null,
        enterpriseStorageBytes: null,
        enterpriseBandwidthBytes: null,
        enterpriseOptimizations: null,
      },
    });

    // Логуємо подію
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: 'Enterprise request cancelled by owner. Reverted to FREE plan.',
        workspaceId,
      },
    });

    res.json({ success: true, message: 'Reverted to FREE plan successfully.' });
  } catch (error: any) {
    console.error('[Billing] Error cancelling enterprise request:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel enterprise request' });
  }
};

/**
 * GET /api/internal/billing/invoices
 * Повертає історію інвойсів з Stripe для цього воркспейсу
 */
export const getInvoiceHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { stripeCustomerId: true },
    });

    if (!workspace || !workspace.stripeCustomerId) {
      res.json({ success: true, invoices: [] });
      return;
    }

    const invoices = await stripe.invoices.list({
      customer: workspace.stripeCustomerId,
      limit: 20,
    });

    const formattedInvoices = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number || '—',
      amountPaid: inv.amount_paid / 100, // cents to main unit
      currency: inv.currency.toUpperCase(),
      status: inv.status || 'unknown',
      pdfUrl: inv.invoice_pdf || null,
      date: inv.created, // UNIX timestamp
      hostedInvoiceUrl: inv.hosted_invoice_url || null,
    }));

    res.json({ success: true, invoices: formattedInvoices });
  } catch (error: any) {
    console.error('[Billing] Error getting invoice history:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoice history' });
  }
};

