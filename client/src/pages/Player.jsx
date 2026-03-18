import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getPlayerData } from '../api/content';

export default function Player() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const loadData = useCallback(() => {
    getPlayerData(id)
      .then(setData)
      .catch(() => setError('No se puede cargar esta pantalla'));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reload content every 5 minutes to pick up changes
  useEffect(() => {
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeContent = data?.content?.filter(c => c.is_active) || [];

  const advance = useCallback(() => {
    setCurrent(prev => (prev + 1) % Math.max(activeContent.length, 1));
  }, [activeContent.length]);

  useEffect(() => {
    if (!activeContent.length) return;
    const item = activeContent[current];
    if (!item) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(advance, (item.duration || 10) * 1000);
    return () => clearTimeout(timerRef.current);
  }, [current, activeContent, advance]);

  if (error) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center text-white">
        <p className="text-xl">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeContent.length) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-400">Sin contenido activo · {data.screen.name}</p>
      </div>
    );
  }

  const item = activeContent[current % activeContent.length];

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {activeContent.map((c, idx) => (
        <div
          key={c.id}
          className={`absolute inset-0 transition-opacity duration-700 ${idx === current % activeContent.length ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          {c.type === 'image' && (
            <img src={c.url} alt={c.name} className="w-full h-full object-contain" />
          )}
          {c.type === 'video' && (
            <video
              src={c.url}
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
              onEnded={advance}
            />
          )}
          {c.type === 'iframe' && (
            <iframe
              src={c.url}
              className="w-full h-full border-0"
              title={c.name}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          )}
        </div>
      ))}

      {/* Screen name overlay */}
      <div className="absolute bottom-4 right-4 z-20 bg-black/40 text-white text-xs px-2 py-1 rounded">
        {data.screen.name} · {(current % activeContent.length) + 1}/{activeContent.length}
      </div>
    </div>
  );
}
