import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { screensApi } from '../api/screens';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', description: '', orientation: 'horizontal', isTouch: false });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const screen = await screensApi.create(form);
      toast.success('Pantalla creada');
      onCreate(screen);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear pantalla');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal scale-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>Nueva pantalla</h2>
          <button className="btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Nombre</label>
            <input className="input" placeholder="Lobby principal" value={form.name} onChange={set('name')} required autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Descripción (opcional)</label>
            <input className="input" placeholder="Descripción breve..." value={form.description} onChange={set('description')} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="label">Orientación</label>
              <select className="select" value={form.orientation} onChange={set('orientation')}>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="select" value={form.isTouch ? 'touch' : 'normal'} onChange={e => setForm(f => ({ ...f, isTouch: e.target.value === 'touch' }))}>
                <option value="normal">Normal</option>
                <option value="touch">Touch / Kiosco</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              Crear pantalla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Screens() {
  const { user } = useAuth();
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');

  const load = () => screensApi.list()
    .then(setScreens)
    .catch(() => toast.error('Error cargando pantallas'))
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handlePublish = async (screen) => {
    try {
      const updated = await screensApi.publish(screen.id);
      setScreens(ss => ss.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      toast.success(`"${screen.name}" publicada`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al publicar');
    }
  };

  const handleUnpublish = async (screen) => {
    try {
      const updated = await screensApi.unpublish(screen.id);
      setScreens(ss => ss.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      toast.success(`"${screen.name}" pasó a borrador`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error');
    }
  };

  const handleDelete = async (screen) => {
    if (!window.confirm(`¿Eliminar "${screen.name}"? Se eliminará todo su contenido permanentemente.`)) return;
    try {
      await screensApi.remove(screen.id);
      setScreens(ss => ss.filter(s => s.id !== screen.id));
      toast.success('Pantalla eliminada');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const filtered = filter === 'all' ? screens : screens.filter(s => s.status === filter);

  const published = screens.filter(s => s.status === 'published').length;
  const limit = user?.screenLimit || 1;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Pantallas</h1>
          <p className="page-subtitle">
            {screens.length} pantalla{screens.length !== 1 ? 's' : ''} · {published}/{limit} publicadas
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
          Nueva pantalla
        </button>
      </div>

      {/* Progress bar */}
      {user?.screenLimit && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Pantallas publicadas</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: published >= limit ? 'var(--warning)' : 'var(--text-secondary)' }}>
              {published} / {limit}
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (published / limit) * 100)}%`,
              background: published >= limit ? 'var(--warning)' : 'var(--accent)',
              borderRadius: 2,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {[['all', 'Todas'], ['published', 'Publicadas'], ['draft', 'Borradores']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: '0.8rem',
              fontFamily: 'var(--font-body)',
              fontWeight: filter === val ? 600 : 400,
              color: filter === val ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: filter === val ? 'var(--bg-elevated)' : 'transparent',
              border: filter === val ? '1px solid var(--border-bright)' : '1px solid transparent',
              cursor: 'pointer',
            }}
          >
            {label}
            {val !== 'all' && (
              <span style={{ marginLeft: 6, fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'inherit', opacity: 0.7 }}>
                {screens.filter(s => s.status === val).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <svg width="48" height="48" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" style={{ margin: '0 auto 16px' }}>
            <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.2"/>
            <path d="M8 21h8M12 17v4" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '0.875rem' }}>
            {filter === 'all' ? 'No hay pantallas. Crea la primera.' : `No hay pantallas en estado "${filter}".`}
          </p>
          {filter === 'all' && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>Crear primera pantalla</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }} className="stagger">
          {filtered.map(screen => (
            <div key={screen.id} className="screen-card">
              {/* Status line */}
              <div style={{
                height: 3,
                background: screen.status === 'published' ? 'var(--success)' : 'var(--border)',
                margin: '-20px -20px 16px',
                borderRadius: '12px 12px 0 0',
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.95rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {screen.name}
                  </h3>
                  {screen.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {screen.description}
                    </p>
                  )}
                </div>
                <span className={screen.status === 'published' ? 'badge-published' : 'badge-draft'} style={{ marginLeft: 8, flexShrink: 0 }}>
                  {screen.status === 'published' ? 'Publicada' : 'Borrador'}
                </span>
              </div>

              {/* Meta */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <span className="code">{screen.short_code}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                  {screen.orientation === 'horizontal' ? '⬛ Horiz' : '⬜ Vert'}
                </span>
                {screen.is_touch && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.1)', padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(6,182,212,0.2)' }}>
                    Touch
                  </span>
                )}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {screen.content_count || 0} contenidos
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/screens/${screen.id}`} className="btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  Administrar
                </Link>
                {screen.status === 'draft' ? (
                  <button className="btn-success btn-sm" onClick={() => handlePublish(screen)}>Publicar</button>
                ) : (
                  <button className="btn-ghost btn-sm" onClick={() => handleUnpublish(screen)}>Borrador</button>
                )}
                {screen.status === 'published' && (
                  <a
                    href={`/player/${screen.public_url_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost btn-sm"
                    title="Abrir player"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                )}
                {user?.role !== 'editor' && (
                  <button className="btn-danger btn-sm" onClick={() => handleDelete(screen)} title="Eliminar">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={screen => { setScreens(ss => [screen, ...ss]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
