import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const formatPrice = n =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

const formatDate = d =>
  d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function Billing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    Promise.all([
      api.get('/plans').then(r => r.data),
      api.get('/subscriptions/current').then(r => r.data),
      api.get('/subscriptions/transactions').then(r => r.data),
    ])
      .then(([p, s, t]) => { setPlans(p); setSubscription(s); setTransactions(t); })
      .catch(() => toast.error('Error cargando datos de facturación'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (plan) => {
    try {
      const { data } = await api.post('/subscriptions/checkout', {
        planId: plan.id,
        billingCycle,
      });
      // In production, redirect to MP checkout
      toast.success(`Iniciando checkout para plan ${plan.name}...`);
      console.log('Checkout data:', data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar checkout');
    }
  };

  const trialDaysLeft = user?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / 86400000))
    : null;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Facturación</h1>
          <p className="page-subtitle">Gestión de plan y pagos</p>
        </div>
      </div>

      {/* Current subscription */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', marginBottom: 16 }}>
          Plan actual
        </h2>
        {subscription?.subscription ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <span className="badge-active" style={{ marginBottom: 4 }}>PLAN {subscription.subscription.plan_name?.toUpperCase()}</span>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: 4 }}>
                {subscription.subscription.screen_limit} pantallas · {subscription.subscription.storage_limit_gb}GB
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Próximo cobro</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                {formatDate(subscription.subscription.ends_at)}
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Estado</p>
              <span className="badge-active">{subscription.subscription.status}</span>
            </div>
          </div>
        ) : subscription?.isOnTrial ? (
          <div className="alert-warning" style={{ display: 'inline-flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div>
              <strong>Período de prueba activo</strong> — Vence el {formatDate(subscription.trialEndsAt)}
              {trialDaysLeft !== null && ` (${trialDaysLeft} días restantes)`}
            </div>
          </div>
        ) : (
          <div className="alert-danger" style={{ display: 'inline-flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <div>
              <strong>Sin suscripción activa</strong> — Tus pantallas no son públicas.
            </div>
          </div>
        )}
      </div>

      {/* Plans */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem' }}>
            Planes disponibles
          </h2>
          {/* Billing cycle toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: 10, padding: 3, gap: 2 }}>
            {[['monthly', 'Mensual'], ['annual', 'Anual -15%']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setBillingCycle(val)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem',
                  fontFamily: 'var(--font-body)', cursor: 'pointer', border: 'none',
                  fontWeight: billingCycle === val ? 600 : 400,
                  background: billingCycle === val ? 'var(--bg-card)' : 'transparent',
                  color: billingCycle === val ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {plans.map((plan, idx) => {
            const isCurrentPlan = subscription?.subscription?.plan_id === plan.id;
            const price = billingCycle === 'annual' ? plan.price_annual / 12 : plan.price_monthly;
            const isPopular = idx === 1;

            return (
              <div
                key={plan.id}
                className="card"
                style={{
                  padding: 24,
                  position: 'relative',
                  border: isPopular ? '1px solid var(--accent)' : undefined,
                  boxShadow: isPopular ? '0 0 0 1px var(--accent), 0 4px 24px var(--accent-glow)' : undefined,
                }}
              >
                {isPopular && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                    padding: '3px 12px', borderRadius: 100, letterSpacing: '0.05em',
                    fontFamily: 'var(--font-body)',
                  }}>
                    MÁS POPULAR
                  </div>
                )}
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>
                    {plan.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: isPopular ? 'var(--accent-bright)' : 'var(--text-primary)' }}>
                      {formatPrice(price)}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>/mes</span>
                  </div>
                  {billingCycle === 'annual' && (
                    <p style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: 2 }}>
                      {formatPrice(plan.price_annual)}/año
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: 20 }}>
                  {[
                    `${plan.screen_limit} pantallas publicadas`,
                    `${plan.storage_limit_gb}GB de almacenamiento`,
                    'Soporte técnico',
                    'Actualizaciones en tiempo real',
                  ].map(feature => (
                    <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5">
                        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{feature}</span>
                    </div>
                  ))}
                </div>

                {isCurrentPlan ? (
                  <div className="btn-success" style={{ width: '100%', justifyContent: 'center', opacity: 0.7, cursor: 'default' }}>
                    Plan actual
                  </div>
                ) : (
                  <button
                    className={isPopular ? 'btn-primary' : 'btn-secondary'}
                    style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => handleSubscribe(plan)}
                  >
                    Suscribirme
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction history */}
      {transactions.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem', marginBottom: 16 }}>
            Historial de pagos
          </h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>ID pago</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{formatDate(t.paid_at || t.created_at)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.mercadopago_payment_id || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatPrice(t.amount)}</td>
                    <td>
                      <span className={t.status === 'approved' ? 'badge-published' : t.status === 'rejected' ? 'badge-danger' : 'badge-trial'}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
