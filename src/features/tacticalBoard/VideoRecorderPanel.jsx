/**
 * Barra horizontal de grabación de vídeo — estilo timeline profesional.
 * Se posiciona dentro del StageInner para no salirse del campo.
 */
import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { MdDelete, MdAdd, MdPlayArrow, MdClose, MdSpeed, MdExpandMore } from 'react-icons/md';
import { Muted } from '@/ui/primitives';
import { recordStageAnimation } from './videoRecorder';

const BarWrap = styled.div`
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  pointer-events: none;
  width: calc(100% - 16px);
  max-width: 580px;
  @media (max-width: 480px) {
    max-width: calc(100% - 12px);
    bottom: 6px;
  }
`;

const Bar = styled.div`
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 3px 5px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  height: 36px;
  overflow: hidden;
  @media (max-width: 480px) {
    height: 32px;
    gap: 2px;
    padding: 2px 4px;
    border-radius: 8px;
  }
`;

const KfGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  overflow-x: auto;
  max-width: 180px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const KfBadge = styled.button`
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 5px;
  border: 0;
  background: ${({ $active }) => ($active ? '#2563eb' : 'rgba(255,255,255,0.07)')};
  color: ${({ $active }) => ($active ? '#fff' : 'rgba(255,255,255,0.45)')};
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: ${({ $active }) => ($active ? '#2563eb' : 'rgba(255,255,255,0.12)')}; }
  @media (max-width: 480px) {
    width: 22px;
    height: 22px;
    min-width: 22px;
    font-size: 9px;
  }
`;

const KfAdd = styled.button`
  width: 24px;
  height: 24px;
  min-width: 24px;
  border-radius: 5px;
  border: 1px dashed rgba(255,255,255,0.18);
  background: transparent;
  color: rgba(255,255,255,0.4);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { border-color: rgba(255,255,255,0.35); color: rgba(255,255,255,0.7); }
  @media (max-width: 480px) {
    width: 22px;
    height: 22px;
    min-width: 22px;
    font-size: 13px;
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 20px;
  background: rgba(255,255,255,0.1);
  flex-shrink: 0;
`;

const ActionBtn = styled.button`
  width: 28px;
  height: 28px;
  min-width: 28px;
  border-radius: 7px;
  border: 0;
  background: ${({ $danger }) => ($danger ? 'rgba(239,68,68,0.12)' : 'transparent')};
  color: ${({ $danger }) => ($danger ? '#ef4444' : 'rgba(255,255,255,0.5)')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  &:hover { background: ${({ $danger }) => ($danger ? 'rgba(239,68,68,0.22)' : 'rgba(255,255,255,0.08)')}; }
`;

const PlayBtn = styled.button`
  width: 30px;
  height: 28px;
  min-width: 30px;
  border-radius: 7px;
  border: 0;
  background: ${({ $disabled }) => ($disabled ? 'rgba(255,255,255,0.06)' : '#2563eb')};
  color: ${({ $disabled }) => ($disabled ? 'rgba(255,255,255,0.2)' : '#fff')};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  &:hover { background: ${({ $disabled }) => ($disabled ? 'rgba(255,255,255,0.06)' : '#1d4ed8')}; }
`;

const SpeedBtn = styled.button`
  height: 26px;
  min-width: 36px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.6);
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  &:hover { background: rgba(255,255,255,0.1); }
`;

const SpeedMenu = styled.div`
  position: absolute;
  bottom: 40px;
  right: 0;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 3px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 40;
`;

const SpeedOption = styled.button`
  padding: 4px 12px;
  border-radius: 5px;
  border: 0;
  background: ${({ $sel }) => ($sel ? '#2563eb' : 'transparent')};
  color: ${({ $sel }) => ($sel ? '#fff' : 'rgba(255,255,255,0.6)')};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
  &:hover { background: ${({ $sel }) => ($sel ? '#2563eb' : 'rgba(255,255,255,0.08)')}; }
`;

const ProgressThin = styled.div`
  flex: 1;
  height: 3px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px;
  overflow: hidden;
  min-width: 20px;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #2563eb;
  width: ${({ $v }) => `${Math.round(($v || 0) * 100)}%`};
  transition: width 0.15s;
  border-radius: 2px;
`;

const VideoPreview = styled.video`
  position: absolute;
  bottom: 52px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 24px);
  max-width: 560px;
  max-height: 180px;
  border-radius: 10px;
  background: #000;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  z-index: 35;
  border: 1px solid rgba(255,255,255,0.08);
`;

const PreviewActions = styled.div`
  position: absolute;
  bottom: 52px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 5px;
  z-index: 36;
  align-items: center;
  background: rgba(15,23,42,0.88);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  padding: 4px 6px;
  border: 1px solid rgba(255,255,255,0.08);
  height: 36px;
`;

const PreviewBtn = styled.button`
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  border: 0;
  background: ${({ $primary }) => ($primary ? '#2563eb' : 'rgba(255,255,255,0.08)')};
  color: ${({ $primary }) => ($primary ? '#fff' : 'rgba(255,255,255,0.6)')};
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  &:hover { background: ${({ $primary }) => ($primary ? '#1d4ed8' : 'rgba(255,255,255,0.14)')}; }
`;

const BallBadges = styled.div`
  display: flex;
  gap: 2px;
  flex-shrink: 0;
`;

const BallBadge = styled.span`
  font-size: 8px;
  padding: 1px 4px;
  border-radius: 3px;
  background: ${({ $air }) => ($air ? '#f59e0b' : '#16a34a')};
  color: #fff;
  font-weight: 800;
  line-height: 14px;
`;

