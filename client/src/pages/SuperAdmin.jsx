import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const formatPrice = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
const formatDate = d => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function StatCard({ label, value, color }) {
  return (
    <div className="stat-card">
      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value ?? '—'}</p>
    </div>
  );
}

export default function SuperAdmin() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);
  const [screens, setScreens] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [settings, setSettings] = useState({});
  const [mpConfig, setMpConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/superadmin/stats').then(r => r.data),
      api.get('/superadmin/organizations').then(r => r.data),
      api.get('/superadmin/users').then(r => r.data),
      api.get('/superadmin/screens').then(r => r.data),
      api.get('/superadmin/transactions').then(r => r.data),
      api.get('/superadmin/plans').then(r => r.data),
      api.get('/superadmin/settings').then(r => r.data),
      api.get('/superadmin/mercadopago').then(r => r.data).catch(() => null),
    ])
      .then(([st, o, u, sc, tr, pl, se, mp]) => {
        setStats(st); setOrgs(o); setUsers(u); setScreens(sc);
        setTransactions(tr); setPlans(pl); setSettings(se);
        setMpConfig(mp || {});
      })
      .catch(() => toast.error('Error cargando datos'))
      .finally(() => setLoading(false));
  }, []);

  const toggleOrg = async (orgId) => {
    try {
      const { data } = await api.put(`/superadmin/organizations/${orgId}/toggle`);
      setOrgs(o => o.map(org => org.id === orgId ? { ...org, is_active: data.is_active } : org));
      toast.success(`Organización ${data.is_active ? 'activada' : 'desactivada'}`);
    } catch { toast.error('Error'); }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put('/superadmin/settings', {
        trialDays: settings.trial_days,
        trialScreenLimit: settings.trial_screen_limit,
      });
      toast.success('Configuración guardada');
    } catch { toast.error('Error al guardar'); }
  };

  const saveMpConfig = async (e) => {
    e.preventDefault();
    try {
      await api.put('/superadmin/mercadopago', mpConfig);
      toast.success('Credenciales MercadoPago guardadas');
    } catch { toast.error('Error al guardar'); }
  };

  const TABS = [
    ['overview', 'Resumen'],
    ['organizations', 'Organizaciones'],
    ['users', 'Usuarios'],
    ['screens', 'Pantallas'],
    ['transactions', 'Transacciones'],
    ['plans', 'Planes'],
    ['settings', 'Configuración'],
  ];

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 className="page-title">Superadmin</h1>
            <span className="badge-danger">SYSTEM</span>
          </div>
          <p className="page-subtitle">Control total de la plataforma</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            style={{
              padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontFamily: 'var(--font-body)', fontWeight: tab === val ? 600 : 400,
              color: tab === val ? 'var(--accent-bright)' : 'var(--text-secondary)',
              borderBottom: `2px solid ${tab === val ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, whiteSpace: 'nowrap',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }} className="stagger">
            <StatCard label="Organizaciones" value={stats?.organizations} color="var(--accent-bright)" />
            <StatCard label="Usuarios" value={stats?.users} color="var(--accent-cyan)" />
            <StatCard label="Pantallas" value={stats?.screens} color="var(--text-secondary)" />
            <StatCard label="Suscripciones activas" value={stats?.activeSubscriptions} color="var(--success)" />
            <StatCard label="Ingresos totales" value={formatPrice(stats?.totalRevenue || 0)} color="var(--warning)" />
          </div>
        </div>
      )}

      {/* Organizations */}
      {tab === 'organizations' && (
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>Organización</th><th>Plan</th><th>Pantallas</th><th>Publicadas</th><th>Usuarios</th><th>Trial vence</th><th>Estado</th><th>Acciones</th>
            </tr></thead>
            <tbody>
              {orgs.map(org => (
                <tr key={org.id}>
                  <td style={{ fontWeight: 600 }}>{org.name}</td>
                  <td>{org.plan_name ? <span className="badge-active">{org.plan_name}</span> : <span className="badge-draft">Trial</span>}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{org.screen_count}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{org.published_count}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{org.user_count}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatDate(org.trial_ends_at)}</td>
                  <td><span className={org.is_active ? 'badge-published' : 'badge-danger'}>{org.is_active ? 'Activa' : 'Inactiva'}</span></td>
                  <td>
                    <button className={org.is_active ? 'btn-ghost btn-sm' : 'btn-success btn-sm'} onClick={() => toggleOrg(org.id)}>
                      {org.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Users */}
      {tab === 'users' && (
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>Nombre</th><th>Email</th><th>Organización</th><th>Rol</th><th>Estado</th><th>Desde</th>
            </tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.org_name || '—'}</td>
                  <td><span className={u.role === 'superadmin' ? 'badge-danger' : u.role === 'admin' ? 'badge-active' : 'badge-draft'}>{u.role}</span></td>
                  <td><span className={u.is_active ? 'badge-published' : 'badge-draft'}>{u.is_active ? 'Activo' : 'Inactivo'}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Screens */}
      {tab === 'screens' && (
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>Pantalla</th><th>Organización</th><th>Código</th><th>Estado</th><th>Orientación</th><th>Creada</th>
            </tr></thead>
            <tbody>
              {screens.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.org_name}</td>
                  <td><span className="code">{s.short_code}</span></td>
                  <td><span className={s.status === 'published' ? 'badge-published' : 'badge-draft'}>{s.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{s.orientation}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transactions */}
      {tab === 'transactions' && (
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>Organización</th><th>ID pago MP</th><th>Monto</th><th>Estado</th><th>Fecha</th>
            </tr></thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.org_name}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.mercadopago_payment_id || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatPrice(t.amount)}</td>
                  <td><span className={t.status === 'approved' ? 'badge-published' : t.status === 'rejected' ? 'badge-danger' : 'badge-trial'}>{t.status}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(t.paid_at || t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Plans */}
      {tab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {plans.map(plan => (
            <div key={plan.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{plan.name}</h3>
                <span className={plan.is_active ? 'badge-published' : 'badge-draft'}>{plan.is_active ? 'Activo' : 'Inactivo'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Pantallas', plan.screen_limit],
                  ['Storage', `${plan.storage_limit_gb}GB`],
                  ['Mensual', formatPrice(plan.price_monthly)],
                  ['Anual', formatPrice(plan.price_annual)],
                  ['Orden', plan.display_order],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 700 }}>
          {/* System settings */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', marginBottom: 20 }}>
              Configuración del sistema
            </h3>
            <form onSubmit={saveSettings}>
              <div style={{ marginBottom: 16 }}>
                <label className="label">Días de trial</label>
                <input
                  type="number"
                  className="input"
                  value={settings.trial_days || ''}
                  onChange={e => setSettings(s => ({ ...s, trial_days: e.target.value }))}
                  min="1" max="365"
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label className="label">Pantallas en trial</label>
                <input
                  type="number"
                  className="input"
                  value={settings.trial_screen_limit || ''}
                  onChange={e => setSettings(s => ({ ...s, trial_screen_limit: e.target.value }))}
                  min="1" max="10"
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Guardar</button>
            </form>
          </div>

          {/* MercadoPago */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', marginBottom: 20 }}>
              MercadoPago
            </h3>
            <form onSubmit={saveMpConfig}>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Public Key</label>
                <input
                  className="input"
                  placeholder="APP_USR-..."
                  value={mpConfig.public_key || ''}
                  onChange={e => setMpConfig(c => ({ ...c, public_key: e.target.value }))}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Access Token</label>
                <input
                  type="password"
                  className="input"
                  placeholder="APP_USR-..."
                  value={mpConfig.access_token || ''}
                  onChange={e => setMpConfig(c => ({ ...c, access_token: e.target.value }))}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label className="label">Webhook Secret (opcional)</label>
                <input
                  className="input"
                  placeholder="..."
                  value={mpConfig.webhook_secret || ''}
                  onChange={e => setMpConfig(c => ({ ...c, webhook_secret: e.target.value }))}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input
                  type="checkbox"
                  id="sandbox"
                  checked={mpConfig.is_sandbox !== false}
                  onChange={e => setMpConfig(c => ({ ...c, is_sandbox: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                />
                <label htmlFor="sandbox" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>
                  Modo sandbox (pruebas)
                </label>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Guardar credenciales</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
