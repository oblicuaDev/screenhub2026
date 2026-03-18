import { useState } from 'react';

const RESOLUTIONS = ['1920x1080', '3840x2160', '1280x720', '1024x768', '1080x1920'];

export default function ScreenForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    name: initial.name || '',
    description: initial.description || '',
    location: initial.location || '',
    resolution: initial.resolution || '1920x1080',
    orientation: initial.orientation || 'landscape',
    status: initial.status || 'active',
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-gray-900">{initial.id ? 'Editar pantalla' : 'Nueva pantalla'}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Nombre *</label>
          <input className="input" value={form.name} onChange={set('name')} placeholder="Lobby principal" required />
        </div>
        <div>
          <label className="label">Ubicación</label>
          <input className="input" value={form.location} onChange={set('location')} placeholder="Piso 1, edificio A" />
        </div>
        <div>
          <label className="label">Resolución</label>
          <select className="input" value={form.resolution} onChange={set('resolution')}>
            {RESOLUTIONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Orientación</label>
          <select className="input" value={form.orientation} onChange={set('orientation')}>
            <option value="landscape">Horizontal</option>
            <option value="portrait">Vertical</option>
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.status} onChange={set('status')}>
            <option value="active">Activa</option>
            <option value="inactive">Inactiva</option>
            <option value="maintenance">Mantenimiento</option>
          </select>
        </div>
        <div>
          <label className="label">Descripción</label>
          <input className="input" value={form.description} onChange={set('description')} placeholder="Descripción opcional" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="button" onClick={() => onSubmit(form)} className="btn-primary" disabled={loading || !form.name}>
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