const ErrorToast = styled.div`
  position: absolute;
  bottom: 46px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(239,68,68,0.92);
  color: #fff;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  z-index: 40;
  box-shadow: 0 4px 12px rgba(239,68,68,0.3);
`;

export default function VideoRecorderPanel({
  stageRef,
  elements,
  setFrame,
  keyframes,
  setKeyframes,
}) {
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showSpeed, setShowSpeed] = useState(false);
  const [activeKeyframeIndex, setActiveKeyframeIndex] = useState(() => {
    return keyframes && keyframes.length > 0 ? keyframes.length - 1 : null;
  });
  const elementsBeforeRecordRef = useRef(null);

  useEffect(() => {
    if (!keyframes || keyframes.length === 0) {
      setActiveKeyframeIndex(null);
    } else if (activeKeyframeIndex === null || activeKeyframeIndex >= keyframes.length) {
      setActiveKeyframeIndex(keyframes.length - 1);
    }
  }, [keyframes, activeKeyframeIndex]);

  useEffect(() => {
    if (showSpeed) {
      const handler = () => setShowSpeed(false);
      window.addEventListener('click', handler);
      return () => window.removeEventListener('click', handler);
    }
  }, [showSpeed]);

  const addKeyframe = () => {
    const stage = stageRef.current;
    let thumb = null;
    try { thumb = stage?.toDataURL({ pixelRatio: 0.3, mimeType: 'image/jpeg', quality: 0.6 }); } catch { /* ignore */ }
    const snapshot = (elements || []).filter((el) => el.type !== 'ball-shadow');
    const newIdx = keyframes.length;
    setKeyframes((prev) => [...prev, { id: Date.now() + Math.random(), elements: JSON.parse(JSON.stringify(snapshot)), thumb }]);
    setActiveKeyframeIndex(newIdx);
  };

  const clearResult = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setError(null);
  };

  const generate = async () => {
    clearResult();
    setProgress(0);
    setRendering(true);
    elementsBeforeRecordRef.current = elements;
    try {
      const res = await recordStageAnimation({
        stage: stageRef.current,
        keyframes,
        setFrame,
        speed,
        fps: 30,
        onProgress: setProgress,
      });
      setResult(res);
    } catch (e) {
      setError((e instanceof Error) ? e.message : 'Error grabando vídeo');
    } finally {
      setRendering(false);
    }
  };

  const cleanup = () => {
    clearResult();
    if (elementsBeforeRecordRef.current) {
      setFrame(elementsBeforeRecordRef.current.filter((el) => el.type !== 'ball-shadow'));
      elementsBeforeRecordRef.current = null;
    }
  };

  if (keyframes.length === 0 && !result && !rendering) return null;

  const lastKfBalls = (keyframes[keyframes.length - 1]?.elements || []).filter(el => el.type === 'ball');

  return (
    <BarWrap>
      {result && (
        <>
          <VideoPreview src={result.url} controls loop autoPlay muted />
          <PreviewActions>
            <a href={result.url} download={`pizarra-${Date.now()}.webm`} style={{ textDecoration: 'none' }}>
              <PreviewBtn $primary>
                <MdPlayArrow /> Descargar
              </PreviewBtn>
            </a>
            <PreviewBtn onClick={cleanup}>
              <MdClose /> Descartar
            </PreviewBtn>
            <Muted style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{result.durationSec?.toFixed(1)}s</Muted>
          </PreviewActions>
        </>
      )}

      {error && <ErrorToast>{error}</ErrorToast>}

      <Bar>
        {keyframes.length > 0 && (
          <>
            <KfGroup>
              {keyframes.map((k, i) => (
                <KfBadge
                  key={k.id}
                  $active={activeKeyframeIndex === i}
                  onClick={() => {
                    setActiveKeyframeIndex(i);
                    if (setFrame && k.elements) {
                      setFrame(k.elements);
                    }
                  }}
                  title={`Posición ${i + 1}`}
                >
                  {i + 1}
                </KfBadge>
              ))}
              <KfAdd onClick={addKeyframe} disabled={rendering} title="Capturar posición">+</KfAdd>
            </KfGroup>
            {lastKfBalls.length > 0 && <Divider />}
            <BallBadges>
              {lastKfBalls.map((ball, bi) => {
                const isAir = ball.trajectory === 'air';
                return <BallBadge key={bi} $air={isAir}>{isAir ? '↗' : '➡'}</BallBadge>;
              })}
            </BallBadges>
          </>
        )}

        <div style={{ flex: 1 }} />

        {rendering && (
          <ProgressThin><ProgressFill $v={progress} /></ProgressThin>
        )}

        {keyframes.length > 1 && (
          <ActionBtn $danger onClick={() => setKeyframes([])} disabled={rendering} title="Limpiar todo">
            <MdDelete />
          </ActionBtn>
        )}

        <PlayBtn onClick={generate} disabled={rendering || keyframes.length < 2} $disabled={rendering || keyframes.length < 2} title="Generar vídeo">
          {rendering ? <MdSpeed /> : <MdPlayArrow />}
        </PlayBtn>

        <SpeedBtn onClick={(e) => { e.stopPropagation(); setShowSpeed((v) => !v); }}>
          {speed}× <MdExpandMore style={{ fontSize: 10 }} />
        </SpeedBtn>

        <ActionBtn onClick={cleanup} title="Cerrar">
          <MdClose />
        </ActionBtn>

        {showSpeed && (
          <SpeedMenu>
            {[0.5, 1, 2].map((s) => (
              <SpeedOption key={s} $sel={speed === s} onClick={() => { setSpeed(s); setShowSpeed(false); }}>
                {s}×
              </SpeedOption>
            ))}
          </SpeedMenu>
        )}
      </Bar>
    </BarWrap>
  );
}
