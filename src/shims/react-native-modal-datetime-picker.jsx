/**
 * Shim que cubre DOS APIs distintas:
 *
 * 1. `react-native-modal-datetime-picker`
 *      <DateTimePickerModal isVisible mode date onConfirm onCancel ... />
 *
 * 2. `@react-native-community/datetimepicker`  (alias al mismo módulo)
 *      <DateTimePicker value mode display onChange ... />
 *
 *    En la API community, en Android el componente se renderiza
 *    condicionalmente (`{show && <DateTimePicker ... />}`), por lo que
 *    cuando se monta debe abrirse SIEMPRE. Detectamos esa firma por la
 *    presencia de `value`/`onChange` (y ausencia de `isVisible`).
 *
 * Modal accesible y theme-aware: usa los tokens del tema activo
 * (`html[data-theme]`) para integrarse en modo claro y oscuro.
 *
 * `event` que se pasa a `onChange` simula el del paquete community:
 * `{ type: 'set' | 'dismissed', nativeEvent: { timestamp } }`.
 */
import { useEffect, useState } from 'react';

function fmtForInput(d, type) {
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  if (type === 'date') return `${y}-${m}-${day}`;
  if (type === 'time') return `${h}:${mi}`;
  return `${y}-${m}-${day}T${h}:${mi}`;
}

function parseValue(value, inputType) {
  if (!value) return null;
  if (inputType === 'time') {
    const [h, m] = value.split(':');
    const x = new Date();
    x.setHours(+h, +m, 0, 0);
    return x;
  }
  return new Date(value);
}

function isDarkTheme() {
  if (typeof document === 'undefined') return false;
  return document.documentElement?.dataset?.theme === 'dark';
}

export default function DateTimePickerModal(props) {
  const {
    // API modal
    isVisible,
    onConfirm,
    onCancel,
    // API community
    value,
    onChange,
    // Comunes
    mode = 'date',
    date,
    minimumDate,
    maximumDate,
  } = props;

  // Detectamos la API community: hay `value`/`onChange` y NO `isVisible`.
  const isCommunityApi = isVisible === undefined && (value !== undefined || onChange !== undefined);
  const open = isCommunityApi ? true : !!isVisible;

  const inputType = mode === 'time' ? 'time' : (mode === 'datetime' ? 'datetime-local' : 'date');
  const initialDate = (isCommunityApi ? value : date) || new Date();
  const [val, setVal] = useState(fmtForInput(initialDate, inputType));
  const [dark, setDark] = useState(isDarkTheme());

  useEffect(() => {
    if (open) setVal(fmtForInput(initialDate, inputType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inputType, initialDate?.getTime?.()]);

  // Reactivar a cambios de tema mientras está abierto
  useEffect(() => {
    if (typeof window === 'undefined' || !open) return undefined;
    const html = document.documentElement;
    const obs = new MutationObserver(() => setDark(isDarkTheme()));
    obs.observe(html, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, [open]);

  if (!open) return null;

  const C = dark
    ? {
        overlay: 'rgba(0, 0, 0, 0.65)',
        bg: '#162038',
        text: '#f1f5fb',
        border: '#3b4970',
        inputBg: '#1c2742',
        primary: '#60a5fa',
        onPrimary: '#0b1220',
        cancelBg: 'transparent',
        cancelText: '#cbd5e1',
      }
    : {
        overlay: 'rgba(15, 23, 42, 0.55)',
        bg: '#ffffff',
        text: '#0f172a',
        border: '#cbd5e1',
        inputBg: '#ffffff',
        primary: '#1d4ed8',
        onPrimary: '#ffffff',
        cancelBg: '#f8fafc',
        cancelText: '#334155',
      };

  const fireConfirm = () => {
    const d = parseValue(val, inputType);
    if (!d) {
      if (isCommunityApi) onChange?.({ type: 'dismissed', nativeEvent: { timestamp: Date.now() } }, undefined);
      else onCancel?.();
      return;
    }
    if (isCommunityApi) {
      onChange?.({ type: 'set', nativeEvent: { timestamp: d.getTime() } }, d);
    } else {
      onConfirm?.(d);
    }
  };

  const fireCancel = () => {
    if (isCommunityApi) {
      onChange?.({ type: 'dismissed', nativeEvent: { timestamp: Date.now() } }, undefined);
    } else {
      onCancel?.();
    }
  };

  return (
    <div
      data-theme-aware="true"
      style={{
        position: 'fixed', inset: 0, backgroundColor: C.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        // Por encima de cualquier portal RN-web (z-index 9999) y de
        // los modales propios (theme.zIndex.modal = 2147483000).
        zIndex: 2147483500,
        padding: 16,
      }}
      onClick={fireCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.bg, color: C.text, padding: 24, borderRadius: 12,
          minWidth: 280, maxWidth: '90vw',
          boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
          border: `1px solid ${C.border}`,
          colorScheme: dark ? 'dark' : 'light',
        }}
      >
        <input
          type={inputType}
          value={val}
          min={minimumDate ? fmtForInput(minimumDate, inputType) : undefined}
          max={maximumDate ? fmtForInput(maximumDate, inputType) : undefined}
          onChange={(e) => setVal(e.target.value)}
          style={{
            width: '100%', padding: 10, fontSize: 15,
            border: `1px solid ${C.border}`,
            background: C.inputBg, color: C.text,
            borderRadius: 8, marginBottom: 16,
            colorScheme: dark ? 'dark' : 'light',
          }}
        />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={fireCancel}
            style={{
              padding: '8px 16px', borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.cancelBg, color: C.cancelText,
              cursor: 'pointer', fontWeight: 600,
            }}
          >Cancelar</button>
          <button
            type="button"
            onClick={fireConfirm}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: C.primary, color: C.onPrimary, cursor: 'pointer',
              fontWeight: 700,
            }}
          >OK</button>
        </div>
      </div>
    </div>
  );
}
