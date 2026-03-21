import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function TrialExpiredModal() {
  const [plans, setPlans] = useState([]);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/plans').then(r => setPlans(r.data)).catch(() => {});
  }, []);

  if (dismissed) return null;

  const formatPrice = (n) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: 540 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56,
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: 8 }}>
            Tu período de prueba ha terminado
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Tus pantallas están en modo borrador y no son visibles públicamente.
            Elige un plan para continuar usando ScreenHub.
          </p>
        </div>

        {/* Plans */}
        {plans.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(plans.length, 3)}, 1fr)`, gap: 12, marginBottom: 20 }}>
            {plans.map(plan => (
              <div
                key={plan.id}
                className="card"
                style={{ padding: '14px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => { navigate('/billing'); setDismissed(true); }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
                  {plan.name}
                </div>
                <div style={{ color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600 }}>
                  {formatPrice(plan.price_monthly)}
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>/mes</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 4 }}>
                  {plan.screen_limit} pantallas
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-primary btn-lg"
            style={{ flex: 1 }}
            onClick={() => { navigate('/billing'); setDismissed(true); }}
          >
            Ver planes y suscribirse
          </button>
          <button
            className="btn-ghost"
            onClick={() => setDismissed(true)}
            style={{ flexShrink: 0 }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
