// Modal/overlay que reutiliza la pizarra táctica (vendor Field) en modo
// "video sandbox" para grabar un vídeo desde el formulario de Análisis Rival.
//
// IMPORTANTE: replica EXACTAMENTE el patrón de la página standalone
// `src/pages/TacticalBoard.jsx` (que el usuario confirma que funciona):
//   - <SafeAreaProvider><GestureHandlerRootView><Field sandbox /></...>
//   - Sin overrides de NavigationContext / LocationContext.
//   - Pasamos `autoOpenVideoRecorder`, `presetFolderId`, `presetVideoName`
//     y `hideFolderPicker` como PROPS directas (Field las acepta tal cual,
//     ver field.js:8087-8116 `mergedParams = { ...props, ...route.params }`).
//
// Cuando el VideoRecorder interno termina de persistir el vídeo, llama a
// `global.fieldCallbacks.onVideoSaved(id)` y aquí lo traducimos a
// `onSaved(videoId)` que el form guarda en `customAnswers[qid]`.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdClose } from 'react-icons/md';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Field from '@/vendor/tacticalBoard/field';
import { ensureRivalAnalysisFolder } from './videoFolderHelpers';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  flex-direction: column;
  pointer-events: auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  flex-shrink: 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
`;

const Close = styled.button`
  background: transparent;
  border: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.sm};

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme }) => theme.colors.text};
  }
`;

const Stage = styled.div`
  flex: 1;
  min-height: 0;
  position: relative;
  background: ${({ theme }) => theme.colors.background};
`;

const fillStyle = { flex: 1, width: '100%', height: '100%' };

export default function TacticalVideoRecorderModal({
  open,
  onClose,
  onSaved, // (videoId) => void — solo se llama en éxito
  onError, // (err) => void — opcional, si el save falla
  initialFieldType = 'full',
  rivalName = '',
  questionText = '',
  title = 'Grabar vídeo táctico',
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const onSavedRef = useRef(onSaved);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  // Carpeta resuelta async. La resolvemos en background y la pasamos a Field
  // cuando esté lista; mientras tanto el grabador usa la raíz (selectedFolderId
  // queda en null hasta que llegue el preset).
  const [folderId, setFolderId] = useState(null);

  useEffect(() => {
    onSavedRef.current = onSaved;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  });

  // Auto-naming: "Análisis Rival - <Rival> - <Pregunta>"
  const presetVideoName = useMemo(() => {
    const root = t('rivalAnalysis.folderName', 'Análisis Rival');
    const parts = [root, rivalName?.trim(), questionText?.trim()].filter(Boolean);
    return parts.join(' - ');
  }, [t, rivalName, questionText]);

  // Resolver la carpeta de destino al abrir (no bloquea el render del Field).
  useEffect(() => {
    if (!open) {
      setFolderId(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const root = t('rivalAnalysis.folderName', 'Análisis Rival');
        const id = await ensureRivalAnalysisFolder({
          rootName: root,
          rivalName: rivalName?.trim() || t('rivalAnalysis.unknownRival', 'Sin rival'),
          lang: i18n.language,
        });
        if (!cancelled) setFolderId(id);
      } catch (err) {
        console.warn('[TacticalVideoRecorderModal] folder resolve failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, rivalName, t, i18n.language]);

  // Bridge global mientras el overlay esté abierto.
  useEffect(() => {
    if (!open) return undefined;
    const previous = global.fieldCallbacks;
    global.fieldCallbacks = {
      onSave: () => {},
      onCancel: () => {
        onCloseRef.current?.();
      },
      onVideoSaved: (videoId) => {
        try {
          if (videoId) onSavedRef.current?.(videoId);
        } finally {
          onCloseRef.current?.();
        }
      },
      onVideoSaveError: (err) => {
        onErrorRef.current?.(err);
      },
    };
    return () => {
      global.fieldCallbacks = previous;
    };
  }, [open]);

  // Bloquear scroll del body.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC cierra.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <Overlay theme={theme} data-theme-aware="true">
      <Header theme={theme}>
        <Title theme={theme}>{title}</Title>
        <Close theme={theme} onClick={onClose} aria-label="Cerrar grabadora">
          <MdClose size={22} />
        </Close>
      </Header>
      <Stage theme={theme}>
        <SafeAreaProvider style={fillStyle}>
          <GestureHandlerRootView style={fillStyle}>
            {/* Mismo patrón que `pages/TacticalBoard.jsx`: Field con props
                directas. `mergedParams` (field.js:8097) las acepta sin
                necesidad de override de NavigationContext. */}
            <Field
              sandbox
              autoOpenVideoRecorder
              hideFolderPicker
              presetFolderId={folderId}
              presetVideoName={presetVideoName}
              initialFieldType={initialFieldType}
            />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </Stage>
    </Overlay>,
    document.body
  );
}
