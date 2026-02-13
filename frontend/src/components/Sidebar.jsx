import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineClipboardList,
  HiOutlineCurrencyDollar,
  HiOutlineSpeakerphone,
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineUsers,
  HiOutlineBookOpen,
  HiOutlineCollection,
  HiOutlineDocumentReport,
  HiOutlineGlobeAlt,
  HiOutlineCreditCard,
  HiOutlineMail,
  HiOutlineKey,
  HiOutlineChevronDown,
} from 'react-icons/hi';

const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '');

/**
 * Navigation structure — supports flat items and collapsible groups.
 * A group is defined by: { label, icon, children: [...items] }
 * A flat item is: { to, label, icon }
 */
const navItems = {
  SUPER_ADMIN: [
    { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/schools', label: 'Schools', icon: HiOutlineAcademicCap },
    { to: '/subscriptions', label: 'Subscriptions', icon: HiOutlineCurrencyDollar },
    { to: '/broadcasts', label: 'Broadcasts', icon: HiOutlineGlobeAlt },
  ],
  SCHOOL_ADMIN: [
    { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/pupils', label: 'Pupils/Students', icon: HiOutlineUserGroup },
    { to: '/classes', label: 'Classes', icon: HiOutlineBookOpen },
    { to: '/subjects', label: 'Subjects', icon: HiOutlineCollection },
    { to: '/teachers', label: 'Teachers', icon: HiOutlineAcademicCap },
    { to: '/parents', label: 'Parents', icon: HiOutlineUsers },
    { to: '/attendance', label: 'Attendance', icon: HiOutlineClipboardList },
    { to: '/performance', label: 'Performance', icon: HiOutlineDocumentReport },
    { to: '/fees', label: 'Fees & Payments', icon: HiOutlineCurrencyDollar },
    { to: '/reports', label: 'Reports', icon: HiOutlineChartBar },
    {
      label: 'Communication',
      icon: HiOutlineSpeakerphone,
      children: [
        { to: '/announcements', label: 'Announcements', icon: HiOutlineSpeakerphone },
        { to: '/broadcasts', label: 'Broadcasts', icon: HiOutlineGlobeAlt },
        { to: '/sms', label: 'Email Notifications', icon: HiOutlineMail },
        { to: '/api-keys', label: 'API Access', icon: HiOutlineKey },
      ],
    },
    { to: '/subscribe', label: 'Subscribe', icon: HiOutlineCreditCard },
    { to: '/settings', label: 'Settings', icon: HiOutlineCog },
  ],
  TEACHER: [
    { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/pupils', label: 'Pupils/Students', icon: HiOutlineUserGroup },
    { to: '/attendance', label: 'Attendance', icon: HiOutlineClipboardList },
    { to: '/performance', label: 'Performance', icon: HiOutlineDocumentReport },
    { to: '/reports', label: 'Reports', icon: HiOutlineChartBar },
    {
      label: 'Communication',
      icon: HiOutlineSpeakerphone,
      children: [
        { to: '/announcements', label: 'Announcements', icon: HiOutlineSpeakerphone },
        { to: '/broadcasts', label: 'Broadcasts', icon: HiOutlineGlobeAlt },
      ],
    },
  ],
  PARENT: [
    { to: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
    { to: '/announcements', label: 'Announcements', icon: HiOutlineSpeakerphone },
    { to: '/broadcasts', label: 'Broadcasts', icon: HiOutlineGlobeAlt },
  ],
};

/**
 * Compute remaining days of trial / subscription for the badge.
 */
const computeDaysLeft = (user) => {
  if (!user || user.role === 'SUPER_ADMIN') return null;
  const now = new Date();

  if (user.subscription_status === 'trial' && user.trial_ends_at) {
    return Math.max(0, Math.ceil((new Date(user.trial_ends_at) - now) / 86400000));
  }
  if (user.subscription_status === 'active' && user.subscription_expires_at) {
    return Math.max(0, Math.ceil((new Date(user.subscription_expires_at) - now) / 86400000));
  }
  return null;
};

/** Single nav link */
const SidebarLink = ({ item, onClose }) => (
  <NavLink
    to={item.to}
    onClick={onClose}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
        isActive
          ? 'bg-primary-400 text-white'
          : 'text-primary-100 hover:bg-primary-400/50 hover:text-white'
      }`
    }
  >
    <item.icon className="w-5 h-5 flex-shrink-0" />
    {item.label}
  </NavLink>
);

/** Collapsible group */
const SidebarGroup = ({ group, onClose, isOpen, onToggle }) => {
  const location = useLocation();
  const isChildActive = group.children.some((child) => location.pathname.startsWith(child.to));

  return (
    <div>
      {/* Group header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
          isChildActive && !isOpen
            ? 'bg-primary-400 text-white'
            : 'text-primary-100 hover:bg-primary-400/50 hover:text-white'
        }`}
      >
        <group.icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <HiOutlineChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Children */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="ml-3 pl-3 mt-1 mb-1 space-y-0.5 border-l-2 border-primary-400/40">
          {group.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary-400 text-white font-medium'
                    : 'text-primary-200 hover:bg-primary-400/30 hover:text-white'
                }`
              }
            >
              <child.icon className="w-4 h-4 flex-shrink-0" />
              {child.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const items = navItems[user?.role] || [];
  const daysLeft = computeDaysLeft(user);
  const location = useLocation();

  // Track which groups are open — auto-open if a child is active
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    items.forEach((item) => {
      if (item.children) {
        const childActive = item.children.some((c) => location.pathname.startsWith(c.to));
        initial[item.label] = childActive;
      }
    });
    return initial;
  });

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-primary-500 text-white transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / School Badge */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-400">
          {user?.school_badge_url ? (
            <img
              src={`${API_BASE}${user.school_badge_url}`}
              alt="School Badge"
              className="w-10 h-10 rounded-full object-cover border-2 border-accent-400 bg-white flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 bg-accent-400 rounded-full flex items-center justify-center flex-shrink-0">
              <HiOutlineAcademicCap className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight truncate" title={user?.role === 'SUPER_ADMIN' ? 'School Manager' : (user?.school_name || 'School Manager')}>
              {user?.role === 'SUPER_ADMIN' ? 'School Manager' : (user?.school_name || 'School Manager')}
            </h1>
            <p className="text-xs text-primary-200 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3 space-y-1 flex-1 overflow-y-auto">
          {items.map((item) =>
            item.children ? (
              <SidebarGroup
                key={item.label}
                group={item}
                onClose={onClose}
                isOpen={!!openGroups[item.label]}
                onToggle={() => toggleGroup(item.label)}
              />
            ) : (
              <SidebarLink key={item.to} item={item} onClose={onClose} />
            )
          )}
        </nav>

        {/* ─── Subscription / Trial Status Badge ─── */}
        {user?.role !== 'SUPER_ADMIN' && (
          <NavLink to="/subscribe" onClick={onClose} className="block px-4 py-3 border-t border-primary-400 hover:bg-primary-400/30 transition-colors">
            {user?.subscription_status === 'active' ? (
              <div className="flex items-center gap-2 text-xs text-primary-100">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="capitalize font-medium">{user.plan_type} plan</span>
                {daysLeft !== null && daysLeft <= 30 && (
                  <span className="ml-auto text-primary-200">{daysLeft}d left</span>
                )}
              </div>
            ) : user?.subscription_status === 'trial' ? (
              <div className={`flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 ${
                daysLeft !== null && daysLeft <= 7
                  ? 'bg-red-500/30 text-red-100'
                  : 'bg-amber-500/20 text-amber-100'
              }`}>
                <HiOutlineCollection className="w-4 h-4 flex-shrink-0" />
                <span>Free Trial</span>
                {daysLeft !== null && (
                  <span className="ml-auto font-bold">{daysLeft}d left</span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-red-200 bg-red-500/20 rounded-lg px-3 py-2 font-medium">
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                {user?.subscription_status === 'suspended' ? 'Suspended' : 'Expired'}
                <span className="ml-auto text-amber-200 font-bold">Subscribe →</span>
              </div>
            )}
          </NavLink>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
