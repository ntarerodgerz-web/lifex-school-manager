import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import {
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineCurrencyDollar,
  HiOutlineShieldCheck,
  HiOutlineExclamationCircle,
  HiOutlineClock,
} from 'react-icons/hi';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { get } = useApi();
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, trial: 0, expired: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await get('/schools', { limit: 100 });
        const list = res.data?.schools || [];
        setSchools(list);
        setStats({
          total: res.data?.total || list.length,
          active: list.filter((s) => s.subscription_status === 'active').length,
          trial: list.filter((s) => s.subscription_status === 'trial').length,
          expired: list.filter((s) => ['expired', 'suspended'].includes(s.subscription_status)).length,
        });
      } catch {
        // Errors handled by useApi
      }
    };
    fetchData();
  }, [get]);

  const statCards = [
    { label: 'Total Schools', value: stats.total, icon: HiOutlineAcademicCap, color: 'from-blue-500 to-blue-600' },
    { label: 'Active Subscriptions', value: stats.active, icon: HiOutlineShieldCheck, color: 'from-emerald-500 to-emerald-600' },
    { label: 'On Trial', value: stats.trial, icon: HiOutlineClock, color: 'from-amber-500 to-amber-600' },
    { label: 'Expired / Suspended', value: stats.expired, icon: HiOutlineExclamationCircle, color: 'from-red-500 to-red-600' },
  ];

  const statusBadge = (status) => {
    const map = {
      active: 'bg-emerald-100 text-emerald-700',
      trial: 'bg-amber-100 text-amber-700',
      expired: 'bg-red-100 text-red-700',
      suspended: 'bg-gray-100 text-gray-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  const planBadge = (plan) => {
    const map = {
      starter: 'bg-gray-100 text-gray-700',
      standard: 'bg-blue-100 text-blue-700',
      pro: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${map[plan] || 'bg-gray-100 text-gray-600'}`}>
        {plan}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">School Manager Platform</h1>
        <p className="text-primary-100 mt-1">
          Welcome back, {user?.first_name}! You are logged in as Super Admin.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-r ${stat.color} rounded-xl p-5 text-white shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/80">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className="w-10 h-10 text-white/30" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/schools"
            className="card flex items-center gap-4 hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition">
              <HiOutlineAcademicCap className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Manage Schools</p>
              <p className="text-xs text-gray-500">View and manage all schools</p>
            </div>
          </Link>
          <Link
            to="/subscriptions"
            className="card flex items-center gap-4 hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition">
              <HiOutlineCurrencyDollar className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Subscriptions</p>
              <p className="text-xs text-gray-500">Manage billing & plans</p>
            </div>
          </Link>
          <Link
            to="/profile"
            className="card flex items-center gap-4 hover:shadow-md transition-shadow group"
          >
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition">
              <HiOutlineUserGroup className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="font-medium text-gray-800">My Profile</p>
              <p className="text-xs text-gray-500">Update your account settings</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent schools */}
      {schools.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Schools</h3>
            <Link to="/schools" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3">School Name</th>
                  <th className="text-left p-3">District</th>
                  <th className="text-center p-3">Plan</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-left p-3">Registered</th>
                </tr>
              </thead>
              <tbody>
                {schools.slice(0, 10).map((school) => (
                  <tr key={school.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">{school.name}</td>
                    <td className="p-3 text-gray-600">{school.district || '—'}</td>
                    <td className="p-3 text-center">{planBadge(school.plan_type)}</td>
                    <td className="p-3 text-center">{statusBadge(school.subscription_status)}</td>
                    <td className="p-3 text-gray-500 text-xs">
                      {new Date(school.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;

