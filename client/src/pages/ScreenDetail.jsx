import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getScreen, updateScreen, deleteScreen } from '../api/screens';
import { getContent, deleteContent, reorderContent } from '../api/content';
import toast from 'react-hot-toast';
import ScreenForm from '../components/screens/ScreenForm';
import ContentGallery from '../components/content/ContentGallery';
import ContentUploadModal from '../components/content/ContentUploadModal';

export default function ScreenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [screen, setScreen] = useState(null);
  const [content, setContent] = useState([]);
  const [editing, setEditing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [loadingScreen, setLoadingScreen] = useState(true);

  const loadContent = () => getContent(id).then(setContent).catch(() => toast.error('Error cargando contenido'));

  useEffect(() => {
    Promise.all([
      getScreen(id).then(setScreen),
      loadContent(),
    ]).catch(() => toast.error('Error cargando pantalla'))
      .finally(() => setLoadingScreen(false));
  }, [id]);

  const handleUpdate = async (data) => {
    try {
      const updated = await updateScreen(id, data);
      setScreen(updated);
      setEditing(false);
      toast.success('Pantalla actualizada');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar');
    }
  };

  const handleDeleteScreen = async () => {
    if (!confirm(`¿Eliminar "${screen.name}"? Se eliminará todo el contenido.`)) return;
    try {
      await deleteScreen(id);
      toast.success('Pantalla eliminada');
      navigate('/screens');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const handleDeleteContent = async (contentId) => {
    try {
      await deleteContent(id, contentId);
      setContent(c => c.filter(x => x.id !== contentId));
      toast.success('Contenido eliminado');
    } catch {
      toast.error('Error al eliminar contenido');
    }
  };

  const handleReorder = async (newOrder) => {
    setContent(newOrder);
    try {
      await reorderContent(id, newOrder.map((item, idx) => ({ id: item.id, order_index: idx })));
    } catch {
      toast.error('Error al reordenar');
    }
  };

  if (loadingScreen) return <div className="p-6 text-gray-400">Cargando...</div>;
  if (!screen) return <div className="p-6 text-gray-500">Pantalla no encontrada</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/screens" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{screen.name}</h1>
          <p className="text-sm text-gray-500">{screen.location || 'Sin ubicación'} · {screen.resolution} · {screen.orientation === 'landscape' ? 'Horizontal' : 'Vertical'}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/player/${id}`} target="_blank" className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Reproductor
          </Link>
          <button onClick={() => setEditing(!editing)} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Editar
          </button>
          <button onClick={handleDeleteScreen} className="btn-danger">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {editing && <ScreenForm initial={screen} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />}

      {/* Content section */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Galería de contenido</h2>
            <p className="text-xs text-gray-400 mt-0.5">{content.length} elemento{content.length !== 1 ? 's' : ''} · Arrastra para reordenar</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Agregar contenido
          </button>
        </div>
        <ContentGallery
          screenId={id}
          content={content}
          onDelete={handleDeleteContent}
          onReorder={handleReorder}
          onRefresh={loadContent}
        />
      </div>

      {showUpload && (
        <ContentUploadModal
          screenId={id}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); loadContent(); }}
        />
      )}
    </div>
  );
}
