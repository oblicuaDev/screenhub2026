import { useState } from 'react';
import { createContent } from '../../api/content';
import toast from 'react-hot-toast';

const TYPES = [
  { value: 'image', label: 'Imagen', accept: 'image/*' },
  { value: 'video', label: 'Video', accept: 'video/*' },
  { value: 'iframe', label: 'iFrame (URL)', accept: null },
];

export default function ContentUploadModal({ screenId, onClose, onSuccess }) {
  const [type, setType] = useState('image');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(10);
  const [loading, setLoading] = useState(false);

  const selectedType = TYPES.find(t => t.value === type);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return toast.error('Nombre requerido');
    if (type === 'iframe' && !url) return toast.error('URL requerida para iframe');
    if (type !== 'iframe' && !file) return toast.error('Selecciona un archivo');

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('type', type);
      formData.append('duration', duration);
      if (type === 'iframe') {
        formData.append('url', url);
      } else {
        formData.append('file', file);
      }
      await createContent(screenId, formData);
      toast.success('Contenido agregado');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al subir contenido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Agregar contenido</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type selector */}
          <div>
            <label className="label">Tipo de contenido</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setType(t.value); setFile(null); setUrl(''); }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    type === t.value ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Nombre</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del contenido" required />
          </div>

          {type === 'iframe' ? (
            <div>
              <label className="label">URL del iframe</label>
              <input className="input" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://ejemplo.com" required />
            </div>
          ) : (
            <div>
              <label className="label">Archivo ({selectedType.label})</label>
              <input
                className="input py-1.5 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                type="file"
                accept={selectedType.accept}
                onChange={handleFileChange}
                required
              />
              {file && <p className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>}
            </div>
          )}

          <div>
            <label className="label">Duración (segundos)</label>
            <input
              className="input"
              type="number"
              min="1"
              max="3600"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Subiendo...' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
