/**
 * Web/Capacitor shim for react-native-image-pan-zoom.
 * Pointer Events keep mouse, pen and two-finger pinch on the same code path.
 */
import { useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function ImageZoom({
  cropWidth = 300,
  cropHeight = 300,
  imageWidth = 300,
  imageHeight = 300,
  children,
  onMove,
  enableSwipeDown,
  onSwipeDown,
  onClick,
  minScale = 1,
  maxScale = 8,
  centerOn,
  showControls = false,
}) {
  const ref = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const swipeStart = useRef(null);
  const moved = useRef(false);
  const scaleRef = useRef(minScale);
  const translateRef = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(minScale);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  const applyTransform = (nextScale, nextTranslate) => {
    const boundedScale = clamp(nextScale, minScale, maxScale);
    const maxX = Math.max(0, (imageWidth * boundedScale - cropWidth) / 2);
    const maxY = Math.max(0, (imageHeight * boundedScale - cropHeight) / 2);
    const boundedTranslate = {
      x: clamp(nextTranslate.x, -maxX, maxX),
      y: clamp(nextTranslate.y, -maxY, maxY),
    };
    scaleRef.current = boundedScale;
    translateRef.current = boundedTranslate;
    setScale(boundedScale);
    setTranslate(boundedTranslate);
    onMove?.({ scale: boundedScale, positionX: boundedTranslate.x, positionY: boundedTranslate.y });
  };

  const zoomAt = (clientX, clientY, nextScale) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const point = {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };
    const currentScale = scaleRef.current;
    const currentTranslate = translateRef.current;
    const boundedScale = clamp(nextScale, minScale, maxScale);
    applyTransform(boundedScale, {
      x: point.x - ((point.x - currentTranslate.x) * boundedScale) / currentScale,
      y: point.y - ((point.y - currentTranslate.y) * boundedScale) / currentScale,
    });
  };

  const reset = () => applyTransform(centerOn?.scale ?? minScale, { x: 0, y: 0 });
  const zoomFromCenter = (nextScale) => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, nextScale);
  };

  useEffect(() => {
    reset();
  }, [cropWidth, cropHeight, imageWidth, imageHeight, minScale, centerOn?.scale]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const handleWheel = (event) => {
      event.preventDefault();
      zoomAt(event.clientX, event.clientY, scaleRef.current * Math.exp(-event.deltaY * 0.002));
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [minScale, maxScale, cropWidth, cropHeight, imageWidth, imageHeight, onMove]);

  const startGesture = () => {
    const active = [...pointers.current.values()];
    if (active.length >= 2) {
      const [a, b] = active;
      gesture.current = {
        type: 'pinch',
        distance: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        scale: scaleRef.current,
        translate: translateRef.current,
      };
    } else if (active.length === 1) {
      gesture.current = {
        type: 'pan',
        start: active[0],
        translate: translateRef.current,
      };
    }
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    ref.current?.setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      swipeStart.current = { x: event.clientX, y: event.clientY };
      moved.current = false;
    }
    startGesture();
  };

  const handlePointerMove = (event) => {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const active = [...pointers.current.values()];
    const currentGesture = gesture.current;
    if (!currentGesture) return;

    if (active.length >= 2 && currentGesture.type === 'pinch') {
      const [a, b] = active;
      const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const nextScale = clamp(
        currentGesture.scale * (Math.hypot(b.x - a.x, b.y - a.y) / currentGesture.distance),
        minScale,
        maxScale,
      );
      const rect = ref.current.getBoundingClientRect();
      const startPoint = {
        x: currentGesture.midpoint.x - rect.left - rect.width / 2,
        y: currentGesture.midpoint.y - rect.top - rect.height / 2,
      };
      const nextPoint = {
        x: midpoint.x - rect.left - rect.width / 2,
        y: midpoint.y - rect.top - rect.height / 2,
      };
      applyTransform(nextScale, {
        x: nextPoint.x - ((startPoint.x - currentGesture.translate.x) * nextScale) / currentGesture.scale,
        y: nextPoint.y - ((startPoint.y - currentGesture.translate.y) * nextScale) / currentGesture.scale,
      });
      moved.current = true;
    } else if (active.length === 1 && currentGesture.type === 'pan') {
      const dx = active[0].x - currentGesture.start.x;
      const dy = active[0].y - currentGesture.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
      applyTransform(scaleRef.current, {
        x: currentGesture.translate.x + dx,
        y: currentGesture.translate.y + dy,
      });
    }
  };

  const handlePointerEnd = (event) => {
    const start = swipeStart.current;
    const canSwipe = pointers.current.size === 1 && scaleRef.current <= minScale && start;
    pointers.current.delete(event.pointerId);
    if (canSwipe) {
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (enableSwipeDown && dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) onSwipeDown?.();
    }
    startGesture();
  };

  const control = (label, text, action) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); action(); }}
      style={{
        minWidth: 40,
        height: 40,
        padding: '0 10px',
        border: 0,
        borderRadius: 20,
        background: 'rgba(15, 23, 42, .82)',
        color: '#fff',
        fontSize: 22,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {text}
    </button>
  );

  return (
    <div
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClick={(event) => { if (!moved.current) onClick?.(event); }}
      style={{
        width: cropWidth,
        height: cropHeight,
        overflow: 'hidden',
        cursor: pointers.current.size ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: imageWidth,
          height: imageHeight,
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
      {showControls && (
        <div style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 5, display: 'flex', gap: 8 }}>
          {control('Alejar', '−', () => zoomFromCenter(scaleRef.current / 1.5))}
          {control('Restablecer zoom', `${Math.round(scale * 100)}%`, reset)}
          {control('Acercar', '+', () => zoomFromCenter(scaleRef.current * 1.5))}
        </div>
      )}
    </div>
  );
}
