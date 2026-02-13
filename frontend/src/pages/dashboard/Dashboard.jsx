import { useAuth } from '../../context/AuthContext';
import SuperAdminDashboard from './SuperAdminDashboard';
import AdminDashboard from './AdminDashboard';
import TeacherDashboard from './TeacherDashboard';
import ParentDashboard from './ParentDashboard';

/**
 * Role-based dashboard router.
 * Renders the appropriate dashboard based on user role.
 */
const Dashboard = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case 'SUPER_ADMIN':
      return <SuperAdminDashboard />;
    case 'SCHOOL_ADMIN':
      return <AdminDashboard />;
    case 'TEACHER':
      return <TeacherDashboard />;
    case 'PARENT':
      return <ParentDashboard />;
    default:
      return <AdminDashboard />;
  }
};

export default Dashboard;

