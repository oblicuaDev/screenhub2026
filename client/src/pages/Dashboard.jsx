import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getScreens } from '../api/screens';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const colors = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600', maintenance: 'bg-yellow-100 text-yellow-700' };
  const labels = { active: 'Activa', inactive: 'Inactiva', maintenance: 'Mantenimiento' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.inactive}`}>{labels[status] || status}</span>;
};

export default function Dashboard() {
  const [screens, setScreens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScreens()
      .then(setScreens)
      .catch(() => toast.error('Error cargando pantallas'))
      .finally(() => setLoading(false));
  }, []);

  const total = screens.length;
  const active = screens.filter(s => s.status === 'active').length;
  const totalContent = screens.reduce((sum, s) => sum + parseInt(s.content_count || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Resumen general del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total pantallas', value: total, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Pantallas activas', value: active, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Contenidos activos', value: totalContent, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Screen list */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Pantallas recientes</h2>
          <Link to="/screens" className="text-sm text-primary-600 hover:underline">Ver todas</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando...</div>
        ) : screens.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-3">No hay pantallas registradas</p>
            <Link to="/screens" className="btn-primary">Crear primera pantalla</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {screens.slice(0, 5).map(screen => (
              <Link key={screen.id} to={`/screens/${screen.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{screen.name}</p>
                  <p className="text-xs text-gray-400">{screen.location || 'Sin ubicación'} · {screen.resolution}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{screen.content_count} contenidos</span>
                  <StatusBadge status={screen.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
