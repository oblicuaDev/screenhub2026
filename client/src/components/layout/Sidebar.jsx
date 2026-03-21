import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const IconDashboard = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="1.8"/>
    <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="1.8"/>
    <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="1.8"/>
    <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="1.8"/>
  </svg>
);
const IconScreens = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.8"/>
    <path d="M8 21h8M12 17v4" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconBilling = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="1.8"/>
    <path d="M2 10h20" strokeWidth="1.8"/>
    <path d="M6 15h4" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const IconAdmin = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" strokeWidth="1.8" strokeLinejoin="round"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path d="M17 16l4-4m0 0l-4-4m4 4H7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
    { to: '/screens', label: 'Pantallas', icon: <IconScreens /> },
    { to: '/billing', label: 'Facturación', icon: <IconBilling />, roles: ['admin'] },
    { to: '/superadmin', label: 'Superadmin', icon: <IconAdmin />, roles: ['superadmin'] },
  ].filter(item => !item.roles || item.roles.includes(user?.role));

  const handleLogout = () => { logout(); navigate('/login'); };

  // Trial indicator
  const trialDaysLeft = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / 86400000))
    : null;
  const onTrial = trialDaysLeft !== null && !user?.subscriptionStatus;

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--accent)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px var(--accent-glow)',
        }}>
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <path d="M8 21h8M12 17v4" stroke="white" fill="none" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1 }}>
            ScreenHub
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
            DIGITAL SIGNAGE
          </div>
        </div>
      </div>

      {/* Org name */}
      {user?.orgName && (
        <div style={{
          padding: '10px 20px',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-body)',
        }}>
          <span style={{ color: 'var(--text-muted)', marginRight: 6 }}>ORG</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.orgName}</span>
        </div>
      )}

      {/* Trial badge */}
      {onTrial && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border)' }}>
          <span className="badge-trial" style={{ fontSize: '0.7rem' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            Trial · {trialDaysLeft}d restantes
          </span>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: '0.875rem',
                fontFamily: 'var(--font-body)',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                border: isActive ? '1px solid var(--border-bright)' : '1px solid transparent',
                transition: 'all 0.15s',
                cursor: 'pointer',
                position: 'relative',
              }}>
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 18,
                    background: 'var(--accent)',
                    borderRadius: '0 2px 2px 0',
                  }} />
                )}
                <span style={{ color: isActive ? 'var(--accent-bright)' : 'inherit' }}>{icon}</span>
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User / Logout */}
      <div style={{ padding: '12px 12px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          padding: '8px 12px',
          borderRadius: 8,
          marginBottom: 4,
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {user?.role?.toUpperCase()}
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            fontSize: '0.875rem',
            fontFamily: 'var(--font-body)',
            color: 'var(--text-muted)',
            background: 'transparent',
            border: '1px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <IconLogout />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
