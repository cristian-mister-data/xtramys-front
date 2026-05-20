/**
 * Panel de grabación de vídeo de la pizarra táctica.
 *
 * Flujo:
 *  1. El usuario añade keyframes (snapshots del estado actual de la pizarra).
 *  2. Elige velocidad y genera. Internamente se invoca `recordStageAnimation`
 *     que interpola entre keyframes y graba el stream del canvas de Konva.
 *  3. Se muestra preview y enlace de descarga .webm. No hay backend implicado.
 */
import { useState, useRef } from 'react';
import styled from 'styled-components';
import { MdDelete, MdAdd, MdPlayArrow, MdDownload, MdClose } from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Muted, Row, Stack } from '@/ui/primitives';
import { recordStageAnimation } from './videoRecorder';

const KeyframeList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  max-height: 280px;
  overflow-y: auto;
`;

const KeyframeCard = styled.div`
  width: 176px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
`;

const Thumb = styled.div`
  width: 100%;
  aspect-ratio: 105 / 68;
  border-radius: 4px;
  background: #000 center/cover no-repeat ${({ $src }) => ($src ? `url(${$src})` : 'transparent')};
`;

const KFHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
`;

const BallTrajectoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const BallTrajectoryRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  align-items: center;
`;

const BallName = styled.span`
  min-width: 0;
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TrajectoryToggle = styled.div`
  display: inline-flex;
  padding: 2px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
`;

const TrajectoryBtn = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 3px 7px;
  background: ${({ $active, $tone }) => {
    if (!$active) return 'transparent';
    return $tone === 'air' ? '#f59e0b' : '#16a34a';
  }};
  color: ${({ $active }) => ($active ? '#fff' : '#64748b')};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  opacity: ${({ disabled }) => (disabled ? 0.6 : 1)};
`;

const DelBtn = styled.button`
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
`;

const SpeedRow = styled.div`
  display: flex;
  gap: 6px;
`;

const SpeedBtn = styled.button`
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  border: 2px solid ${({ $sel }) => ($sel ? '#1a237e' : '#e2e8f0')};
  background: ${({ $sel }) => ($sel ? '#eff6ff' : '#fff')};
  color: #0f172a;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
`;

const ProgressWrap = styled.div`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e2e8f0;
  overflow: hidden;
`;

const ProgressBar = styled.div`
  height: 100%;
  background: #1a237e;
  width: ${({ $v }) => `${Math.round(($v || 0) * 100)}%`};
  transition: width 0.15s;
`;

const Video = styled.video`
  width: 100%;
  max-height: 360px;
  background: #000;
  border-radius: 6px;
