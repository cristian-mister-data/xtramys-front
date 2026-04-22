/**
 * Shim de @react-native-picker/picker para web.
 * Renderiza un <select> nativo. Soporta `selectedValue`, `onValueChange`, y children
 * `<Picker.Item label value />`.
 */
import React from 'react';

export function Picker({ selectedValue, onValueChange, enabled = true, style, children, mode, dropdownIconColor }) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <select
      value={selectedValue ?? ''}
      disabled={!enabled}
      onChange={(e) => {
        const idx = e.target.selectedIndex;
        const it = items[idx];
        const v = it?.props?.value;
        onValueChange && onValueChange(v, idx);
      }}
      style={{
        padding: 8,
        fontSize: 14,
        borderRadius: 6,
        border: '1px solid #cbd5e1',
        background: '#fff',
        ...(style || {}),
      }}
    >
      {items.map((it, i) => (
        <option key={i} value={it.props?.value}>{it.props?.label}</option>
      ))}
    </select>
  );
}

Picker.Item = function PickerItem() { return null; };

export default { Picker };
