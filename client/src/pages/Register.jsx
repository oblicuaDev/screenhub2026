import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ orgName: '', name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      await register(form.orgName, form.name, form.email, form.password);
      toast.success('¡Bienvenido a ScreenHub! Tu período de prueba está activo.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <div style={{
        position: 'fixed',
        top: '15%', left: '50%',
        transform: 'translateX(-50%)',
        width: 700, height: 400,
        background: 'radial-gradient(ellipse at center, rgba(36,99,235,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 460 }} className="fade-in">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52,
            background: 'var(--accent)',
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 32px var(--accent-glow)',
          }}>
            <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <path d="M8 21h8M12 17v4" stroke="white" fill="none" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, marginBottom: 6 }}>
            Crear cuenta
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Prueba gratis por 14 días · Sin tarjeta de crédito
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Nombre de la organización</label>
              <input
                type="text"
                className="input"
                placeholder="Mi empresa S.A."
                value={form.orgName}
                onChange={set('orgName')}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label className="label">Tu nombre</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Juan García"
                  value={form.name}
                  onChange={set('name')}
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="juan@empresa.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={set('password')}
                required
                minLength={8}
              />
            </div>

            {/* Trial benefits */}
            <div className="alert-info" style={{ marginBottom: 20, fontSize: '0.8rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <div>
                <strong>Período de prueba gratuito:</strong> 14 días · 1 pantalla · Sin tarjeta requerida
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Creando cuenta...</> : 'Crear cuenta gratuita'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" style={{ color: 'var(--accent-bright)', textDecoration: 'none', fontWeight: 600 }}>
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
