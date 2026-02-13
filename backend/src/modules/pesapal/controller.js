/**
 * PesaPal Payment Controller
 * ─────────────────────────────────────────────
 * Handles:
 *  - POST /pesapal/initiate   → Start a payment (school admin)
 *  - GET  /pesapal/ipn        → IPN callback from PesaPal
 *  - GET  /pesapal/status/:id → Check payment status
 *  - GET  /pesapal/plans      → Get available plans & pricing
 * ─────────────────────────────────────────────
 */

const { v4: uuidv4 } = require('uuid');
const pesapalService = require('./service');
const subModel = require('../subscriptions/model');
const subService = require('../subscriptions/service');
const { success, error } = require('../../utils/response');
const logger = require('../../utils/logger');
const env = require('../../config/env');
const db = require('../../config/db');

/* ══════════════════════════════════════════
 *  Plan definitions (single source of truth)
 *  Multi-currency: USD, KES, UGX
 * ══════════════════════════════════════════ */
const PLANS = {
  standard: {
    name: 'Standard',
    key: 'standard',
    popular: true,
    pricing: {
      USD: { monthly: 20, termly: 50, yearly: 150, symbol: '$' },
      KES: { monthly: 2600, termly: 6500, yearly: 19500, symbol: 'KES' },
      UGX: { monthly: 75000, termly: 187500, yearly: 562500, symbol: 'UGX' },
    },
    features: [
      'Up to 500 pupils',
      'Full attendance & reports',
      'Advanced fee management',
      'Unlimited teachers',
      'Parent portal access',
      'PDF & Excel exports',
      'Theme customization',
      'Priority support',
    ],
  },
  pro: {
    name: 'Pro',
    key: 'pro',
    pricing: {
      USD: { monthly: 60, termly: 170, yearly: 490, symbol: '$' },
      KES: { monthly: 7800, termly: 22100, yearly: 63700, symbol: 'KES' },
      UGX: { monthly: 225000, termly: 637500, yearly: 1837500, symbol: 'UGX' },
    },
    features: [
      'Unlimited pupils',
      'Everything in Standard',
      'Custom school branding on reports',
      'SMS notifications',
      'Multi-campus support',
      'API access',
      'Dedicated account manager',
      '24/7 phone support',
    ],
  },
};

/**
 * GET /pesapal/plans
 * Returns available subscription plans and pricing.
 */
const getPlans = async (req, res) => {
  return success(res, { data: PLANS });
};

/**
 * POST /pesapal/initiate
 * Start a PesaPal payment flow for a subscription.
 *
 * Body: { plan_type: 'standard'|'pro', billing_period: 'monthly'|'termly'|'yearly', currency: 'USD'|'KES'|'UGX' }
 */
