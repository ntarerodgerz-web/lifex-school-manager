import { useState, useMemo } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { HiOutlineExclamationCircle, HiOutlineClock, HiOutlineX } from 'react-icons/hi';

/**
 * Compute days remaining for trial or subscription.
 */
const computeDaysLeft = (user) => {
  if (!user || user.role === 'SUPER_ADMIN') return null;

  const now = new Date();

  if (user.subscription_status === 'trial' && user.trial_ends_at) {
    const end = new Date(user.trial_ends_at);
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  if (user.subscription_status === 'active' && user.subscription_expires_at) {
    const end = new Date(user.subscription_expires_at);
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  }

  // Check sessionStorage for real-time values from backend headers
  const trialDays = sessionStorage.getItem('trial_days_left');
  if (trialDays !== null) return parseInt(trialDays, 10);

  const subDays = sessionStorage.getItem('subscription_days_left');
  if (subDays !== null) return parseInt(subDays, 10);

  return null;
};

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { user } = useAuth();

  const daysLeft = useMemo(() => computeDaysLeft(user), [user]);

  // Determine banner style based on urgency
  const showBanner = !bannerDismissed && daysLeft !== null && daysLeft <= 14 && user?.role !== 'SUPER_ADMIN';
  const isUrgent = daysLeft <= 3;
  const isWarning = daysLeft <= 7;
  const isTrial = user?.subscription_status === 'trial';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content area offset by sidebar */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* ─── Subscription / Trial Warning Banner ─── */}
        {showBanner && (
          <div
            className={`relative flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium ${
              isUrgent
                ? 'bg-red-600 text-white'
                : isWarning
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 text-amber-800 border-b border-amber-200'
            }`}
          >
            {isUrgent ? (
              <HiOutlineExclamationCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <HiOutlineClock className="w-5 h-5 flex-shrink-0" />
            )}
            <span>
              {daysLeft === 0 ? (
                <>Your {isTrial ? 'trial' : 'subscription'} expires <strong>today</strong>!</>
              ) : daysLeft === 1 ? (
                <>Your {isTrial ? 'trial' : 'subscription'} expires <strong>tomorrow</strong>!</>
              ) : (
                <>
                  {isTrial ? 'Free trial' : 'Subscription'} expires in{' '}
                  <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
                </>
              )}
              {' '}
              {user?.role === 'SCHOOL_ADMIN' ? (
                <Link
                  to="/settings"
                  className={`underline font-bold ${
                    isUrgent || isWarning ? 'text-white' : 'text-amber-900'
                  }`}
                >
                  Subscribe now →
                </Link>
              ) : (
                <span>Contact your school admin to subscribe.</span>
              )}
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              className={`absolute right-3 p-1 rounded-full transition ${
                isUrgent || isWarning
                  ? 'hover:bg-white/20'
                  : 'hover:bg-amber-200'
              }`}
              title="Dismiss"
            >
              <HiOutlineX className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

