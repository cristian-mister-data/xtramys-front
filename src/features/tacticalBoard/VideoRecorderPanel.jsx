/**
 * Panel de grabación de vídeo de la pizarra táctica.
 *
 * Flujo:
 *  1. El usuario añade keyframes (snapshots del estado actual de la pizarra).
 *  2. Elige velocidad y genera. Internamente se invoca `recordStageAnimation`
 *     que interpola entre keyframes y graba el stream del canvas de Konva.
 *  3. Se muestra preview y enlace de descarga .webm. No hay backend implicado.
 */
import { useState } from 'react';
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
  max-height: 200px;
  overflow-y: auto;
`;

const KeyframeCard = styled.div`
  width: 120px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fff;
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

  const addKeyframe = () => {
    const stage = stageRef.current;
    let thumb = null;
    try { thumb = stage?.toDataURL({ pixelRatio: 0.3, mimeType: 'image/jpeg', quality: 0.6 }); } catch { /* ignore */ }
    const snapshot = JSON.parse(JSON.stringify(elements || []));
    setKeyframes((prev) => [...prev, { id: Date.now() + Math.random(), elements: snapshot, thumb }]);
  };

  const removeKeyframe = (id) => {
    setKeyframes((prev) => prev.filter((k) => k.id !== id));
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
      setError(e?.message || 'Error grabando vídeo');
    } finally {
      setRendering(false);
    }
  };

  const close = () => {
    clearResult();
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
