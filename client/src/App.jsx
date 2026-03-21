import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Screens from './pages/Screens';
import ScreenDetail from './pages/ScreenDetail';
import Player from './pages/Player';
import Billing from './pages/Billing';
import SuperAdmin from './pages/SuperAdmin';
import TrialExpiredModal from './components/TrialExpiredModal';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div style={{ width: 40, height: 40 }} className="spinner" />
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          LOADING SCREENHUB
        </p>
      </div>
    </div>
  );
}

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const { user, trialExpired } = useAuth();

  return (
    <>
      {user && trialExpired && <TrialExpiredModal />}
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/player/:slug" element={<Player />} />
        <Route path="/player/code/:code" element={<Player byCode />} />

        {/* Protected */}
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/screens" element={<Screens />} />
          <Route path="/screens/:id" element={<ScreenDetail />} />
          <Route path="/billing" element={<Billing />} />
        </Route>

        {/* Superadmin */}
        <Route element={<PrivateRoute roles={['superadmin']}><Layout /></PrivateRoute>}>
          <Route path="/superadmin" element={<SuperAdmin />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
