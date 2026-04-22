/**
 * Hook para capturar el stage de konva (o cualquier elemento canvas) a vídeo
 * usando la MediaRecorder API. La conversión a MP4/optimización se delega a
 * @ffmpeg/ffmpeg en el navegador (lazy import).
 *
 * Uso:
 *   const { start, stop, isRecording, videoUrl } = useStageRecorder(stageRef);
 *   await start();           // empieza a grabar
 *   const blob = await stop(); // devuelve el blob webm/mp4
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const pickMimeType = () => {
  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
};

export function useStageRecorder(stageRef, { fps = 30, mimeType } = {}) {
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const start = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) throw new Error('Stage no disponible');
    const canvas =
      typeof stage.toCanvas === 'function'
        ? stage.toCanvas()
        : stage; // si pasamos un canvas DOM directamente

    const stream = canvas.captureStream ? canvas.captureStream(fps) : null;
    if (!stream) throw new Error('captureStream no soportado en este navegador');

    const type = mimeType || pickMimeType();
    const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorderRef.current = recorder;
    recorder.start(250);
    setIsRecording(true);
  }, [stageRef, fps, mimeType]);

  const stop = useCallback(() =>
    new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder) return resolve(null);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecording(false);
        resolve(blob);
      };
      recorder.stop();
    }), []);

  return { start, stop, isRecording, videoUrl };
}

/**
 * Carga ffmpeg.wasm bajo demanda y expone helpers básicos.
 * Lazy import para no inflar el bundle inicial.
 */
let _ffmpegInstance = null;
export async function loadFFmpeg() {
  if (_ffmpegInstance) return _ffmpegInstance;
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const ffmpeg = new FFmpeg();
  await ffmpeg.load();
  _ffmpegInstance = ffmpeg;
  return ffmpeg;
}

/**
 * Convierte un Blob webm a mp4 usando ffmpeg.wasm.
 * TODO: portar las opciones avanzadas (overlay, recorte, etc) desde
 *       misterdata-source/src/components/tacticalBoard/videoRecorder.js
 */
export async function convertWebmToMp4(blob) {
  const ffmpeg = await loadFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');
  const inputName = 'in.webm';
  const outputName = 'out.mp4';
  await ffmpeg.writeFile(inputName, await fetchFile(blob));
  await ffmpeg.exec(['-i', inputName, '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', outputName]);
  const data = await ffmpeg.readFile(outputName);
  return new Blob([data.buffer], { type: 'video/mp4' });
}
