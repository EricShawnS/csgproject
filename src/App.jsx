import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute, { getHomePathForRole } from './components/ProtectedRoute';
import AdminLayout from './layouts/AdminLayout';
import OfficerLayout from './layouts/OfficerLayout';
import Login from './pages/login';
import NotFound from './pages/NotFound';

const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const EventManagement = lazy(() => import('./pages/admin/EventManagement'));
const ExcuseRequests = lazy(() => import('./pages/admin/ExcuseRequests'));
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'));
const StudentRecords = lazy(() => import('./pages/admin/StudentRecords'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const Notifications = lazy(() => import('./pages/admin/Notifications'));
const ActivityLog = lazy(() => import('./pages/admin/ActivityLog'));
const AdminHelpCenter = lazy(() => import('./pages/admin/HelpCenter'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

const OfficerDashboard = lazy(() => import('./pages/officer/Dashboard'));
const OfficerStudents = lazy(() => import('./pages/officer/students'));
const Attendance = lazy(() => import('./pages/officer/Attendance'));
const PenaltiesPayments = lazy(() => import('./pages/officer/PenaltiesPayments'));
const OfficerReports = lazy(() => import('./pages/officer/Reports'));
const OfficerEvents = lazy(() => import('./pages/officer/Events'));
const OfficerAnnouncements = lazy(() => import('./pages/officer/Announcements'));
const OfficerHelpCenter = lazy(() => import('./pages/officer/HelpCenter'));
const OfficerSettings = lazy(() => import('./pages/officer/Settings'));

function RootRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-mut">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getHomePathForRole(role)} replace />;
}

function LazyPage({ children }) {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-line p-4 text-sm text-mut dark:border-slate-800">
          Loading view...
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'instructor']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, handle: { title: 'Dashboard' }, element: <LazyPage><AdminDashboard /></LazyPage> },
      { path: 'events', handle: { title: 'Event Management' }, element: <LazyPage><EventManagement /></LazyPage> },
      { path: 'excuse-requests', handle: { title: 'Excuse Requests' }, element: <LazyPage><ExcuseRequests /></LazyPage> },
      { path: 'announcements', handle: { title: 'Announcements' }, element: <LazyPage><AdminAnnouncements /></LazyPage> },
      { path: 'students', handle: { title: 'Student Records' }, element: <LazyPage><StudentRecords /></LazyPage> },
      { path: 'reports', handle: { title: 'Reports' }, element: <LazyPage><AdminReports /></LazyPage> },
      { path: 'notifications', handle: { title: 'Notifications' }, element: <LazyPage><Notifications /></LazyPage> },
      { path: 'activity-log', handle: { title: 'Activity Log' }, element: <LazyPage><ActivityLog /></LazyPage> },
      { path: 'help', handle: { title: 'Help Center' }, element: <LazyPage><AdminHelpCenter /></LazyPage> },
      { path: 'settings', handle: { title: 'Settings' }, element: <LazyPage><AdminSettings /></LazyPage> },
    ],
  },
  {
    path: '/officer',
    element: (
      <ProtectedRoute allowedRoles={['officer']}>
        <OfficerLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, handle: { title: 'Dashboard' }, element: <LazyPage><OfficerDashboard /></LazyPage> },
      { path: 'students', handle: { title: 'Students' }, element: <LazyPage><OfficerStudents /></LazyPage> },
      { path: 'attendance', handle: { title: 'Attendance' }, element: <LazyPage><Attendance /></LazyPage> },
      { path: 'penalties-payments', handle: { title: 'Penalties & Payments' }, element: <LazyPage><PenaltiesPayments /></LazyPage> },
      { path: 'reports', handle: { title: 'Reports' }, element: <LazyPage><OfficerReports /></LazyPage> },
      { path: 'events', handle: { title: 'Events' }, element: <LazyPage><OfficerEvents /></LazyPage> },
      { path: 'announcements', handle: { title: 'Announcements' }, element: <LazyPage><OfficerAnnouncements /></LazyPage> },
      { path: 'help', handle: { title: 'Help Center' }, element: <LazyPage><OfficerHelpCenter /></LazyPage> },
      { path: 'settings', handle: { title: 'Settings' }, element: <LazyPage><OfficerSettings /></LazyPage> },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}