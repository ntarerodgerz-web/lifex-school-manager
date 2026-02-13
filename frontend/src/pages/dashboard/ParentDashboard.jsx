import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useApi from '../../hooks/useApi';
import { HiOutlineClipboardList, HiOutlineCurrencyDollar, HiOutlineSpeakerphone, HiOutlineDocumentReport } from 'react-icons/hi';

const ParentDashboard = () => {
  const { user } = useAuth();
  const { get } = useApi();
  const [children, setChildren] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [childrenRes, annRes] = await Promise.all([
          get('/parents/my-children'),
          get('/announcements', { limit: 5 }),
        ]);
        setChildren(childrenRes.data || []);
        setAnnouncements(annRes.data || []);
      } catch { /* handled */ }
    };
    fetchData();
  }, [get]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold">Welcome, {user?.first_name}!</h1>
          <p className="text-primary-100 mt-1">Parent Dashboard</p>
        </div>
      </div>

      {/* Children cards */}
      <div className="space-y-4">
        {children.map((child) => (
          <div key={child.id} className="card">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-lg">
                {child.first_name[0]}{child.last_name[0]}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  {child.first_name} {child.last_name}
                </h3>
                <p className="text-sm text-gray-500">{child.class_name || 'Unassigned'}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <HiOutlineClipboardList className="w-8 h-8 text-emerald-500" />
                    <div>
                      <p className="text-xs text-gray-500">Attendance</p>
                      <p className="font-semibold text-gray-800">View Details</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <HiOutlineCurrencyDollar className="w-8 h-8 text-amber-500" />
                    <div>
                      <p className="text-xs text-gray-500">Fees Balance</p>
                      <p className="font-semibold text-gray-800">Check Balance</p>
                    </div>
                  </div>
                  <Link
                    to={`/report-card/${child.id}`}
                    className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <HiOutlineDocumentReport className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500">Performance</p>
                      <p className="font-semibold text-blue-700">View Report Card</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {children.length === 0 && (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-lg">No children linked to your account yet.</p>
            <p className="text-sm mt-1">Please contact the school administrator.</p>
          </div>
        )}
      </div>

      {/* Announcements */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <HiOutlineSpeakerphone className="w-5 h-5 text-primary-500" />
          School Announcements
        </h3>
        {announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-800">{ann.title}</p>
                <p className="text-sm text-gray-500 mt-1">{ann.body}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(ann.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No announcements</p>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;

