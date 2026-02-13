import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  HiOutlineCheckCircle,
  HiOutlineStar,
  HiOutlineLightningBolt,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineX,
  HiOutlineXCircle,
  HiOutlineHome,
  HiOutlineRefresh,
} from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

/* ─── Constants ─── */
const BILLING_PERIODS = [
  { key: 'monthly', label: 'Monthly', discount: null },
  { key: 'termly', label: 'Termly', discount: 'Save 25%' },
  { key: 'yearly', label: 'Yearly', discount: 'Save 40%' },
];

const CURRENCIES = [
  { key: 'USD', symbol: '$', flag: '🇺🇸' },
  { key: 'KES', symbol: 'KES', flag: '🇰🇪' },
  { key: 'UGX', symbol: 'UGX', flag: '🇺🇬' },
];

const PLAN_ICONS = {
  standard: HiOutlineLightningBolt,
  pro: HiOutlineShieldCheck,
};

const PLAN_COLORS = {
  standard: {
    ring: 'ring-blue-500',
    accent: 'text-blue-600',
    btn: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-blue-200',
    iconBg: 'bg-blue-50',
  },
  pro: {
    ring: 'ring-purple-500',
    accent: 'text-purple-600',
    btn: 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 shadow-purple-200',
    iconBg: 'bg-purple-50',
  },
};

const fmt = (amount, cur) =>
  cur === 'USD'
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)
    : new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(amount);

