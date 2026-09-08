import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { useAuth, type Role } from './lib/auth';
import Login from './pages/Login';
import Register from './pages/Register';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerProperties from './pages/owner/OwnerProperties';
import OwnerApplications from './pages/owner/OwnerApplications';
import OwnerApplicationDetail from './pages/owner/OwnerApplicationDetail';
import OwnerLeases from './pages/owner/OwnerLeases';
import OwnerPayments from './pages/owner/OwnerPayments';
import OwnerMaintenance from './pages/owner/OwnerMaintenance';
import OwnerCleaning from './pages/owner/OwnerCleaning';
import OwnerStaff from './pages/owner/OwnerStaff';
import OwnerWarnings from './pages/owner/OwnerWarnings';
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantBrowse from './pages/tenant/TenantBrowse';
import TenantApplications from './pages/tenant/TenantApplications';
import TenantApplicationDetail from './pages/tenant/TenantApplicationDetail';
import TenantPayments from './pages/tenant/TenantPayments';
import TenantMaintenance from './pages/tenant/TenantMaintenance';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffMaintenance from './pages/staff/StaffMaintenance';
import StaffCleaning from './pages/staff/StaffCleaning';

function Protected({ roles, children }: { roles: Role[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role.toLowerCase()}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<Layout />}>
        {/* Owner */}
        <Route path="/owner" element={<Protected roles={['OWNER']}><OwnerDashboard /></Protected>} />
        <Route path="/owner/properties" element={<Protected roles={['OWNER']}><OwnerProperties /></Protected>} />
        <Route path="/owner/applications" element={<Protected roles={['OWNER']}><OwnerApplications /></Protected>} />
        <Route path="/owner/applications/:id" element={<Protected roles={['OWNER']}><OwnerApplicationDetail /></Protected>} />
        <Route path="/owner/leases" element={<Protected roles={['OWNER']}><OwnerLeases /></Protected>} />
        <Route path="/owner/payments" element={<Protected roles={['OWNER']}><OwnerPayments /></Protected>} />
        <Route path="/owner/maintenance" element={<Protected roles={['OWNER']}><OwnerMaintenance /></Protected>} />
        <Route path="/owner/cleaning" element={<Protected roles={['OWNER']}><OwnerCleaning /></Protected>} />
        <Route path="/owner/staff" element={<Protected roles={['OWNER']}><OwnerStaff /></Protected>} />
        <Route path="/owner/warnings" element={<Protected roles={['OWNER']}><OwnerWarnings /></Protected>} />

        {/* Tenant */}
        <Route path="/tenant" element={<Protected roles={['TENANT']}><TenantDashboard /></Protected>} />
        <Route path="/tenant/browse" element={<Protected roles={['TENANT']}><TenantBrowse /></Protected>} />
        <Route path="/tenant/applications" element={<Protected roles={['TENANT']}><TenantApplications /></Protected>} />
        <Route path="/tenant/applications/:id" element={<Protected roles={['TENANT']}><TenantApplicationDetail /></Protected>} />
        <Route path="/tenant/payments" element={<Protected roles={['TENANT']}><TenantPayments /></Protected>} />
        <Route path="/tenant/maintenance" element={<Protected roles={['TENANT']}><TenantMaintenance /></Protected>} />

        {/* Staff */}
        <Route path="/staff" element={<Protected roles={['STAFF']}><StaffDashboard /></Protected>} />
        <Route path="/staff/maintenance" element={<Protected roles={['STAFF']}><StaffMaintenance /></Protected>} />
        <Route path="/staff/cleaning" element={<Protected roles={['STAFF']}><StaffCleaning /></Protected>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
