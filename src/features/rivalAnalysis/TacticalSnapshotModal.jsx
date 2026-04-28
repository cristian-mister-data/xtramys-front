// Modal/overlay que reutiliza la pizarra táctica REAL (vendor Field).
// En vez de duplicar lógica con un reimplementación web (KonvaJS), aquí
// montamos el mismo `Field` que usa la página standalone "Pizarra táctica"
// pero como overlay modal, alimentándolo por parámetros y devolviendo el
// snapshot al callback de la pregunta tipo "graphic" en RivalAnalysis.
//
// Estrategia para no duplicar lógica:
// 1. El Field vendor lee navigation/route vía nuestro shim
//    (`react-navigation-native.js`) → que a su vez lee de los contexts de
//    react-router. Sobreescribimos `UNSAFE_NavigationContext` y
//    `UNSAFE_LocationContext` SOLO dentro del overlay para inyectar:
//      - una location.state con `{ initialElements, initialFieldType }`
//        (Field lee `route.params` con esos campos).
//      - un navigator no-op para que `navigation.goBack()` interno (que
//        Field invoca después de guardar) no navegue la SPA.
// 2. Field usa el bridge `global.fieldCallbacks` (mismo patrón que
//    createStrategyForm / createExerciseForm). Registramos onSave/onCancel
//    antes de montar Field y los restauramos al desmontar.
import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { useTheme } from 'styled-components';
import { MdClose } from 'react-icons/md';
import {
  UNSAFE_NavigationContext as NavigationContext,
  UNSAFE_LocationContext as LocationContext,
} from 'react-router-dom';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Field from '@/vendor/tacticalBoard/field';

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

// Normaliza la salida de Field a un data URL utilizable como <img src>.
// Field web (canvas.capture) suele devolver ya un dataURL; en RN devuelve
// base64 puro. Cubrimos ambos casos por compatibilidad histórica con los
// snapshots ya guardados en BD.
function toDataUrl(maybeBase64) {
  if (!maybeBase64) return '';
  if (typeof maybeBase64 !== 'string') return '';
  if (maybeBase64.startsWith('data:')) return maybeBase64;
  return `data:image/png;base64,${maybeBase64}`;
}

export default function TacticalSnapshotModal({
  open,
  onClose,
  onSave,
  initialPlayers,
  initialFieldType = 'full',
  title = 'Pizarra táctica',
}) {
  const theme = useTheme();
  const onSaveRef = useRef(onSave);
  const onCloseRef = useRef(onClose);

  // Mantener refs actualizadas para que los callbacks registrados en
  // global.fieldCallbacks vean siempre los handlers más recientes sin
  // re-registrarlos en cada render.
  useEffect(() => {
    onSaveRef.current = onSave;
    onCloseRef.current = onClose;
  });

  // Registrar/restaurar el bridge global mientras el overlay esté abierto.
  useEffect(() => {
    if (!open) return undefined;
    const previous = global.fieldCallbacks;
    global.fieldCallbacks = {
      onSave: (elements, fieldType, imageBase64) => {
        const payload = {
          imageBase64: toDataUrl(imageBase64),
          elements,
          fieldType,
        };
        try {
          onSaveRef.current?.(payload);
        } finally {
          onCloseRef.current?.();
        }
      },
      onCancel: () => {
        onCloseRef.current?.();
      },
    };
    return () => {
      // Restaurar callbacks previos (si los hubiera) para no contaminar
      // otros consumidores del bridge (createStrategyForm, etc.).
      global.fieldCallbacks = previous;
    };
  }, [open]);

  // Contexts simulados para Field.
  // - LocationContext.location.state alimenta route.params (vía el shim
  //   react-navigation-native que hace `{ ...location.state }`).
  // - NavigationContext.navigator hace que `useNavigate` interno y por
  //   tanto `navigation.goBack()` de Field sean no-ops (la salida real
  //   ocurre por nuestros callbacks).
  const navigationContextValue = useMemo(
    () => ({
      basename: '',
      navigator: {
        createHref: () => '',
        encodeLocation: (to) => (typeof to === 'string' ? { pathname: to, search: '', hash: '' } : to),
        go: () => {},
        push: () => {},
        replace: () => {},
      },
      static: false,
      // react-router v6.4+ lee future.v7_* dentro de useNavigate/useResolvedPath.
      // Sin esto, useNavigateUnstable revienta con
      // "Cannot read properties of undefined (reading 'v7_relativeSplatPath')".
      future: {
        v7_relativeSplatPath: false,
        v7_startTransition: false,
      },
    }),
    []
  );

  const locationContextValue = useMemo(
    () => ({
      location: {
        pathname: '/tactical-board',
        search: '',
        hash: '',
        state: {
          initialElements: Array.isArray(initialPlayers) ? initialPlayers : [],
          initialFieldType,
        },
        key: 'rival-snapshot',
      },
      navigationType: 'POP',
    }),
    [initialPlayers, initialFieldType]
  );

  // Bloquear scroll del body mientras el overlay esté abierto.
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Cierre con ESC.
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
        <Close theme={theme} onClick={onClose} aria-label="Cerrar pizarra">
          <MdClose size={22} />
        </Close>
      </Header>
      <Stage theme={theme}>
        <NavigationContext.Provider value={navigationContextValue}>
          <LocationContext.Provider value={locationContextValue}>
            <SafeAreaProvider style={fillStyle}>
              <GestureHandlerRootView style={fillStyle}>
                {/* sandbox=false (default) → se renderiza el botón Guardar
                    que invoca handleGuardarGrafico → saveCallback de
                    global.fieldCallbacks (registrado arriba). */}
                <Field />
              </GestureHandlerRootView>
            </SafeAreaProvider>
          </LocationContext.Provider>
        </NavigationContext.Provider>
      </Stage>
    </Overlay>,
    document.body
  );
}
