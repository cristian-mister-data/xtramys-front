/**
 * Shim de react-native-modal-datetime-picker para web.
 * Modal mínimo con <input type="datetime-local"|"date"|"time">.
 *
 * Props soportadas: isVisible, mode (date|time|datetime), onConfirm(date), onCancel,
 * date (initial), minimumDate, maximumDate, locale, display.
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

export default function DateTimePickerModal({
  isVisible,
  mode = 'date',
  date,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}) {
  const inputType = mode === 'time' ? 'time' : (mode === 'datetime' ? 'datetime-local' : 'date');
  const [value, setValue] = useState(fmtForInput(date || new Date(), inputType));

  useEffect(() => {
    setValue(fmtForInput(date || new Date(), inputType));
  }, [date, inputType]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', padding: 24, borderRadius: 12, minWidth: 280,
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
        }}
      >
        <input
          type={inputType}
          value={value}
          min={minimumDate ? fmtForInput(minimumDate, inputType) : undefined}
          max={maximumDate ? fmtForInput(maximumDate, inputType) : undefined}
          onChange={(e) => setValue(e.target.value)}
          style={{
            width: '100%', padding: 10, fontSize: 15, border: '1px solid #cbd5e1',
            borderRadius: 8, marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer' }}
          >Cancelar</button>
          <button
            type="button"
            onClick={() => {
              if (!value) return onCancel && onCancel();
              const d = inputType === 'time'
                ? (() => { const [h, m] = value.split(':'); const x = new Date(); x.setHours(+h, +m, 0, 0); return x; })()
                : new Date(value);
              onConfirm && onConfirm(d);
            }}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1a237e', color: '#fff', cursor: 'pointer' }}
          >OK</button>
        </div>
      </div>
    </div>
  );
}