/* ─── Component ─── */
const SubscribePage = () => {
  const { user, updateUser } = useAuth();
  const { get } = useApi();
  const navigate = useNavigate();

  const [plans, setPlans] = useState(null);
  const [billingPeriod, setBillingPeriod] = useState('termly');
  const [currency, setCurrency] = useState('USD');
  const [processingPlan, setProcessingPlan] = useState(null);
  const [history, setHistory] = useState([]);

  /* ── Payment modal state ── */
  const [modal, setModal] = useState({
    open: false,
    url: '',
    plan: '',
    trackingId: '',
    // 'iframe' | 'checking' | 'completed' | 'pending' | 'failed'
    phase: 'iframe',
    paymentInfo: null,
  });
  const pollRef = useRef(null);
  const pollCountRef = useRef(0);

  const isActive = user?.subscription_status === 'active';
  const currentPlan = user?.plan_type || 'starter';

  /* ─── Data fetching ─── */
  const fetchPlans = useCallback(async () => {
    try {
      const res = await get('/pesapal/plans', null, { silent: true });
      setPlans(res.data);
    } catch { /* handled */ }
  }, [get]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await get('/subscriptions', null, { silent: true });
      setHistory(res.data || []);
    } catch { /* handled */ }
  }, [get]);

  useEffect(() => { fetchPlans(); fetchHistory(); }, [fetchPlans, fetchHistory]);

  /* ─── Helpers ─── */
  const price = (plan) => {
    const p = plan?.pricing?.[currency];
    if (!p) return 0;
    return billingPeriod === 'monthly' ? p.monthly : billingPeriod === 'yearly' ? p.yearly : p.termly;
  };

  const sym = CURRENCIES.find((c) => c.key === currency)?.symbol || currency;

  /* ─── Poll payment status ─── */
  const pollPaymentStatus = useCallback(async (trackingId) => {
    if (!trackingId) return;
    try {
      const { data } = await api.get(`/pesapal/status/${trackingId}`);
      const result = data.data;

      if (result.status === 'completed') {
        // Payment succeeded!
        clearInterval(pollRef.current);
        pollRef.current = null;
        setModal((prev) => ({ ...prev, phase: 'completed', paymentInfo: result }));
        // Update user context
        if (updateUser) {
          updateUser({ subscription_status: 'active', plan_type: result.plan });
        }
        fetchHistory();
      } else if (result.status === 'failed' || result.status === 'reversed') {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setModal((prev) => ({ ...prev, phase: 'failed', paymentInfo: result }));
      }
      // else still pending — keep polling
    } catch {
      // Silently keep trying
    }
  }, [updateUser, fetchHistory]);

  const startPolling = useCallback((trackingId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollCountRef.current = 0;
    pollRef.current = setInterval(() => {
      pollCountRef.current += 1;
      pollPaymentStatus(trackingId);
      // Stop after 3 minutes (36 attempts × 5s)
      if (pollCountRef.current > 36) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 5000);
  }, [pollPaymentStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /* ─── Subscribe handler ─── */
  const handleSubscribe = async (planKey) => {
    if (processingPlan) return;
    setProcessingPlan(planKey);

    try {
      const { data } = await api.post('/pesapal/initiate', {
        plan_type: planKey,
        billing_period: billingPeriod,
        currency,
      });

      const result = data.data;

      if (result.redirectUrl) {
        setModal({
          open: true,
          url: result.redirectUrl,
          plan: planKey,
          trackingId: result.trackingId || '',
          phase: 'iframe',
          paymentInfo: null,
        });
        // Start polling for payment status in the background
        if (result.trackingId) {
          startPolling(result.trackingId);
        }
      } else {
        toast.error('No payment URL received. Please try again.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment.');
    } finally {
      setProcessingPlan(null);
    }
  };

  /* ─── "I've paid" button — switch from iframe to checking state ─── */
  const handleIvePaid = () => {
    setModal((prev) => ({ ...prev, phase: 'checking' }));
    // Do an immediate check
    pollPaymentStatus(modal.trackingId);
  };


  /* ─── Close modal ─── */
  const closeModal = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setModal({ open: false, url: '', plan: '', trackingId: '', phase: 'iframe', paymentInfo: null });
    fetchHistory();
  };

  /* ─── Days left ─── */
  const daysLeft = (() => {
    const end = user?.subscription_status === 'trial' ? user?.trial_ends_at : user?.subscription_expires_at;
    if (!end) return null;
    return Math.max(0, Math.ceil((new Date(end) - new Date()) / 86400000));
  })();

  /* ═══════════════════════════════════
   *  Modal content renderer
   * ═══════════════════════════════════ */
  const renderModalContent = () => {
    switch (modal.phase) {
      /* ── PesaPal iframe ── */
      case 'iframe':
        return (
          <>
            {/* iframe fills space */}
            <div className="flex-1 relative">
              <iframe
                src={modal.url}
                title="PesaPal Payment"
                className="absolute inset-0 w-full h-full border-0"
                allow="payment"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
              />
            </div>
            {/* Footer with "I've Paid" button */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <HiOutlineShieldCheck className="w-3.5 h-3.5" /> Secured by PesaPal
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeModal}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleIvePaid}
                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg transition flex items-center gap-1.5"
                >
                  <HiOutlineCheckCircle className="w-4 h-4" />
                  I've Completed Payment
                </button>
              </div>
            </div>
          </>
        );

      /* ── Checking status ── */
      case 'checking':
      case 'pending':
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-5 max-w-sm">
              <div className="w-20 h-20 mx-auto bg-amber-50 rounded-full flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Verifying Payment</h2>
                <p className="text-sm text-gray-500 mt-1.5">
                  Checking with PesaPal... This may take a moment.
                  <br />
                  <span className="text-xs text-gray-400">If you paid via mobile money, confirm the prompt on your phone first.</span>
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-amber-600 font-medium">
                <div className="w-2.5 h-2.5 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
                Auto-checking every 5 seconds...
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <button
                  onClick={() => pollPaymentStatus(modal.trackingId)}
                  className="btn-secondary text-xs inline-flex items-center justify-center gap-1.5"
                >
                  <HiOutlineRefresh className="w-4 h-4" /> Check Now
                </button>
                <button
                  onClick={() => setModal((prev) => ({ ...prev, phase: 'iframe' }))}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
                >
                  ← Back to Payment Form
                </button>
              </div>
            </div>
          </div>
        );

      /* ── Payment completed ── */
      case 'completed':
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-5 max-w-sm">
              <div className="w-24 h-24 mx-auto bg-emerald-50 rounded-full flex items-center justify-center">
                <HiOutlineCheckCircle className="w-14 h-14 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Payment Successful! 🎉</h2>
                <p className="text-sm text-gray-500 mt-1.5">
                  Your subscription is now <strong>active</strong>. Thank you!
                </p>
              </div>

              {modal.paymentInfo && (
                <div className="bg-emerald-50 rounded-xl p-4 space-y-2 text-left text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan</span>
                    <span className="font-bold text-gray-800 capitalize">{modal.paymentInfo.plan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-bold text-gray-800">
                      {modal.paymentInfo.currency} {fmt(parseFloat(modal.paymentInfo.amount || 0), modal.paymentInfo.currency)}
                    </span>
                  </div>
                  {modal.paymentInfo.paymentMethod && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Paid via</span>
                      <span className="font-medium text-gray-700">{modal.paymentInfo.paymentMethod}</span>
                    </div>
                  )}
                  {modal.paymentInfo.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Valid until</span>
                      <span className="font-medium text-gray-700">
                        {new Date(modal.paymentInfo.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => { closeModal(); navigate('/dashboard'); }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <HiOutlineHome className="w-5 h-5" /> Go to Dashboard
              </button>
            </div>
          </div>
        );

      /* ── Payment failed ── */
      case 'failed':
        return (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-5 max-w-sm">
              <div className="w-24 h-24 mx-auto bg-red-50 rounded-full flex items-center justify-center">
                <HiOutlineXCircle className="w-14 h-14 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payment Failed</h2>
                <p className="text-sm text-gray-500 mt-1.5">
                  {modal.paymentInfo?.message || 'The payment was not successful. You can try again.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  onClick={() => { closeModal(); }}
                  className="btn-primary inline-flex items-center justify-center gap-1.5 text-sm"
                >
                  <HiOutlineCreditCard className="w-4 h-4" /> Try Again
                </button>
                <button
                  onClick={() => { closeModal(); navigate('/dashboard'); }}
                  className="btn-secondary inline-flex items-center justify-center gap-1.5 text-sm"
                >
                  <HiOutlineHome className="w-4 h-4" /> Dashboard
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ═══════════════════════════════════
   *  Main render
   * ═══════════════════════════════════ */
  return (
    <>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* ─── Header (compact) ─── */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-semibold">
            <HiOutlineSparkles className="w-3.5 h-3.5" />
            {isActive ? 'Manage Subscription' : 'Choose a Plan'}
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            {isActive ? 'Upgrade or Renew' : 'Subscribe to School Manager'}
          </h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Powerful digital tools for your school. 7-day money-back guarantee.
          </p>
        </div>

        {/* ─── Status banner ─── */}
        {daysLeft !== null && daysLeft <= 30 && (
          <div className={`rounded-xl px-4 py-3 flex items-center justify-between text-sm ${
            isActive ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : user?.subscription_status === 'trial' ? 'bg-amber-50 border border-amber-200 text-amber-800'
            : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2">
              <HiOutlineClock className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">
                {isActive ? `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan` : user?.subscription_status === 'trial' ? 'Free Trial' : 'Expired'}
                {' · '}
                {daysLeft === 0 ? 'expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
              </span>
            </div>
          </div>
        )}

        {/* ─── Controls row: Currency + Billing period ─── */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Currency pills */}
          <div className="inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {CURRENCIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCurrency(c.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  currency === c.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{c.flag}</span> {c.key}
              </button>
            ))}
          </div>

          {/* Billing period pills */}
          <div className="inline-flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
            {BILLING_PERIODS.map((bp) => (
              <button
                key={bp.key}
                onClick={() => setBillingPeriod(bp.key)}
                className={`relative px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                  billingPeriod === bp.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {bp.label}
                {bp.discount && (
                  <span className="absolute -top-2 -right-1 text-[9px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                    {bp.discount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Pricing cards ─── */}
        {plans ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(plans).map(([key, plan]) => {
              const c = PLAN_COLORS[key] || PLAN_COLORS.standard;
              const Icon = PLAN_ICONS[key] || HiOutlineStar;
              const p = price(plan);
              const isCurrent = isActive && currentPlan === key;

              return (
                <div
                  key={key}
                  className={`relative bg-white rounded-2xl border p-5 transition-all hover:shadow-lg ${
                    plan.popular ? `ring-2 ${c.ring} shadow-md` : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-4 py-1 rounded-full shadow">
                      Most Popular
                    </span>
                  )}

                  {isCurrent && (
                    <span className="absolute top-2.5 right-2.5 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                      Current
                    </span>
                  )}

                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                      <Icon className={`w-5 h-5 ${c.accent}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-[11px] text-gray-400">{key === 'pro' ? 'Large schools' : 'Growing schools'}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs text-gray-400">{sym}</span>
                      <span className="text-3xl font-extrabold text-gray-900">{fmt(p, currency)}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      per {billingPeriod === 'monthly' ? 'month' : billingPeriod === 'yearly' ? 'year' : 'term'}
                      {billingPeriod !== 'monthly' && plan.pricing?.[currency] && (
                        <> · ≈ {sym} {fmt(Math.round(p / (billingPeriod === 'yearly' ? 12 : 4)), currency)}/mo</>
                      )}
                    </p>
                  </div>

                  <ul className="space-y-1.5 mb-5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                        <HiOutlineCheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.accent}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(key)}
                    disabled={processingPlan !== null}
                    className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${c.btn}`}
                  >
                    {processingPlan === key ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                    ) : (
                      <><HiOutlineCreditCard className="w-4 h-4" /> {isCurrent ? 'Renew' : isActive ? 'Upgrade' : 'Subscribe'}</>
                    )}
                  </button>

                  <p className="text-center text-[9px] text-gray-300 mt-2">Mobile Money · Visa · Mastercard</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-500" />
          </div>
        )}

        {/* ─── Starter (free) ─── */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <HiOutlineStar className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-700">Starter — Free (30-day trial)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs text-gray-500">
            {['Up to 100 pupils', 'Basic attendance', 'Simple fees', 'Up to 5 teachers', 'Email support', '30-day trial'].map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <HiOutlineCheckCircle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" /> {f}
              </div>
            ))}
          </div>
        </div>

        {/* ─── Trust badges ─── */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><HiOutlineShieldCheck className="w-3.5 h-3.5" /> Secure via PesaPal</span>
          <span className="flex items-center gap-1"><HiOutlineCreditCard className="w-3.5 h-3.5" /> Mobile Money, Visa, Mastercard</span>
          <span className="flex items-center gap-1"><HiOutlineCheckCircle className="w-3.5 h-3.5" /> 7-day money-back</span>
        </div>

        {/* ─── Payment History ─── */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-sm text-gray-800 mb-3">Payment History</h3>
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-xs min-w-[480px]">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="text-left px-4 py-2 font-medium">Date</th>
                    <th className="text-left px-4 py-2 font-medium">Plan</th>
                    <th className="text-right px-4 py-2 font-medium">Amount</th>
                    <th className="text-center px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-500">
                        {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${
                          s.plan_type === 'pro' ? 'bg-purple-100 text-purple-700'
                          : s.plan_type === 'standard' ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{s.plan_type}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-800">
                        {s.currency} {fmt(parseFloat(s.amount), s.currency)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold capitalize ${
                          s.payment_status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                          : s.payment_status === 'pending' ? 'bg-amber-100 text-amber-700'
                          : s.payment_status === 'failed' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{s.payment_status || s.status}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-400 font-mono text-[10px]">
                        {s.payment_reference || s.pesapal_tracking_id || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════
       *  Payment Modal — iframe + status phases
       * ═══════════════════════════════════════════ */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
            style={{ height: 'min(85vh, 700px)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <HiOutlineCreditCard className="w-5 h-5 text-primary-600" />
                <span className="font-semibold text-sm text-gray-800">
                  {modal.phase === 'completed' ? 'Payment Complete' :
                   modal.phase === 'failed' ? 'Payment Failed' :
                   modal.phase === 'checking' || modal.phase === 'pending' ? 'Verifying Payment...' :
                   'Complete Payment'}
                </span>
                <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium capitalize">
                  {modal.plan}
                </span>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-200 transition text-gray-500 hover:text-gray-800"
                title="Close"
              >
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            {/* Dynamic content based on phase */}
            {renderModalContent()}
          </div>
        </div>
      )}
    </>
  );
};

export default SubscribePage;