`;

export default function VideoRecorderPanel({
  open,
  onClose,
  stageRef,
  elements,
  setFrame,
  keyframes,
  setKeyframes,
}) {
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [result, setResult] = useState(null); // { url, blob, mimeType, durationSec }
  const [error, setError] = useState(null);
  const elementsBeforeRecordRef = useRef(null);

  const addKeyframe = () => {
    const stage = stageRef.current;
    let thumb = null;
    try { thumb = stage?.toDataURL({ pixelRatio: 0.3, mimeType: 'image/jpeg', quality: 0.6 }); } catch { /* ignore */ }
    const snapshot = (elements || []).filter((el) => el.type !== 'ball-shadow');
    setKeyframes((prev) => [...prev, { id: Date.now() + Math.random(), elements: JSON.parse(JSON.stringify(snapshot)), thumb }]);
  };

  const removeKeyframe = (id) => {
    setKeyframes((prev) => prev.filter((k) => k.id !== id));
  };

  const setKeyframeBallTrajectory = (keyframeId, ballId, trajectory) => {
    setKeyframes((prev) => prev.map((keyframe) => {
      if (keyframe.id !== keyframeId) return keyframe;
      return {
        ...keyframe,
        elements: (keyframe.elements || []).map((el) => (
          el.id === ballId ? { ...el, trajectory } : el
        )),
      };
    }));
  };

  const clearResult = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
  };

  const generate = async () => {
    clearResult();
    setError(null);
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
      const msg = (e instanceof Error) ? e.message : (typeof e === 'string' ? e : 'Error grabando vídeo');
      setError(msg);
    } finally {
      setRendering(false);
    }
  };

  const close = () => {
    clearResult();
    if (elementsBeforeRecordRef.current) {
      setFrame(elementsBeforeRecordRef.current.filter((el) => el.type !== 'ball-shadow'));
      elementsBeforeRecordRef.current = null;
    }
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Grabar animación"
      width={720}
      footer={
        <Row style={{ justifyContent: 'flex-end', width: '100%', gap: 8 }}>
          <Button type="button" $variant="ghost" onClick={close}>Cerrar</Button>
        </Row>
      }
    >
      <Stack $gap={14}>
        <Muted>
          Captura estados de la pizarra como keyframes. Al generar, se interpolan
          en orden y se graba un vídeo .webm del canvas (sin backend).
        </Muted>

        <Row $gap={10} $wrap>
          <Button type="button" $variant="secondary" onClick={addKeyframe} disabled={rendering}>
            <MdAdd style={{ verticalAlign: -3 }} /> Añadir keyframe ({keyframes.length})
          </Button>
          {keyframes.length > 0 && (
            <Button
              type="button"
              $variant="ghost"
              onClick={() => setKeyframes([])}
              disabled={rendering}
            >
              Limpiar keyframes
            </Button>
          )}
        </Row>

        {keyframes.length > 0 && (
          <KeyframeList>
            {keyframes.map((k, i) => (
              <KeyframeCard key={k.id}>
                <KFHeader>
                  <span>#{i + 1}</span>
                  <DelBtn type="button" title="Eliminar" onClick={() => removeKeyframe(k.id)} disabled={rendering}>
                    <MdDelete />
                  </DelBtn>
                </KFHeader>
                <Thumb $src={k.thumb} />
                {(k.elements || []).some((el) => el.type === 'ball') && (
                  <BallTrajectoryList>
                    {(k.elements || []).filter((el) => el.type === 'ball').map((ball, bi) => {
                      const isAir = ball.trajectory === 'air';
                      const label = ball.label || ball.name || `Balón ${bi + 1}`;
                      return (
                        <BallTrajectoryRow key={ball.id || bi}>
                          <BallName title={label}>{label}</BallName>
                          <TrajectoryToggle aria-label={`Trayectoria de ${label}`}>
                            <TrajectoryBtn
                              type="button"
                              $active={!isAir}
                              $tone="ground"
                              onClick={() => setKeyframeBallTrajectory(k.id, ball.id, 'ground')}
                              disabled={rendering}
                            >
                              Suelo
                            </TrajectoryBtn>
                            <TrajectoryBtn
                              type="button"
                              $active={isAir}
                              $tone="air"
                              onClick={() => setKeyframeBallTrajectory(k.id, ball.id, 'air')}
                              disabled={rendering}
                            >
                              Aire
                            </TrajectoryBtn>
                          </TrajectoryToggle>
                        </BallTrajectoryRow>
                      );
                    })}
                  </BallTrajectoryList>
                )}
              </KeyframeCard>
            ))}
          </KeyframeList>
        )}

        <div>
          <Muted>Velocidad</Muted>
          <SpeedRow style={{ marginTop: 6 }}>
            {[0.5, 1, 2].map((s) => (
              <SpeedBtn
                key={s}
                type="button"
                $sel={speed === s}
                onClick={() => setSpeed(s)}
                disabled={rendering}
              >
                {s}×
              </SpeedBtn>
            ))}
          </SpeedRow>
        </div>

        <Row $gap={10}>
          <Button
            type="button"
            onClick={generate}
            disabled={rendering || keyframes.length < 2}
          >
            <MdPlayArrow style={{ verticalAlign: -3 }} />
            {rendering ? 'Generando…' : 'Generar vídeo'}
          </Button>
          {rendering && (
            <div style={{ flex: 1 }}>
              <ProgressWrap><ProgressBar $v={progress} /></ProgressWrap>
              <Muted>{Math.round(progress * 100)}%</Muted>
            </div>
          )}
        </Row>

        {error && (
          <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>
        )}

        {result && (
          <Stack $gap={8}>
            <Video src={result.url} controls loop autoPlay muted />
            <Row $gap={8}>
              <a
                href={result.url}
                download={`pizarra-${Date.now()}.webm`}
                style={{ textDecoration: 'none' }}
              >
                <Button type="button" $variant="primary">
                  <MdDownload style={{ verticalAlign: -3 }} /> Descargar .webm
                </Button>
              </a>
              <Button type="button" $variant="ghost" onClick={clearResult}>
                <MdClose style={{ verticalAlign: -3 }} /> Descartar
              </Button>
              <Muted>Duración: {result.durationSec?.toFixed(2)}s</Muted>
            </Row>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}
