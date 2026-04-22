/**
 * Shim de react-native-image-pan-zoom para web.
 * Renderiza children dentro de un contenedor con CSS pan/zoom básico
 * (drag con mouse para pan, wheel para zoom). Sin dependencias.
 */
import { useEffect, useRef, useState } from 'react';

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
}) {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const onMouseDown = (e) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: translate.x, baseY: translate.y };
  };
  const onMouseMove = (e) => {
    if (!dragRef.current) return;
    const nx = dragRef.current.baseX + (e.clientX - dragRef.current.startX);
    const ny = dragRef.current.baseY + (e.clientY - dragRef.current.startY);
    setTranslate({ x: nx, y: ny });
    onMove && onMove({ scale, positionX: nx, positionY: ny });
  };
  const onMouseUp = () => { dragRef.current = null; };

  useEffect(() => {
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  const onWheel = (e) => {
    e.preventDefault();
    const next = Math.max(0.5, Math.min(4, scale + (e.deltaY < 0 ? 0.1 : -0.1)));
    setScale(next);
    onMove && onMove({ scale: next, positionX: translate.x, positionY: translate.y });
  };

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onWheel={onWheel}
      onClick={onClick}
      style={{
        width: cropWidth,
        height: cropHeight,
        overflow: 'hidden',
        cursor: dragRef.current ? 'grabbing' : 'grab',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: imageWidth,
          height: imageHeight,
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
