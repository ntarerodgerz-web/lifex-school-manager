import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineExclamationCircle,
  HiOutlineLockClosed,
  HiOutlineLogout,
  HiOutlinePhone,
  HiOutlineMail,
  HiOutlineCheckCircle,
  HiOutlineStar,
  HiOutlineLightningBolt,
} from 'react-icons/hi';

const plans = [
  {
    name: 'Starter',
    key: 'starter',
    price: 'Free Trial',
    period: '30 days',
    icon: HiOutlineStar,
    color: 'gray',
    features: [
      'Up to 100 pupils',
      'Basic attendance tracking',
      'Simple fee management',
      'Up to 5 teachers',
      'Email support',
    ],
  },
  {
    name: 'Standard',
    key: 'standard',
    price: 'UGX 150,000',
    period: '/ term',
    icon: HiOutlineLightningBolt,
    color: 'blue',
    popular: true,
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
  {
    name: 'Pro',
    key: 'pro',
    price: 'UGX 300,000',
    period: '/ term',
    icon: HiOutlineCheckCircle,
    color: 'purple',
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
];

const SubscriptionExpired = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isTrialExpired = user?.subscription_status === 'trial' || user?.subscription_status === 'expired';
  const isSuspended = user?.subscription_status === 'suspended';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
            <HiOutlineLockClosed className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">{user?.school_name || 'School Manager'}</h1>
            <p className="text-xs text-gray-400">Account restricted</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
        >
          <HiOutlineLogout className="w-4 h-4" />
          Log Out
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Alert Banner */}
        <div className={`rounded-2xl p-6 mb-10 ${isSuspended ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isSuspended ? 'bg-red-100' : 'bg-amber-100'}`}>
              <HiOutlineExclamationCircle className={`w-7 h-7 ${isSuspended ? 'text-red-500' : 'text-amber-500'}`} />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isSuspended ? 'text-red-800' : 'text-amber-800'}`}>
                {isSuspended
                  ? 'Your Subscription Has Been Suspended'
                  : 'Your Free Trial Has Ended'}
              </h2>
              <p className={`mt-2 text-sm leading-relaxed ${isSuspended ? 'text-red-700' : 'text-amber-700'}`}>
                {isSuspended
                  ? 'Your school subscription has been suspended. Please contact the School Manager support team to resolve this issue and restore access.'
                  : `Your 30-day free trial for ${user?.school_name || 'your school'} has ended. To continue using School Manager — managing pupils, teachers, attendance, fees and more — please subscribe to one of our affordable plans below.`}
              </p>
              {user?.trial_ends_at && (
                <p className="mt-2 text-xs text-gray-500">
                  Trial ended: {new Date(user.trial_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* What Happens */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-10">
          <h3 className="text-lg font-bold text-gray-800 mb-3">What happens now?</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
              Your data is safe — we keep everything for <strong>90 days</strong> after expiry.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
              You cannot add new records or access reports until your subscription is active.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
              Contact our team below to activate a plan — it only takes a few minutes.
            </li>
          </ul>
        </div>

        {/* Pricing Plans */}
        {!isSuspended && (
          <>
            <h3 className="text-center text-2xl font-bold text-gray-800 mb-2">Choose a Plan</h3>
            <p className="text-center text-gray-500 text-sm mb-8">All plans include a 7-day money-back guarantee</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {plans.map((plan) => (
                <div
                  key={plan.key}
                  className={`relative bg-white rounded-2xl border-2 p-6 transition-shadow hover:shadow-lg ${
                    plan.popular ? 'border-blue-500 shadow-md' : 'border-gray-200'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 bg-${plan.color}-100`}>
                    <plan.icon className={`w-5 h-5 text-${plan.color}-500`} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-800">{plan.name}</h4>
                  <div className="mt-2 mb-4">
                    <span className="text-2xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-sm text-gray-500 ml-1">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <HiOutlineCheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 text-${plan.color}-500`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.key !== 'starter' && (
                    <button
                      onClick={() => navigate('/subscribe')}
                      className={`w-full py-3 rounded-xl text-white font-bold text-sm transition-all ${
                        plan.key === 'pro' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Subscribe to {plan.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Subscribe CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Ready to Subscribe?</h3>
          <p className="text-blue-100 text-sm mb-6 max-w-lg mx-auto">
            Subscribe instantly using Mobile Money, Visa, Mastercard, or Bank Transfer via PesaPal — it only takes a few minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/subscribe')}
              className="flex items-center gap-2 bg-white text-blue-700 px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-50 transition shadow-lg"
            >
              <HiOutlineLightningBolt className="w-5 h-5" />
              Subscribe Now
            </button>
            <a
              href="tel:+256700000000"
              className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-blue-400 transition border border-blue-400"
            >
              <HiOutlinePhone className="w-5 h-5" />
              Call: +256 700 000 000
            </a>
            <a
              href="mailto:support@schoolmanager.com"
              className="flex items-center gap-2 bg-blue-500/80 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-blue-400 transition border border-blue-400/50"
            >
              <HiOutlineMail className="w-5 h-5" />
              support@schoolmanager.com
            </a>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-8">
          School Manager © {new Date().getFullYear()} — Empowering schools across Africa with digital tools.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionExpired;

