import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { screensApi } from '../api/screens';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function StatCard({ label, value, icon, color, loading }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-body)', marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color, lineHeight: 1 }}>
            {loading ? '—' : value}
          </p>
        </div>
        <div style={{
          width: 40, height: 40,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    screensApi.list()
      .then(setScreens)
      .catch(() => toast.error('Error cargando pantallas'))
      .finally(() => setLoading(false));
  }, []);

  const total = screens.length;
  const published = screens.filter(s => s.status === 'published').length;
  const drafts = screens.filter(s => s.status === 'draft').length;
  const totalContent = screens.reduce((sum, s) => sum + parseInt(s.content_count || 0), 0);

  const trialDaysLeft = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / 86400000))
    : null;
  const onTrial = trialDaysLeft !== null && !user?.subscriptionStatus;

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>
          Bienvenido, {user?.name?.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Trial alert */}
      {onTrial && (
        <div className="alert-warning" style={{ marginBottom: 24 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <div>
            <strong>Período de prueba activo</strong> — Quedan <strong>{trialDaysLeft} días</strong>.{' '}
            <Link to="/billing" style={{ color: 'var(--warning)', fontWeight: 600 }}>Suscribirte ahora →</Link>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }} className="stagger">
        <StatCard
          label="Total pantallas"
          value={total}
          color="var(--accent-bright)"
          loading={loading}
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.8"/><path d="M8 21h8M12 17v4" strokeWidth="1.8" strokeLinecap="round"/></svg>}
        />
        <StatCard
          label="Publicadas"
          value={published}
          color="var(--success)"
          loading={loading}
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth="1.8"/><path d="M9 12l2 2 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        />
        <StatCard
          label="Borradores"
          value={drafts}
          color="var(--text-secondary)"
          loading={loading}
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="1.8" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="1.8" strokeLinecap="round"/></svg>}
        />
        <StatCard
          label="Contenidos"
          value={totalContent}
          color="var(--accent-cyan)"
          loading={loading}
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.8"/><path d="M9 9l6 3-6 3V9z" fill="currentColor" stroke="none"/></svg>}
        />
      </div>

      {/* Plan info */}
      {user?.planName && (
        <div className="card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="badge-active">PLAN {user.planName?.toUpperCase()}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              {published} / {user.screenLimit} pantallas publicadas
            </span>
          </div>
          {published >= (user.screenLimit || 1) && (
            <Link to="/billing" className="btn-warning btn-sm">Mejorar plan</Link>
          )}
        </div>
      )}

      {/* Recent screens */}
      <div className="card">
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem' }}>
            Pantallas recientes
          </h2>
          <Link to="/screens" style={{ color: 'var(--accent-bright)', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>
            Ver todas →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div className="spinner" />
          </div>
        ) : screens.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.875rem' }}>
              No hay pantallas creadas aún
            </p>
            <Link to="/screens" className="btn-primary">
              Crear primera pantalla
            </Link>
          </div>
        ) : (
          <div>
            {screens.slice(0, 6).map((screen, i) => (
              <Link
                key={screen.id}
                to={`/screens/${screen.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: i < Math.min(screens.length, 6) - 1 ? '1px solid var(--border)' : 'none',
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.8"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                      {screen.name}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {screen.content_count || 0} contenidos · {screen.orientation}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="code" style={{ fontSize: '0.7rem' }}>{screen.short_code}</span>
                  <span className={screen.status === 'published' ? 'badge-published' : 'badge-draft'}>
                    {screen.status === 'published' ? 'Publicada' : 'Borrador'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
