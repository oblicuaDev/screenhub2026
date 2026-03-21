import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { screensApi } from '../api/screens';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_LABELS = { image: 'Imagen', video_upload: 'Video', video_url: 'Video URL', youtube: 'YouTube', iframe: 'Web/iframe' };
const TYPE_COLORS = { image: '#06B6D4', video_upload: '#8B5CF6', video_url: '#EC4899', youtube: '#EF4444', iframe: '#F59E0B' };

function SortableItem({ item, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        marginBottom: 8,
      }}
    >
      <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-muted)', flexShrink: 0 }}>
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
        </svg>
      </div>
      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: TYPE_COLORS[item.type] || 'var(--text-muted)', boxShadow: `0 0 6px ${TYPE_COLORS[item.type] || 'transparent'}` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', color: TYPE_COLORS[item.type], fontFamily: 'var(--font-mono)' }}>
            {TYPE_LABELS[item.type] || item.type}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.duration_seconds}s</span>
          {item.is_muted && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>🔇</span>}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.source_url}
        </div>
      </div>
      <button
        onClick={() => onRemove(item.id)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 4 }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M18 6L6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}

function AddContentModal({ screenId, onClose, onAdded }) {
  const [form, setForm] = useState({ type: 'image', sourceUrl: '', durationSeconds: 10, isMuted: false });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const needsFile = ['image', 'video_upload'].includes(form.type);
  const needsUrl = ['video_url', 'youtube', 'iframe'].includes(form.type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = { type: form.type, durationSeconds: form.durationSeconds, isMuted: form.isMuted };
      if (needsFile && file) data.file = file;
      else data.sourceUrl = form.sourceUrl;
      const item = await screensApi.addContent(screenId, data);
      toast.success('Contenido agregado');
      onAdded(item);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agregar contenido');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal scale-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>Agregar contenido</h2>
          <button className="btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="label">Tipo de contenido</label>
            <select className="select" value={form.type} onChange={set('type')}>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {needsFile && (
            <div style={{ marginBottom: 14 }}>
              <label className="label">Archivo</label>
              <div
                style={{ border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 10, padding: 20, textAlign: 'center', cursor: 'pointer', background: 'var(--bg-surface)' }}
                onClick={() => document.getElementById('content-file-input').click()}
              >
                <input id="content-file-input" type="file" style={{ display: 'none' }} accept={form.type === 'image' ? 'image/*' : 'video/*'} onChange={e => setFile(e.target.files[0])} />
                {file ? (
                  <p style={{ color: 'var(--accent-bright)', fontSize: '0.875rem' }}>{file.name}</p>
                ) : (
                  <>
                    <svg width="28" height="28" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" style={{ margin: '0 auto 8px' }}>
                      <path d="M12 4v12m-4-4l4-4 4 4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Click para seleccionar</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: 4 }}>{form.type === 'image' ? 'JPG, PNG, GIF, WebP' : 'MP4, WebM, MOV'} · Max 500MB</p>
                  </>
                )}
              </div>
            </div>
          )}
          {needsUrl && (
            <div style={{ marginBottom: 14 }}>
              <label className="label">{form.type === 'youtube' ? 'URL de YouTube' : form.type === 'iframe' ? 'URL de la web' : 'URL del video'}</label>
              <input type="url" className="input" placeholder="https://..." value={form.sourceUrl} onChange={set('sourceUrl')} required />
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="label">Duración (segundos)</label>
              <input type="number" className="input" min="1" max="3600" value={form.durationSeconds} onChange={set('durationSeconds')} />
            </div>
            <div>
              <label className="label">Audio</label>
              <select className="select" value={form.isMuted ? 'muted' : 'sound'} onChange={e => setForm(f => ({ ...f, isMuted: e.target.value === 'muted' }))}>
                <option value="sound">Con audio</option>
                <option value="muted">Silenciado</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading || (needsFile && !file)}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null} Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ScreenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [screen, setScreen] = useState(null);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([screensApi.get(id), screensApi.listContent(id)]);
      setScreen(s);
      setContent(c.sort((a, b) => a.position - b.position));
    } catch { toast.error('Error cargando pantalla'); navigate('/screens'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = content.findIndex(c => c.id === active.id);
    const newIdx = content.findIndex(c => c.id === over.id);
    const reordered = arrayMove(content, oldIdx, newIdx).map((c, i) => ({ ...c, position: i }));
    setContent(reordered);
    try { await screensApi.reorderContent(id, reordered.map(c => ({ id: c.id, position: c.position }))); }
    catch { toast.error('Error al reordenar'); }
  };

  const handleRemove = async (contentId) => {
    try {
      await screensApi.removeContent(id, contentId);
      setContent(c => c.filter(x => x.id !== contentId));
      toast.success('Contenido eliminado');
    } catch { toast.error('Error al eliminar'); }
  };

  const handlePublishToggle = async () => {
    setPublishing(true);
    try {
      const updated = screen.status === 'published'
        ? await screensApi.unpublish(id)
        : await screensApi.publish(id);
      setScreen(s => ({ ...s, ...updated }));
      toast.success(screen.status === 'published' ? 'Pantalla en borrador' : 'Pantalla publicada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cambiar estado');
    } finally { setPublishing(false); }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;
  if (!screen) return null;

  const playerUrl = `/player/${screen.public_url_slug}`;

  return (
    <div className="fade-in">
      <button onClick={() => navigate('/screens')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', marginBottom: 20, padding: 0 }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 12H5m7-7l-7 7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Volver
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700 }}>{screen.name}</h1>
            <span className={screen.status === 'published' ? 'badge-published' : 'badge-draft'}>
              {screen.status === 'published' ? 'Publicada' : 'Borrador'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="code">{screen.short_code}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{screen.orientation}</span>
            {screen.is_touch && <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem' }}>Touch</span>}
            {screen.public_url_slug && (
              <a href={playerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textDecoration: 'none' }}>
                /player/{screen.public_url_slug} ↗
              </a>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {screen.status === 'published' && (
            <a href={playerUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Abrir player
            </a>
          )}
          <button className={screen.status === 'published' ? 'btn-ghost btn-sm' : 'btn-success btn-sm'} onClick={handlePublishToggle} disabled={publishing}>
            {publishing && <span className="spinner" style={{ width: 14, height: 14 }} />}
            {screen.status === 'published' ? 'Pasar a borrador' : 'Publicar'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem' }}>
              Playlist ({content.length} item{content.length !== 1 ? 's' : ''})
            </h2>
            <button className="btn-primary btn-sm" onClick={() => setShowAdd(true)}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" strokeLinecap="round"/></svg>
              Agregar
            </button>
          </div>

          {content.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: 'center' }}>
              <svg width="40" height="40" fill="none" stroke="var(--text-muted)" viewBox="0 0 24 24" style={{ margin: '0 auto 12px' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.2"/>
                <path d="M9 9l6 3-6 3V9z" fill="currentColor" stroke="none"/>
              </svg>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Agregá contenido para empezar la playlist.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={content.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {content.map(item => <SortableItem key={item.id} item={item} onRemove={handleRemove} />)}
              </SortableContext>
            </DndContext>
          )}
          {content.length > 1 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 8, textAlign: 'center' }}>
              Arrastrá para reordenar la playlist
            </p>
          )}
        </div>

        <div>
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 16 }}>Información</h3>
            {[
              ['Código corto', <span className="code">{screen.short_code}</span>],
              ['Orientación', screen.orientation === 'horizontal' ? 'Horizontal' : 'Vertical'],
              ['Touch', screen.is_touch ? `Sí — ${screen.touch_timeout_seconds}s` : 'No'],
              ['Items', content.length],
              ['Duración total', `${content.reduce((s, c) => s + (c.duration_seconds || 0), 0)}s`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{label}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</span>
              </div>
            ))}
          </div>

          {screen.status === 'published' && screen.public_url_slug && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 14 }}>Acceso público</h3>
              <div style={{ marginBottom: 12 }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>URL</p>
                <a href={playerUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-bright)', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', textDecoration: 'none', wordBreak: 'break-all', display: 'block', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                  {window.location.origin}{playerUrl}
                </a>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Código corto</p>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.12em' }}>
                    {screen.short_code}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddContentModal screenId={id} onClose={() => setShowAdd(false)} onAdded={item => { setContent(c => [...c, item]); setShowAdd(false); }} />}
    </div>
  );
}
