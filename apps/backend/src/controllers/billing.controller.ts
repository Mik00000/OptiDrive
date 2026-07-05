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

    if (workspace.plan === 'PRO') {
      res.status(400).json({ error: 'Workspace is already on the PRO plan' });
      return;
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
      },
      subscription_data: {
        metadata: {
          workspaceId: workspaceId,
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
      },
    });
  } catch (error: any) {
    console.error('[Billing] Error getting billing status:', error);
    res.status(500).json({ error: error.message || 'Failed to get billing status' });
  }
};

