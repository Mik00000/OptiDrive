import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';
import { EnterpriseRequestStatus } from '@prisma/client';
import { stripe } from '../config/stripe';

// Проста перевірка на адміністратора
const isUserAdmin = (email: string): boolean => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@optidrive.app';
  return email === adminEmail || email === 'mikjarkov@gmail.com' || email.endsWith('@optidrive.app');
};

/**
 * GET /api/internal/admin/enterprise-requests
 * Отримати список усіх запитів на Enterprise тариф (тільки для адмінів)
 */
export const getEnterpriseRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { email: true },
    });

    if (!user || !isUserAdmin(user.email)) {
      res.status(403).json({ error: 'Access denied: Admin only' });
      return;
    }

    const requests = await prisma.enterpriseRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        workspace: {
          select: {
            name: true,
            plan: true,
            storageUsed: true,
            bandwidthUsed: true,
          },
        },
      },
    });

    // Конвертуємо BigInt у рядки для серіалізації в JSON
    const serializedRequests = requests.map(reqItem => ({
      ...reqItem,
      workspace: reqItem.workspace ? {
        ...reqItem.workspace,
        storageUsed: reqItem.workspace.storageUsed.toString(),
        bandwidthUsed: reqItem.workspace.bandwidthUsed.toString(),
      } : null,
    }));

    res.json({
      success: true,
      data: serializedRequests,
    });
  } catch (error: any) {
    console.error('[Admin] Error getting enterprise requests:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch enterprise requests' });
  }
};

/**
 * POST /api/internal/admin/enterprise-requests/:id/approve
 * Схвалити запит та встановити кастомні ліміти для Enterprise-плану
 */