const initiatePayment = async (req, res, next) => {
  try {
    const { plan_type, billing_period = 'termly', currency = 'USD' } = req.body;

    // Validate plan
    const plan = PLANS[plan_type];
    if (!plan) {
      return error(res, { statusCode: 400, message: 'Invalid plan. Choose standard or pro.' });
    }

    // Validate currency
    const currencyUpper = currency.toUpperCase();
    const planPricing = plan.pricing[currencyUpper];
    if (!planPricing) {
      return error(res, { statusCode: 400, message: 'Invalid currency. Choose USD, KES, or UGX.' });
    }

    // Calculate amount based on billing period
    let amount;
    let months;
    switch (billing_period) {
      case 'monthly':
        amount = planPricing.monthly;
        months = 1;
        break;
      case 'yearly':
        amount = planPricing.yearly;
        months = 12;
        break;
      case 'termly':
      default:
        amount = planPricing.termly;
        months = 4; // ~1 school term
        break;
    }

    const schoolId = req.schoolId || req.user.schoolId;
    const userId = req.user.id;

    // Get user + school info for billing address
    const userResult = await db.query(
      `SELECT u.first_name, u.last_name, u.email, u.phone, s.name as school_name
       FROM users u LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = $1`,
      [userId]
    );
    const userInfo = userResult.rows[0];

    // Create a pending subscription record
    const orderId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + months);

    const sub = await subModel.create({
      school_id: schoolId,
      plan_type,
      amount,
      currency: currencyUpper,
      status: 'pending',
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      pesapal_order_id: orderId,
      payment_status: 'pending',
    });

    // Submit order to PesaPal
    const clientUrl = env.clientUrl || 'http://localhost:5173';
    const callbackUrl = `${clientUrl}/payment/callback`;

    const pesapalResult = await pesapalService.submitOrder({
      id: orderId,
      amount,
      currency: currencyUpper,
      description: `School Manager ${plan.name} Plan (${billing_period}) — ${userInfo?.school_name || 'School'}`,
      callbackUrl,
      billingAddress: {
        email: userInfo?.email || '',
        phone: userInfo?.phone || '',
        firstName: userInfo?.first_name || '',
        lastName: userInfo?.last_name || '',
        countryCode: 'UG',
      },
    });

    // Update subscription with PesaPal tracking ID
    await subModel.updatePaymentStatus(sub.id, {
      pesapal_tracking_id: pesapalResult.orderTrackingId,
    });

    logger.info(`[PesaPal] Payment initiated for school ${schoolId}, order ${orderId}`);

    return success(res, {
      statusCode: 201,
      message: 'Payment initiated',
      data: {
        subscriptionId: sub.id,
        orderId,
        trackingId: pesapalResult.orderTrackingId,
        redirectUrl: pesapalResult.redirectUrl,
        amount,
        currency: currencyUpper,
        plan: plan_type,
        billingPeriod: billing_period,
      },
    });
  } catch (err) {
    logger.error('[PesaPal] Initiate payment error:', err.message);
    next(err);
  }
};

/**
 * GET /pesapal/ipn
 * PesaPal IPN callback. PesaPal sends:
 *   ?OrderTrackingId=xxx&OrderMerchantReference=xxx&OrderNotificationType=xxx
 */
const ipnCallback = async (req, res) => {
  try {
    const { OrderTrackingId, OrderMerchantReference, OrderNotificationType } = req.query;

    logger.info(`[PesaPal IPN] Received: trackingId=${OrderTrackingId}, ref=${OrderMerchantReference}, type=${OrderNotificationType}`);

    if (!OrderTrackingId) {
      return res.status(200).json({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 });
    }

    // Get full transaction status from PesaPal
    const txnStatus = await pesapalService.getTransactionStatus(OrderTrackingId);

    // Find subscription by order ID (merchant reference)
    const sub = await subModel.findByPesapalOrderId(OrderMerchantReference);
    if (!sub) {
      logger.warn(`[PesaPal IPN] Subscription not found for order: ${OrderMerchantReference}`);
      return res.status(200).json({ orderNotificationType: 'IPNCHANGE', orderTrackingId: OrderTrackingId, orderMerchantReference: OrderMerchantReference, status: 200 });
    }

    // PesaPal status codes: 0=Invalid, 1=Completed, 2=Failed, 3=Reversed
    if (txnStatus.paymentStatusCode === 1) {
      // Payment COMPLETED — activate subscription!
      await subModel.updatePaymentStatus(sub.id, {
        status: 'active',
        payment_status: 'completed',
        pesapal_tracking_id: OrderTrackingId,
        pesapal_payment_method: txnStatus.paymentMethod || null,
        payment_reference: `PP-${OrderTrackingId}`,
      });

      // Activate on school record
      await subModel.activate(sub.school_id, sub.plan_type, sub.expires_at);

      logger.info(`[PesaPal IPN] Payment COMPLETED for school ${sub.school_id}, plan ${sub.plan_type}`);
    } else if (txnStatus.paymentStatusCode === 2) {
      // Payment FAILED
      await subModel.updatePaymentStatus(sub.id, {
        status: 'cancelled',
        payment_status: 'failed',
        pesapal_tracking_id: OrderTrackingId,
      });
      logger.info(`[PesaPal IPN] Payment FAILED for order ${OrderMerchantReference}`);
    } else if (txnStatus.paymentStatusCode === 3) {
      // Payment REVERSED
      await subModel.updatePaymentStatus(sub.id, {
        status: 'cancelled',
        payment_status: 'reversed',
        pesapal_tracking_id: OrderTrackingId,
      });
      logger.info(`[PesaPal IPN] Payment REVERSED for order ${OrderMerchantReference}`);
    }

    // Respond to PesaPal (they expect this format)
    return res.status(200).json({
      orderNotificationType: 'IPNCHANGE',
      orderTrackingId: OrderTrackingId,
      orderMerchantReference: OrderMerchantReference,
      status: 200,
    });
  } catch (err) {
    logger.error('[PesaPal IPN] Error:', err.message);
    // Always respond 200 so PesaPal doesn't keep retrying
    return res.status(200).json({ status: 200 });
  }
};

