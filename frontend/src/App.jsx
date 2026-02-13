import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import SubscriptionExpired from './pages/SubscriptionExpired';

// Protected pages
import Dashboard from './pages/dashboard/Dashboard';
import PupilsList from './pages/pupils/PupilsList';
import PupilForm from './pages/pupils/PupilForm';
import ClassesPage from './pages/classes/ClassesPage';
import SubjectsPage from './pages/subjects/SubjectsPage';
import TeachersPage from './pages/teachers/TeachersPage';
import ParentsPage from './pages/parents/ParentsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import FeesPage from './pages/fees/FeesPage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import ProfilePage from './pages/profile/ProfilePage';
import SchoolsPage from './pages/schools/SchoolsPage';
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage';
import PerformancePage from './pages/assessments/PerformancePage';
import ReportCardPage from './pages/assessments/ReportCardPage';
import BroadcastsPage from './pages/broadcasts/BroadcastsPage';
import SubscribePage from './pages/subscribe/SubscribePage';
import PaymentCallbackPage from './pages/subscribe/PaymentCallbackPage';
import SmsPage from './pages/sms/SmsPage';
import ApiKeysPage from './pages/apikeys/ApiKeysPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading School Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/subscription-expired" element={isAuthenticated ? <SubscriptionExpired /> : <Navigate to="/login" />} />

      {/* Protected routes under dashboard layout */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard – all roles */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Profile – all roles */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Announcements – all roles */}
        <Route path="/announcements" element={<AnnouncementsPage />} />

        {/* Subscribe – school admins can subscribe */}
        <Route path="/subscribe" element={<SubscribePage />} />
        <Route path="/payment/callback" element={<PaymentCallbackPage />} />

        {/* Broadcasts – all roles can view, SUPER_ADMIN can create */}
        <Route path="/broadcasts" element={<BroadcastsPage />} />

        {/* SUPER_ADMIN: Schools management */}
        <Route
          path="/schools"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <SchoolsPage />
            </ProtectedRoute>
          }
        />

        {/* SUPER_ADMIN: Subscriptions management */}
        <Route
          path="/subscriptions"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <SubscriptionsPage />
            </ProtectedRoute>
          }
        />

        {/* Pupils – admin + teacher */}
        <Route
          path="/pupils"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER']}>
              <PupilsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pupils/new"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER']}>
              <PupilForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pupils/:id/edit"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER']}>
              <PupilForm />
            </ProtectedRoute>
          }
        />

        {/* Classes – admin only */}
        <Route
          path="/classes"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN']}>
              <ClassesPage />
            </ProtectedRoute>
          }
        />

        {/* Subjects – admin only */}
        <Route
          path="/subjects"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN']}>
              <SubjectsPage />
            </ProtectedRoute>
          }
        />

        {/* Teachers – admin only */}
        <Route
          path="/teachers"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN']}>
              <TeachersPage />
            </ProtectedRoute>
          }
        />

        {/* Parents – admin only */}
        <Route
          path="/parents"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN']}>
              <ParentsPage />
            </ProtectedRoute>
          }
        />

        {/* Attendance – admin + teacher */}
        <Route
          path="/attendance"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER']}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />

        {/* Fees & Payments – admin (parents view in their dashboard) */}
        <Route
          path="/fees"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN']}>
              <FeesPage />
            </ProtectedRoute>
          }
        />

        {/* Performance / Assessments – admin + teacher */}
        <Route
          path="/performance"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER']}>
              <PerformancePage />
            </ProtectedRoute>
          }
        />

        {/* Student Report Card – admin + teacher + parent */}
        <Route
          path="/report-card/:pupilId"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER', 'PARENT']}>
              <ReportCardPage />
            </ProtectedRoute>
          }
        />

        {/* Reports – admin + teacher */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* SMS Notifications – admin only (Pro plan) */}
        <Route
          path="/sms"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN']}>
              <SmsPage />
            </ProtectedRoute>
          }
        />

        {/* API Access – admin only (Pro plan) */}
        <Route
          path="/api-keys"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN']}>
              <ApiKeysPage />
            </ProtectedRoute>
          }
        />

        {/* Settings – admin only */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={['SCHOOL_ADMIN', 'SUPER_ADMIN']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all: redirect to dashboard or login */}
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
    </Routes>
  );
};

export default App;

