import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineClock,
  HiOutlineRefresh,
  HiOutlineHome,
  HiOutlineCreditCard,
} from 'react-icons/hi';

const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [status, setStatus] = useState('checking'); // checking, completed, pending, failed, error
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const pollInterval = useRef(null);

  const orderTrackingId = searchParams.get('OrderTrackingId');
  const merchantReference = searchParams.get('OrderMerchantReference');

  const checkPaymentStatus = useCallback(async () => {
    if (!orderTrackingId) {
      setStatus('error');
      return;
    }

    try {
      const { data } = await api.get(`/pesapal/status/${orderTrackingId}`);
      const result = data.data;

      setPaymentInfo(result);

      if (result.status === 'completed') {
        setStatus('completed');
        // Update user context with new subscription info
        updateUser({
          subscription_status: 'active',
          plan_type: result.plan,
        });
        // Stop polling
        if (pollInterval.current) clearInterval(pollInterval.current);
      } else if (result.status === 'failed' || result.status === 'reversed') {
        setStatus('failed');
        if (pollInterval.current) clearInterval(pollInterval.current);
      } else {
        setStatus('pending');
      }
    } catch {
      if (retryCount > 10) {
        setStatus('error');
        if (pollInterval.current) clearInterval(pollInterval.current);
      }
    }
  }, [orderTrackingId, retryCount, updateUser]);

  useEffect(() => {
    // Initial check
    checkPaymentStatus();

    // Poll every 5 seconds for pending payments
    pollInterval.current = setInterval(() => {
      setRetryCount((prev) => prev + 1);
      checkPaymentStatus();
    }, 5000);

    // Stop after 2 minutes
    const timeout = setTimeout(() => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      setStatus((prev) => (prev === 'pending' ? 'pending' : prev));
    }, 120000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-UG', { style: 'decimal' }).format(amount);
  };

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-blue-50 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verifying Payment</h2>
            <p className="text-gray-500">Please wait while we confirm your payment with PesaPal...</p>
          </div>
        );

      case 'completed':
        return (
          <div className="text-center space-y-5">
            <div className="w-24 h-24 mx-auto bg-emerald-50 rounded-full flex items-center justify-center animate-bounce-once">
              <HiOutlineCheckCircle className="w-14 h-14 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
              <p className="text-gray-500 mt-2">Your subscription has been activated. Thank you for subscribing!</p>
            </div>

            {paymentInfo && (
              <div className="bg-emerald-50 rounded-xl p-5 space-y-3 max-w-sm mx-auto text-left">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-bold text-gray-800 capitalize">{paymentInfo.plan}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-gray-800">{paymentInfo.currency} {formatCurrency(parseFloat(paymentInfo.amount))}</span>
                </div>
                {paymentInfo.paymentMethod && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Paid via</span>
                    <span className="font-medium text-gray-700">{paymentInfo.paymentMethod}</span>
                  </div>
                )}
                {paymentInfo.expiresAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valid until</span>
                    <span className="font-medium text-gray-700">
                      {new Date(paymentInfo.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary inline-flex items-center gap-2 mt-4"
            >
              <HiOutlineHome className="w-5 h-5" />
              Go to Dashboard
            </button>
          </div>
        );

      case 'pending':
        return (
          <div className="text-center space-y-5">
            <div className="w-24 h-24 mx-auto bg-amber-50 rounded-full flex items-center justify-center">
              <HiOutlineClock className="w-14 h-14 text-amber-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Processing</h2>
              <p className="text-gray-500 mt-2">
                Your payment is still being processed. This may take a minute.<br />
                Please do not close this page.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
              <div className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
              Checking payment status...
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
              <button
                onClick={checkPaymentStatus}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <HiOutlineRefresh className="w-4 h-4" />
                Check Again
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary inline-flex items-center gap-2 text-gray-500"
              >
                <HiOutlineHome className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              If you've already paid via mobile money, check your phone for a confirmation message.
              The system will automatically update once confirmed.
            </p>
          </div>
        );

      case 'failed':
        return (
          <div className="text-center space-y-5">
            <div className="w-24 h-24 mx-auto bg-red-50 rounded-full flex items-center justify-center">
              <HiOutlineXCircle className="w-14 h-14 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Failed</h2>
              <p className="text-gray-500 mt-2">
                {paymentInfo?.message || 'Your payment was not successful. Please try again.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
              <button
                onClick={() => navigate('/subscribe')}
                className="btn-primary inline-flex items-center gap-2"
              >
                <HiOutlineCreditCard className="w-5 h-5" />
                Try Again
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <HiOutlineHome className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center space-y-5">
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <HiOutlineXCircle className="w-14 h-14 text-gray-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Something Went Wrong</h2>
              <p className="text-gray-500 mt-2">
                We couldn't verify your payment at this time.<br />
                If you completed the payment, it will be activated automatically.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
              <button
                onClick={() => navigate('/subscribe')}
                className="btn-primary inline-flex items-center gap-2"
              >
                <HiOutlineCreditCard className="w-5 h-5" />
                View Plans
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary inline-flex items-center gap-2"
              >
                <HiOutlineHome className="w-4 h-4" />
                Go to Dashboard
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default PaymentCallbackPage;

