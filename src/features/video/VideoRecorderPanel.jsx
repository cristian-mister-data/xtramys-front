/**
 * Panel de grabación de vídeo. Permite grabar un canvas (por ejemplo del
 * tactical board) y descargar el resultado en webm/mp4.
 *
 * TODO: integrar con la pizarra táctica para grabar la pantalla del campo,
 * con animaciones de jugadores, capas, balón, etc. (port desde
 * misterdata-source/src/components/tacticalBoard/videoRecorder.js)
 */
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Card, Stack, Row, Button, Muted } from '@/ui/primitives';
import { useStageRecorder, convertWebmToMp4 } from './useStageRecorder';

const Canvas = styled.canvas`
  width: 100%;
  height: auto;
  background: #111;
  border-radius: ${({ theme }) => theme.radius.md};
  display: block;
`;

const Video = styled.video`
  width: 100%;
  border-radius: ${({ theme }) => theme.radius.md};
  background: #000;
`;

export default function VideoRecorderPanel() {
  const canvasRef = useRef(null);
  const animRef = useRef(0);
  const recorder = useStageRecorder(canvasRef);
  const [busy, setBusy] = useState(false);
  const [mp4Url, setMp4Url] = useState(null);

  // Animación demo en el canvas para validar la captura
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    let t = 0;
    const draw = () => {
      ctx.fillStyle = '#0d1551';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00bcd4';
      const x = (Math.sin(t) * 0.4 + 0.5) * canvas.width;
      const y = (Math.cos(t * 0.7) * 0.4 + 0.5) * canvas.height;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.fillText('Demo de captura — ' + t.toFixed(1) + 's', 20, 30);
      t += 0.05;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const onStop = async () => {
    setBusy(true);
    try {
      await recorder.stop();
    } finally {
      setBusy(false);
    }
  };

  const onConvert = async () => {
    if (!recorder.videoUrl) return;
    setBusy(true);
    try {
      const blob = await fetch(recorder.videoUrl).then((r) => r.blob());
      const mp4 = await convertWebmToMp4(blob);
      setMp4Url(URL.createObjectURL(mp4));
    } catch (e) {
      alert('Error convirtiendo: ' + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Stack $gap={12}>
        <Canvas ref={canvasRef} />
        <Row $gap={8} $wrap>
          {!recorder.isRecording ? (
            <Button onClick={recorder.start} disabled={busy}>● Grabar</Button>
          ) : (
            <Button $variant="danger" onClick={onStop} disabled={busy}>■ Parar</Button>
          )}
          {recorder.videoUrl && (
            <>
              <a href={recorder.videoUrl} download="grabacion.webm">
                <Button $variant="secondary">Descargar webm</Button>
              </a>
              <Button $variant="secondary" onClick={onConvert} disabled={busy}>
                {busy ? 'Convirtiendo...' : 'Convertir a MP4'}
              </Button>
            </>
          )}
          {mp4Url && (
            <a href={mp4Url} download="grabacion.mp4">
              <Button $variant="secondary">Descargar MP4</Button>
            </a>
          )}
        </Row>
        {recorder.videoUrl && <Video src={mp4Url || recorder.videoUrl} controls />}
        <Muted>
          La conversión a MP4 usa ffmpeg.wasm bajo demanda. La primera carga puede tardar.
        </Muted>
      </Stack>
    </Card>
  );
}