/**
 * GET /pesapal/status/:orderTrackingId
 * Check the status of a payment from our DB + PesaPal API.
 */
const checkStatus = async (req, res, next) => {
  try {
    const { orderTrackingId } = req.params;

    // First check our DB
    const sub = await subModel.findByPesapalTrackingId(orderTrackingId);
    if (!sub) {
      return error(res, { statusCode: 404, message: 'Payment not found.' });
    }

    // If still pending, check with PesaPal API
    if (sub.payment_status === 'pending' || sub.status === 'pending') {
      try {
        const txnStatus = await pesapalService.getTransactionStatus(orderTrackingId);

        if (txnStatus.paymentStatusCode === 1) {
          // Payment completed — activate!
          await subModel.updatePaymentStatus(sub.id, {
            status: 'active',
            payment_status: 'completed',
            pesapal_payment_method: txnStatus.paymentMethod || null,
            payment_reference: `PP-${orderTrackingId}`,
          });
          await subModel.activate(sub.school_id, sub.plan_type, sub.expires_at);

          return success(res, {
            data: {
              status: 'completed',
              plan: sub.plan_type,
              amount: sub.amount,
              currency: sub.currency,
              expiresAt: sub.expires_at,
              paymentMethod: txnStatus.paymentMethod,
              message: 'Payment successful! Your subscription is now active.',
            },
          });
        } else if (txnStatus.paymentStatusCode === 2) {
          await subModel.updatePaymentStatus(sub.id, { status: 'cancelled', payment_status: 'failed' });
          return success(res, { data: { status: 'failed', message: 'Payment was not successful. Please try again.' } });
        } else if (txnStatus.paymentStatusCode === 3) {
          await subModel.updatePaymentStatus(sub.id, { status: 'cancelled', payment_status: 'reversed' });
          return success(res, { data: { status: 'reversed', message: 'Payment was reversed.' } });
        }

        // Still pending
        return success(res, {
          data: {
            status: 'pending',
            message: 'Payment is still being processed. Please wait...',
            statusDescription: txnStatus.paymentStatusDescription,
          },
        });
      } catch {
        // PesaPal API error — return what we have in DB
        return success(res, {
          data: {
            status: sub.payment_status,
            plan: sub.plan_type,
            amount: sub.amount,
            currency: sub.currency,
            message: 'Unable to verify payment status. It may still be processing.',
          },
        });
      }
    }

    // Already processed
    return success(res, {
      data: {
        status: sub.payment_status,
        plan: sub.plan_type,
        amount: sub.amount,
        currency: sub.currency,
        expiresAt: sub.expires_at,
        paymentMethod: sub.pesapal_payment_method,
        message: sub.payment_status === 'completed'
          ? 'Payment confirmed! Your subscription is active.'
          : `Payment status: ${sub.payment_status}`,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPlans, initiatePayment, ipnCallback, checkStatus };

