import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import {
  HiOutlineUserGroup, HiOutlineAcademicCap, HiOutlineClipboardList,
  HiOutlineCurrencyDollar, HiOutlineSpeakerphone, HiOutlineChartBar,
} from 'react-icons/hi';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { get } = useApi();
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, attendanceRes] = await Promise.all([
          get('/reports/summary'),
          get('/attendance/summary'),
        ]);
        setSummary(summaryRes.data);
        setAttendance(attendanceRes.data);
      } catch {
        // Errors handled by useApi
      }
    };
    fetchData();
  }, [get]);

  const stats = summary ? [
    { label: 'Total Pupils', value: summary.total_pupils, icon: HiOutlineUserGroup, color: 'from-blue-500 to-blue-600' },
    { label: 'Total Teachers', value: summary.total_teachers, icon: HiOutlineAcademicCap, color: 'from-emerald-500 to-emerald-600' },
    { label: 'Fees Collected', value: `UGX ${Number(summary.total_fees_collected).toLocaleString()}`, icon: HiOutlineCurrencyDollar, color: 'from-amber-500 to-amber-600' },
    { label: 'Attendance Today', value: attendance.length > 0 ? `${Math.round(attendance.reduce((a, c) => a + (parseInt(c.present_count) || 0), 0) / Math.max(attendance.reduce((a, c) => a + (parseInt(c.total_pupils) || 1), 0), 1) * 100)}%` : '—', icon: HiOutlineClipboardList, color: 'from-purple-500 to-purple-600' },
  ] : [];

  const quickActions = [
    { to: '/announcements', label: 'Add Announcement', icon: HiOutlineSpeakerphone },
    { to: '/attendance', label: 'Recent Attendance', icon: HiOutlineClipboardList },
    { to: '/reports', label: 'Fee Summary', icon: HiOutlineChartBar },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">{user?.school_name || 'School'}</h1>
        <p className="text-primary-100 mt-1">Admin Dashboard</p>
      </div>

      {/* Stat cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
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
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="card flex items-center gap-4 hover:shadow-md transition-shadow group"
            >
              <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center group-hover:bg-primary-100 transition">
                <action.icon className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <p className="font-medium text-gray-800">{action.label}</p>
                <p className="text-xs text-gray-500">Click to manage</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent attendance summary */}
      {attendance.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Attendance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3">Class</th>
                  <th className="text-center p-3">Present</th>
                  <th className="text-center p-3">Absent</th>
                  <th className="text-center p-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => (
                  <tr key={row.class_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-medium">{row.class_name}</td>
                    <td className="p-3 text-center text-emerald-600 font-semibold">{row.present_count}</td>
                    <td className="p-3 text-center text-red-500 font-semibold">{row.absent_count}</td>
                    <td className="p-3 text-center text-gray-600">{row.total_pupils}</td>
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

export default AdminDashboard;

