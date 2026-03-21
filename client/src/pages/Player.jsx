import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getPlayerData, getPlayerDataByCode } from '../api/screens';

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

function getYoutubeId(url) {
  const m = url.match(/(?:youtube\.com.*[?&]v=|youtu\.be\/)([^&\n]+)/);
  return m ? m[1] : null;
}

function renderContent(item) {
  if (!item) return null;

  const { type, source_url, is_muted } = item;

  if (type === 'image') {
    return (
      <img
        src={source_url}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  if (type === 'video_upload' || type === 'video_url') {
    return (
      <video
        key={source_url}
        src={source_url}
        muted={is_muted}
        autoPlay
        playsInline
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }}
      />
    );
  }

  if (type === 'youtube') {
    const videoId = getYoutubeId(source_url);
    if (!videoId) return null;
    return (
      <iframe
        key={videoId}
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&rel=0`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  if (type === 'iframe') {
    return (
      <iframe
        key={source_url}
        src={source_url}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allowFullScreen
      />
    );
  }

  return null;
}

export default function Player({ byCode }) {
  const { slug, code } = useParams();
  const [data, setData] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTouched, setIsTouched] = useState(false);
  const [showTouchOverlay, setShowTouchOverlay] = useState(false);
  const timerRef = useRef(null);
  const touchTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const result = byCode
        ? await getPlayerDataByCode(code)
        : await getPlayerData(slug);
      setData(result);
      setCurrentIdx(0);
      setError(null);
    } catch (err) {
      setError('No se pudo cargar la pantalla');
    } finally {
      setLoading(false);
    }
  }, [slug, code, byCode]);

  useEffect(() => {
    fetchData();
    refreshTimerRef.current = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(refreshTimerRef.current);
  }, [fetchData]);

  // Auto-advance content
  useEffect(() => {
    if (!data?.content?.length) return;
    if (data.screen?.is_touch && !isTouched) return; // wait for touch

    const item = data.content[currentIdx];
    if (!item) return;

    // For videos, we let them play for their duration
    const duration = (item.duration_seconds || 10) * 1000;
    timerRef.current = setTimeout(() => {
      setCurrentIdx(i => (i + 1) % data.content.length);
    }, duration);

    return () => clearTimeout(timerRef.current);
  }, [data, currentIdx, isTouched]);

  // Touch: return to intro after timeout
  useEffect(() => {
    if (!data?.screen?.is_touch || !isTouched) return;
    clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setIsTouched(false);
      setCurrentIdx(0);
    }, (data.screen.touch_timeout_seconds || 60) * 1000);
    return () => clearTimeout(touchTimerRef.current);
  }, [data, isTouched, currentIdx]);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(touchTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div style={{ width: 32, height: 32, border: '2px solid #333', borderTopColor: '#2463EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff', fontFamily: 'sans-serif', gap: 16 }}>
        <svg width="48" height="48" fill="none" stroke="#444" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1.2"/>
          <path d="M8 21h8M12 17v4" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <p style={{ color: '#666', fontSize: '0.875rem' }}>{error || 'Pantalla no encontrada'}</p>
      </div>
    );
  }

  if (data.screen?.status === 'unavailable' || data.screen?.status !== 'published') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', gap: 16 }}>
        <svg width="56" height="56" fill="none" stroke="#333" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="1"/>
          <path d="M8 21h8M12 17v4" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        <p style={{ color: '#555', fontSize: '0.9rem', letterSpacing: '0.05em' }}>PANTALLA NO DISPONIBLE</p>
        <p style={{ color: '#333', fontSize: '0.75rem', fontFamily: 'monospace' }}>{data.screen?.short_code}</p>
      </div>
    );
  }

  const content = data.content || [];
  const screen = data.screen;
  const isTouch = screen?.is_touch;

  if (content.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#333', fontFamily: 'monospace' }}>
        SIN CONTENIDO
      </div>
    );
  }

  // Touch: show intro overlay
  if (isTouch && !isTouched) {
    return (
      <div
        style={{ position: 'fixed', inset: 0, background: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => { setIsTouched(true); setCurrentIdx(0); }}
      >
        {screen.intro_source_url ? (
          screen.intro_type === 'image' ? (
            <img src={screen.intro_source_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <video src={screen.intro_source_url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )
        ) : (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>👆</div>
            <p style={{ fontFamily: 'sans-serif', fontSize: '1.5rem', fontWeight: 300, letterSpacing: '0.1em' }}>TOCA PARA INICIAR</p>
          </div>
        )}
        {/* Touch hint overlay */}
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.5)', borderRadius: 100, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2463EB', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontFamily: 'sans-serif', letterSpacing: '0.05em' }}>Toca para interactuar</span>
          <style>{`@keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.6; } }`}</style>
        </div>
      </div>
    );
  }

  const currentItem = content[currentIdx] || content[0];

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}
      onClick={isTouch ? () => {
        setIsTouched(true);
        clearTimeout(timerRef.current);
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = setTimeout(() => {
          setIsTouched(false);
          setCurrentIdx(0);
        }, (screen?.touch_timeout_seconds || 60) * 1000);
      } : undefined}
    >
      {/* Content */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {renderContent(currentItem)}
      </div>

      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.1)' }}>
        <div
          key={`${currentIdx}-${currentItem?.source_url}`}
          style={{
            height: '100%',
            background: 'rgba(36, 99, 235, 0.8)',
            animation: `progressBar ${(currentItem?.duration_seconds || 10)}s linear forwards`,
          }}
        />
      </div>

      {/* Counter */}
      {content.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 12, right: 16,
          color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem',
          fontFamily: 'monospace', letterSpacing: '0.05em',
        }}>
          {currentIdx + 1} / {content.length}
        </div>
      )}

      <style>{`
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