export const approveEnterpriseRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { email: true },
    });

    if (!user || !isUserAdmin(user.email)) {
      res.status(403).json({ error: 'Access denied: Admin only' });
      return;
    }

    const { id } = req.params;
    const { storageGb, bandwidthGb, optimizations, price, couponCode } = req.body;

    const parsedStorageGb = Number(storageGb);
    const parsedBandwidthGb = Number(bandwidthGb);
    const parsedOptimizations = Number(optimizations);
    const parsedPrice = Number(price);

    if (
      storageGb === undefined || bandwidthGb === undefined || optimizations === undefined || price === undefined ||
      isNaN(parsedStorageGb) || parsedStorageGb <= 0 ||
      isNaN(parsedBandwidthGb) || parsedBandwidthGb <= 0 ||
      isNaN(parsedOptimizations) || parsedOptimizations <= 0 ||
      isNaN(parsedPrice) || parsedPrice < 0
    ) {
      res.status(400).json({ error: 'Invalid settings. Storage, bandwidth, and optimizations must be positive numbers. Price must be a non-negative number.' });
      return;
    }

    const enterpriseRequest = await prisma.enterpriseRequest.findUnique({
      where: { id: String(id) },
    });

    if (!enterpriseRequest) {
      res.status(404).json({ error: 'Enterprise request not found' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: enterpriseRequest.workspaceId },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // 1. Визначаємо базову валюту платформи на основі налаштованого тарифу PRO
    let resolvedCurrency = 'usd';
    try {
      const priceId = process.env.STRIPE_PRO_PRICE_ID!;
      if (priceId) {
        if (priceId.startsWith('prod_')) {
          const prices = await stripe.prices.list({
            product: priceId,
            active: true,
            type: 'recurring',
            limit: 1,
          });
          if (prices.data[0]?.currency) {
            resolvedCurrency = prices.data[0].currency.toLowerCase();
          }
        } else {
          const priceObj = await stripe.prices.retrieve(priceId);
          if (priceObj?.currency) {
            resolvedCurrency = priceObj.currency.toLowerCase();
          }
        }
      }
    } catch (err: any) {
      console.error('[Admin] Error fetching PRO plan currency details:', err.message);
    }

    // 2. Отримуємо або створюємо Stripe Customer для цього воркспейсу
    let customerId = workspace.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: enterpriseRequest.contactEmail,
        name: enterpriseRequest.contactName,
        metadata: {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        },
      });
      customerId = customer.id;
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { stripeCustomerId: customerId },
      });
    } else {
      // Якщо Customer вже існує в Stripe, отримуємо його валюту,
      // щоб не створювати конфліктів валют (EUR vs USD) на одному акаунті
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && customer.currency) {
          resolvedCurrency = customer.currency.toLowerCase();
        }
      } catch (err: any) {
        console.error('[Admin] Error retrieving customer details:', err.message);
      }
    }

    // 3. Перевіряємо чи є у клієнта активна підписка PRO для розрахунку компенсації (proration)
    // у вигляді безкоштовних днів тріалу на Enterprise
    let trialPeriodDays: number | undefined = undefined;
    let cancelSubscriptionId: string | undefined = undefined;

    if (customerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 10,
        });

        // Шукаємо підписку на PRO або будь-яку іншу активну підписку (наприклад, попередній Enterprise)
        const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
        let activeSub = subscriptions.data.find(sub => 
          sub.items.data.some(item => item.price.id === proPriceId || item.price.product === proPriceId)
        );

        if (!activeSub && subscriptions.data.length > 0) {
          activeSub = subscriptions.data[0];
        }

        if (activeSub) {
          cancelSubscriptionId = activeSub.id;
          const currentPeriodEnd = (activeSub as any).current_period_end;
          const nowSeconds = Math.floor(Date.now() / 1000);
          const secondsRemaining = currentPeriodEnd - nowSeconds;
          
          if (secondsRemaining > 0) {
            // Переводимо залишок секунд у дні (округлюємо вгору)
            trialPeriodDays = Math.ceil(secondsRemaining / (24 * 60 * 60));
            console.log(`[Admin] Active subscription found to replace: ${cancelSubscriptionId}. Remaining: ${trialPeriodDays} days. Applying as trial period for Enterprise.`);
          }
        }
      } catch (err: any) {
        console.error('[Admin] Error checking active subscriptions for proration:', err.message);
      }
    }

    // Перевіряємо та резолвимо промокод або купон у Stripe
    let discounts: any[] | undefined = undefined;
    if (couponCode && String(couponCode).trim() !== '') {
      const cleanCoupon = String(couponCode).trim();
      try {
        // Спробуємо знайти як промокод
        const promoCodes = await stripe.promotionCodes.list({
          code: cleanCoupon,
          active: true,
          limit: 1,
        });
        if (promoCodes.data && promoCodes.data.length > 0 && promoCodes.data[0]) {
          discounts = [{ promotion_code: promoCodes.data[0].id }];
        } else {
          // Спробуємо знайти як купон
          const coupon = await stripe.coupons.retrieve(cleanCoupon);
          if (coupon.valid) {
            discounts = [{ coupon: coupon.id }];
          }
        }
      } catch (err: any) {
        console.error('[Admin] Failed to lookup promotion code or coupon:', err.message);
        res.status(400).json({ error: `Stripe Coupon or Promo Code '${cleanCoupon}' was not found or is invalid.` });
        return;
      }
    }

    // Будуємо subscription_data з урахуванням exactOptionalPropertyTypes: true
    const subscriptionData: any = {
      metadata: {
        workspaceId: workspace.id,
        enterpriseRequestId: enterpriseRequest.id,
        plan: 'ENTERPRISE',
        cancelSubscriptionId: cancelSubscriptionId || '',
      },
    };

    if (trialPeriodDays !== undefined) {
      subscriptionData.trial_period_days = trialPeriodDays;
    }

    // 4. Створюємо Stripe Checkout Session з динамічною ціною та підпискою
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const sessionOptions: any = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: resolvedCurrency,
            product_data: {
              name: `Enterprise Plan - ${workspace.name}`,
              description: `Custom limits: ${storageGb} GB Storage, ${bandwidthGb} GB Bandwidth, ${optimizations} Optimizations/month`,
            },
            unit_amount: Math.round(Number(price) * 100), // в центах
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${frontendUrl}/billing?status=cancelled`,
      metadata: {
        workspaceId: workspace.id,
        enterpriseRequestId: enterpriseRequest.id,
        plan: 'ENTERPRISE',
        cancelSubscriptionId: cancelSubscriptionId || '',
      },
      subscription_data: subscriptionData,
    };

    if (discounts !== undefined) {
      sessionOptions.discounts = discounts;
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

    // 4. Оновлюємо статус запиту на APPROVED (очікує оплати) та зберігаємо кастомні ліміти
    await prisma.enterpriseRequest.update({
      where: { id: String(id) },
      data: {
        status: EnterpriseRequestStatus.APPROVED,
        approvedStorageGb: Number(storageGb),
        approvedBandwidthGb: Number(bandwidthGb),
        approvedOptimizations: Number(optimizations),
        approvedPrice: Number(price),
        approvedCouponCode: couponCode ? String(couponCode).trim() : null,
        stripePaymentLink: session.url,
      },
    });

    // 5. Логуємо подію в воркспейсі
    const displayCurrencySymbol = resolvedCurrency === 'eur' ? '€' : '$';
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Enterprise request approved by admin. Created payment link for ${displayCurrencySymbol}${price}/mo: ${storageGb} GB Storage, ${bandwidthGb} GB Bandwidth, ${optimizations} Optimizations`,
        workspaceId: enterpriseRequest.workspaceId,
      },
    });

    // 6. Відправляємо email клієнту з посиланням на оплату
    try {
      const { sendEnterpriseApprovalEmail } = await import('../services/email.service');
      await sendEnterpriseApprovalEmail({
        contactEmail: enterpriseRequest.contactEmail,
        contactName: enterpriseRequest.contactName,
        workspaceName: workspace.name,
        storageGb: Number(storageGb),
        bandwidthGb: Number(bandwidthGb),
        optimizations: Number(optimizations),
        price: Number(price),
        paymentLink: session.url!,
        currency: resolvedCurrency,
      });
    } catch (emailError: any) {
      console.error('[Admin] Failed to send enterprise approval email:', emailError.message);
    }

    res.json({
      success: true,
      message: 'Enterprise request approved. Quote sent to client.',
      paymentLink: session.url,
    });
  } catch (error: any) {
    console.error('[Admin] Error approving enterprise request:', error);
    res.status(500).json({ error: error.message || 'Failed to approve enterprise request' });
  }
};

/**
 * POST /api/internal/admin/enterprise-requests/:id/reject
 * Відхилити запит на Enterprise
 */
export const rejectEnterpriseRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { email: true },
    });

    if (!user || !isUserAdmin(user.email)) {
      res.status(403).json({ error: 'Access denied: Admin only' });
      return;
    }

    const { id } = req.params;

    const enterpriseRequest = await prisma.enterpriseRequest.findUnique({
      where: { id: String(id) },
    });

    if (!enterpriseRequest) {
      res.status(404).json({ error: 'Enterprise request not found' });
      return;
    }

    await prisma.$transaction([
      prisma.enterpriseRequest.update({
        where: { id: String(id) },
        data: { status: EnterpriseRequestStatus.DECLINED },
      }),
      prisma.activityLog.create({
        data: {
          type: 'SETTING_CHANGED',
          description: `Enterprise request rejected by admin`,
          workspaceId: enterpriseRequest.workspaceId,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Enterprise request rejected successfully.',
    });
  } catch (error: any) {
    console.error('[Admin] Error rejecting enterprise request:', error);
    res.status(500).json({ error: error.message || 'Failed to reject enterprise request' });
  }
};
