import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getScreens, createScreen, deleteScreen } from '../api/screens';
import toast from 'react-hot-toast';
import ScreenForm from '../components/screens/ScreenForm';

const StatusBadge = ({ status }) => {
  const map = { active: ['bg-green-100 text-green-700', 'Activa'], inactive: ['bg-gray-100 text-gray-600', 'Inactiva'], maintenance: ['bg-yellow-100 text-yellow-700', 'Mantenimiento'] };
  const [cls, label] = map[status] || map.inactive;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
};

export default function Screens() {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = () => getScreens().then(setScreens).catch(() => toast.error('Error cargando pantallas')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async (data) => {
    try {
      await createScreen(data);
      toast.success('Pantalla creada');
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"? Se eliminará todo su contenido.`)) return;
    try {
      await deleteScreen(id);
      toast.success('Pantalla eliminada');
      setScreens(s => s.filter(x => x.id !== id));
    } catch {
      toast.error('Error al eliminar');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pantallas</h1>
          <p className="text-sm text-gray-500 mt-1">{screens.length} pantalla{screens.length !== 1 ? 's' : ''} registrada{screens.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nueva pantalla
        </button>
      </div>

      {showForm && <ScreenForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : screens.length === 0 ? (
        <div className="card p-12 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500">No hay pantallas. Crea la primera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {screens.map(screen => (
            <div key={screen.id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{screen.name}</h3>
                  {screen.location && <p className="text-xs text-gray-400 mt-0.5">{screen.location}</p>}
                </div>
                <StatusBadge status={screen.status} />
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-1 rounded">{screen.resolution}</span>
                <span className="bg-gray-100 px-2 py-1 rounded capitalize">{screen.orientation}</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">{screen.content_count} contenidos</span>
              </div>

              <div className="flex gap-2 pt-1">
                <Link to={`/screens/${screen.id}`} className="btn-secondary flex-1 justify-center text-xs">Administrar</Link>
                <Link
                  to={`/player/${screen.id}`}
                  target="_blank"
                  className="btn-secondary px-2.5"
                  title="Abrir reproductor"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </Link>
                <button
                  onClick={() => handleDelete(screen.id, screen.name)}
                  className="px-2.5 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
