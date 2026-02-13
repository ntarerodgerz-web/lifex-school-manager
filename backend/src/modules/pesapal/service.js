/**
 * PesaPal Payment Service
 * ─────────────────────────────────────────────────────────────────────
 * PesaPal API v3 integration for subscription payments.
 *
 * Flow:
 *  1. getAuthToken()          → Bearer token (cached for ~5 min)
 *  2. registerIPN()           → Register callback URL (done once)
 *  3. submitOrder()           → Create payment order → redirect URL
 *  4. getTransactionStatus()  → Verify payment after IPN or redirect
 * ─────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');
const env = require('../../config/env');
const logger = require('../../utils/logger');

const PESAPAL_BASE = env.pesapal.baseUrl;

/* ══════════════════════════════════════════
 *  Token cache (avoid re-authenticating every request)
 * ══════════════════════════════════════════ */
let cachedToken = null;
let tokenExpiresAt = null;

/**
 * Step 1: Authenticate with PesaPal → get Bearer token.
 * Tokens are valid for ~5 minutes; we cache them.
 */
const getAuthToken = async () => {
  // Return cached token if still valid (with 60s safety margin)
  if (cachedToken && tokenExpiresAt && new Date() < new Date(tokenExpiresAt - 60000)) {
    return cachedToken;
  }

  try {
    const { data } = await axios.post(`${PESAPAL_BASE}/api/Auth/RequestToken`, {
      consumer_key: env.pesapal.consumerKey,
      consumer_secret: env.pesapal.consumerSecret,
    }, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    cachedToken = data.token;
    tokenExpiresAt = new Date(data.expiryDate).getTime();

    logger.info('[PesaPal] Auth token obtained, expires:', data.expiryDate);
    return cachedToken;
  } catch (err) {
    logger.error('[PesaPal] Auth failed:', err.response?.data || err.message);
    throw new Error('PesaPal authentication failed. Please try again later.');
  }
};

/* ══════════════════════════════════════════
 *  IPN Registration (Instant Payment Notification)
 * ══════════════════════════════════════════ */
let cachedIpnId = null;

/**
 * Step 2: Register the IPN callback URL.
 * PesaPal will POST payment status updates to this URL.
 * Should be called once; we cache the IPN ID.
 */
const registerIPN = async () => {
  if (cachedIpnId) return cachedIpnId;

  const token = await getAuthToken();
  try {
    const { data } = await axios.post(`${PESAPAL_BASE}/api/URLSetup/RegisterIPN`, {
      url: env.pesapal.ipnCallbackUrl,
      ipn_notification_type: 'GET',
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    cachedIpnId = data.ipn_id;
    logger.info('[PesaPal] IPN registered:', data.ipn_id);
    return cachedIpnId;
  } catch (err) {
    logger.error('[PesaPal] IPN registration failed:', err.response?.data || err.message);
    throw new Error('Failed to register PesaPal IPN callback.');
  }
};

/* ══════════════════════════════════════════
 *  Submit Order Request
 * ══════════════════════════════════════════ */

/**
 * Step 3: Submit a payment order to PesaPal.
 * Returns the redirect URL where the user will complete payment.
 *
 * @param {Object} orderData
 * @param {string} orderData.id              – Our internal order ID (UUID)
 * @param {number} orderData.amount          – Amount to charge
 * @param {string} orderData.currency        – Currency code (UGX, KES, etc.)
 * @param {string} orderData.description     – What the user is paying for
 * @param {string} orderData.callbackUrl     – Where to redirect after payment
 * @param {Object} orderData.billingAddress  – Customer billing info
 * @param {string} orderData.billingAddress.email
 * @param {string} orderData.billingAddress.phone
 * @param {string} orderData.billingAddress.firstName
 * @param {string} orderData.billingAddress.lastName
 */
const submitOrder = async (orderData) => {
  const token = await getAuthToken();
  const ipnId = await registerIPN();

  const payload = {
    id: orderData.id,
    currency: orderData.currency || 'UGX',
    amount: orderData.amount,
    description: orderData.description || 'School Manager Subscription',
    callback_url: orderData.callbackUrl,
    notification_id: ipnId,
    billing_address: {
      email_address: orderData.billingAddress?.email || '',
      phone_number: orderData.billingAddress?.phone || '',
      first_name: orderData.billingAddress?.firstName || '',
      last_name: orderData.billingAddress?.lastName || '',
      country_code: orderData.billingAddress?.countryCode || 'UG',
    },
  };

  try {
    const { data } = await axios.post(
      `${PESAPAL_BASE}/api/Transactions/SubmitOrderRequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    logger.info('[PesaPal] Order submitted:', data.order_tracking_id);

    return {
      orderTrackingId: data.order_tracking_id,
      merchantReference: data.merchant_reference,
      redirectUrl: data.redirect_url,
      status: data.status,
    };
  } catch (err) {
    logger.error('[PesaPal] Submit order failed:', err.response?.data || err.message);
    throw new Error('Failed to create PesaPal payment order. Please try again.');
  }
};

/* ══════════════════════════════════════════
 *  Transaction Status
 * ══════════════════════════════════════════ */

/**
 * Step 4: Check payment status for a given order tracking ID.
 *
 * @param {string} orderTrackingId  – PesaPal's order tracking ID
 * @returns {Object} Transaction status details
 */
const getTransactionStatus = async (orderTrackingId) => {
  const token = await getAuthToken();

  try {
    const { data } = await axios.get(
      `${PESAPAL_BASE}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    logger.info('[PesaPal] Transaction status:', data.payment_status_description, 'for', orderTrackingId);

    return {
      paymentStatusCode: data.status_code,
      paymentStatusDescription: data.payment_status_description,
      merchantReference: data.merchant_reference,
      paymentMethod: data.payment_method,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      message: data.message,
    };
  } catch (err) {
    logger.error('[PesaPal] Get transaction status failed:', err.response?.data || err.message);
    throw new Error('Failed to check payment status.');
  }
};

module.exports = {
  getAuthToken,
  registerIPN,
  submitOrder,
  getTransactionStatus,
};

