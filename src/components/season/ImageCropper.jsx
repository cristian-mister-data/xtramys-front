import { useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { Button, Row } from '@/ui/primitives';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147484000;
  padding: 16px;
`;

const Panel = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  width: 100%;
  max-width: 520px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 17px;
  font-weight: 600;
`;

const CloseBtn = styled.button`
  background: transparent;
  border: 0;
  width: 32px;
  height: 32px;
  font-size: 22px;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textSecondary};
  border-radius: ${({ theme }) => theme.radius.sm};
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt }; }
`;

const Viewport = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  background: #1a1a1a;
  overflow: hidden;
  cursor: grab;
`;

const DragLayer = styled.div`
  position: absolute;
  inset: 0;
  cursor: grab;
  &:active { cursor: grabbing; }
`;

const ImageEl = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: ${({ $w }) => $w}px;
  height: ${({ $h }) => $h}px;
  max-width: none;
  transform: translate(${({ $dx }) => $dx}px, ${({ $dy }) => $dy}px);
  pointer-events: none;
`;

const CornerTL = styled.div`
  position: absolute;
  inset: 0;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
  pointer-events: none;
`;

const Controls = styled.div`
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SliderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Slider = styled.input`
  flex: 1;
  accent-color: ${({ theme }) => theme.colors.primary };
`;

const Preview = styled.canvas`
  width: 72px;
  height: 72px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 2px solid ${({ theme }) => theme.colors.border };
  flex-shrink: 0;
  background: #fff;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border };
`;

const ZoomBadge = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary };
  min-width: 36px;
  text-align: center;
`;

const DragHint = styled.div`
  font-size: 11px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  background: ${({ theme }) => theme.colors.backgroundAlt};
  padding: 6px 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export default function ImageCropper({ src, onConfirm, onCancel, title }) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);

  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [vpSize, setVpSize] = useState(0);

  const zoomRef = useRef(zoom);
  const dxRef = useRef(dx);
  const dyRef = useRef(dy);
  const vpSizeRef = useRef(vpSize);
  const imgRef = useRef(null);
  const onConfirmRef = useRef(onConfirm);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { dxRef.current = dx; }, [dx]);
  useEffect(() => { dyRef.current = dy; }, [dy]);
  useEffect(() => { vpSizeRef.current = vpSize; }, [vpSize]);
  useEffect(() => { onConfirmRef.current = onConfirm; }, [onConfirm]);

  useEffect(() => {
    const i = new Image();
    i.onload = () => {
      if (!i.naturalWidth || !i.naturalHeight) return;
      setImg(i);
      imgRef.current = i;
      requestAnimationFrame(() => {
        const vp = viewportRef.current;
        if (!vp) return;
        const s = vp.offsetWidth;
        if (!s) return;
        setVpSize(s);
        vpSizeRef.current = s;
        const fitZ = Math.min(s / i.naturalWidth, s / i.naturalHeight);
        const z = Math.min(fitZ, 1);
        const dispW = i.naturalWidth * z;
        const dispH = i.naturalHeight * z;
        setZoom(z);
        setDx((s - dispW) / 2);
        setDy((s - dispH) / 2);
      });
    };
    i.src = src;
  }, [src]);

  const iw = img ? img.naturalWidth : 1;
  const ih = img ? img.naturalHeight : 1;
  const dispW = iw * zoom;
  const dispH = ih * zoom;

  useEffect(() => {
    if (!img || !canvasRef.current || !vpSize) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = 512;
    canvasRef.current.height = 512;
    const scale = 512 / vpSize;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 512, 512);
    ctx.drawImage(img, dx * scale, dy * scale, dispW * scale, dispH * scale);
  }, [img, zoom, dx, dy, vpSize, dispW, dispH]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const nDx = dragRef.current.originDx + (e.clientX - dragRef.current.originX);
      const nDy = dragRef.current.originDy + (e.clientY - dragRef.current.originY);
      const vp = vpSizeRef.current;
      const dw = imgRef.current.naturalWidth * zoomRef.current;
      const dh = imgRef.current.naturalHeight * zoomRef.current;
      setDx(Math.min(0, Math.max(vp - dw, nDx)));
      setDy(Math.min(0, Math.max(vp - dh, nDy)));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  const dragRef = useRef({ originX: 0, originY: 0, originDx: 0, originDy: 0 });

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZ = zoomRef.current;
    const oldDx = dxRef.current;
    const oldDy = dyRef.current;
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    const newZ = Math.max(0.1, Math.min(10, oldZ + delta));
    if (newZ === oldZ) return;
    let nDx = mx + (oldDx - mx) * newZ / oldZ;
    let nDy = my + (oldDy - my) * newZ / oldZ;
    setZoom(newZ);
    setDx(nDx);
    setDy(nDy);
  }, []);

  const handleMouseDown = useCallback((e) => {
    dragRef.current = {
      originX: e.clientX,
      originY: e.clientY,
      originDx: dxRef.current,
      originDy: dyRef.current,
    };
    setDragging(true);
  }, []);

  const doCrop = useCallback(() => {
    const imgEl = imgRef.current;
    const vp = viewportRef.current;
    if (!imgEl || !vp) return;
    const z = zoomRef.current;
    const x = dxRef.current;
    const y = dyRef.current;
    const vpS = vp.offsetWidth;
    if (!vpS) return;
    const scale = 512 / vpS;
    const dW = imgEl.naturalWidth * z;
    const dH = imgEl.naturalHeight * z;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(imgEl, x * scale, y * scale, dW * scale, dH * scale);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      if (!dataUrl || !dataUrl.startsWith('data:')) return;
      onConfirmRef.current(dataUrl);
    } catch (err) {
      console.error('[ImageCropper] doCrop error:', err);
    }
  }, []);

  const resetView = useCallback(() => {
    const imgEl = imgRef.current;
    const vpS = vpSizeRef.current;
    if (!imgEl || !vpS) return;
    const fitZ = Math.min(vpS / imgEl.naturalWidth, vpS / imgEl.naturalHeight);
    const z = Math.min(fitZ, 1);
    const dw = imgEl.naturalWidth * z;
    const dh = imgEl.naturalHeight * z;
    setZoom(z);
    setDx((vpS - dw) / 2);
    setDy((vpS - dh) / 2);
  }, []);

  const headerTitle = title || t('team.adjustBadge', 'Ajustar escudo');

  const content = !img ? (
    <Overlay>
      <Panel>
        <Header>
          {headerTitle}
          <CloseBtn onClick={onCancel}>×</CloseBtn>
        </Header>
        <Viewport ref={viewportRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
          {t('common.loading', 'Cargando...')}
        </Viewport>
      </Panel>
    </Overlay>
  ) : (
    <Overlay>
      <Panel>
        <Header>
          {headerTitle}
          <CloseBtn onClick={onCancel}>×</CloseBtn>
        </Header>

        <Viewport ref={viewportRef}>
          <DragLayer
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
          />
          <ImageEl
            src={src}
            draggable={false}
            $w={dispW}
            $h={dispH}
            $dx={dx}
            $dy={dy}
          />
          <CornerTL />
        </Viewport>

        <DragHint>
          {t('team.dragToMove', 'Arrastra para mover')} &bull; {t('team.wheelToZoom', 'Rueda para hacer zoom')}
        </DragHint>

        <Controls>
          <SliderRow>
            <span style={{ fontSize: 12, color: '#888' }}>−</span>
            <Slider
              type="range"
              min="0.1"
              max="5"
              step="0.01"
              value={zoom}
              onChange={(e) => {
                const newZ = parseFloat(e.target.value);
                const vp = vpSizeRef.current;
                const ratio = newZ / zoomRef.current;
                const nDx = vp / 2 + (dxRef.current - vp / 2) * ratio;
                const nDy = vp / 2 + (dyRef.current - vp / 2) * ratio;
                setZoom(newZ);
                setDx(nDx);
                setDy(nDy);
              }}
            />
            <span style={{ fontSize: 12, color: '#888' }}>+</span>
            <ZoomBadge>{Math.round(zoom * 100)}%</ZoomBadge>
          </SliderRow>

          <Row $gap={12} style={{ justifyContent: 'space-between' }}>
            <Button $variant="ghost" onClick={resetView}>
              {t('team.resetView', 'Restablecer')}
            </Button>
            <Preview ref={canvasRef} />
          </Row>
        </Controls>

        <Footer>
          <Button $variant="secondary" onClick={onCancel}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button onClick={doCrop}>
            {t('common.apply', 'Aplicar')}
          </Button>
        </Footer>
      </Panel>
    </Overlay>
  );

  return createPortal(content, document.body);
}