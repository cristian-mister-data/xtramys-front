import { useEffect, useMemo, useRef, useState } from 'react';
import { MdPlayCircle } from 'react-icons/md';

import {
  isVideoObjectUrl,
  resolvePlayableVideoUrl,
  revokeVideoObjectUrl,
} from '@/utils/videoPlayback';

const baseStyle = {
  position: 'relative',
  width: '100%',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  background: '#0f172a',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const mediaStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(180deg, rgba(15,23,42,0.12), rgba(15,23,42,0.42))',
  color: '#fff',
  pointerEvents: 'none',
};

const fallbackStyle = {
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
};

function getPoster(video, poster) {
  return poster || video?.thumbnailUrl || video?.thumbnail || video?.poster || '';
}

export default function VideoPoster({
  video,
  videoId,
  src,
  poster,
  style,
  className,
  showPlay = true,
  playSize = 42,
  fallback = null,
  alt = 'Video',
}) {
  const target = useMemo(() => video || videoId || src || null, [video, videoId, src]);
  const initialPoster = getPoster(video, poster);
  const [posterUrl, setPosterUrl] = useState(initialPoster);
  const [sourceUrl, setSourceUrl] = useState(src || '');
  const sourceRef = useRef('');

  useEffect(() => {
    setPosterUrl(getPoster(video, poster));
  }, [video, poster]);

  useEffect(() => {
    let cancelled = false;
    const clearSource = () => {
      if (sourceRef.current && sourceRef.current !== src) {
        revokeVideoObjectUrl(sourceRef.current);
      }
      sourceRef.current = '';
    };

    if (initialPoster || !target) {
      clearSource();
      setSourceUrl(src || '');
      return () => clearSource();
    }

    (async () => {
      try {
        const resolved = await resolvePlayableVideoUrl(target);
        if (cancelled) {
          revokeVideoObjectUrl(resolved);
          return;
        }
        clearSource();
        sourceRef.current = resolved;
        setSourceUrl(resolved);
      } catch (_) {
        if (!cancelled) setSourceUrl('');
      }
    })();

    return () => {
      cancelled = true;
      clearSource();
    };
  }, [target, initialPoster, src]);

  const captureFrame = (event) => {
    if (posterUrl) return;
    const videoEl = event.currentTarget;
    const width = videoEl.videoWidth || 0;
    const height = videoEl.videoHeight || 0;
    if (!width || !height) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, width, height);
      setPosterUrl(canvas.toDataURL('image/jpeg', 0.82));
    } catch (_) {
      // Cross-origin videos can still render as <video>; canvas capture may be blocked.
    }
  };

  return (
    <div className={className} style={{ ...baseStyle, ...style }} aria-label={alt}>
      {posterUrl ? (
        <img src={posterUrl} alt={alt} style={mediaStyle} draggable={false} />
      ) : sourceUrl ? (
        <video
          src={sourceUrl}
          muted
          playsInline
          preload="metadata"
          onLoadedData={captureFrame}
          style={mediaStyle}
        />
      ) : (
        <div style={fallbackStyle}>{fallback || <MdPlayCircle size={playSize} />}</div>
      )}
      {showPlay && (
        <div style={overlayStyle}>
          <MdPlayCircle size={playSize} />
        </div>
      )}
    </div>
  );
}