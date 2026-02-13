import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import {
  HiOutlineClipboardList,
  HiOutlineSpeakerphone,
  HiOutlineDocumentReport,
  HiOutlineUserGroup,
  HiOutlineChartBar,
  HiOutlineArrowRight,
} from 'react-icons/hi';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { get } = useApi();
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [attRes, annRes] = await Promise.all([
          get('/attendance/summary'),
          get('/announcements', { limit: 5 }),
        ]);
        setAttendance(attRes.data || []);
        setAnnouncements(annRes.data || []);
      } catch { /* handled */ }
    };
    fetchData();
  }, [get]);

  /* ─── Quick Actions ─── */
  const quickActions = [
    {
      to: '/attendance',
      label: 'Log Attendance',
      description: 'Mark daily attendance for your classes',
      icon: HiOutlineClipboardList,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      to: '/performance',
      label: 'Record Scores',
      description: 'Enter exam & assessment scores',
      icon: HiOutlineDocumentReport,
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      to: '/pupils',
      label: 'View Pupils',
      description: 'Browse pupil/student list & profiles',
      icon: HiOutlineUserGroup,
      gradient: 'from-violet-500 to-violet-600',
    },
    {
      to: '/reports',
      label: 'View Reports',
      description: 'Attendance & enrollment reports',
      icon: HiOutlineChartBar,
      gradient: 'from-amber-500 to-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="text-primary-100 mt-1">Welcome, {user?.first_name} {user?.last_name}</p>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group relative bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">{action.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{action.description}</p>
              <HiOutlineArrowRight className="absolute top-5 right-5 w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Today&apos;s Attendance</h3>
            <Link to="/attendance" className="text-sm text-primary-500 hover:underline flex items-center gap-1">
              Take Attendance <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {attendance.length > 0 ? (
            <div className="space-y-3">
              {attendance.slice(0, 5).map((row) => (
                <div key={row.class_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{row.class_name}</span>
                  <div className="flex gap-3 text-sm">
                    <span className="text-emerald-600">{row.present_count} present</span>
                    <span className="text-red-500">{row.absent_count} absent</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <HiOutlineClipboardList className="w-12 h-12 mx-auto mb-2" />
              <p>No attendance recorded today</p>
              <Link to="/attendance" className="text-sm text-primary-500 hover:underline mt-2 inline-block">
                Take attendance now →
              </Link>
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Announcements</h3>
            <Link to="/announcements" className="text-sm text-primary-500 hover:underline flex items-center gap-1">
              View All <HiOutlineArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-800">{ann.title}</p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ann.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(ann.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <HiOutlineSpeakerphone className="w-12 h-12 mx-auto mb-2" />
              <p>No announcements yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
