import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { PRESET_COLORS, isValidHex } from './colorPalette';

const Wrap = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
  z-index: 50;
  min-width: 220px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  margin-bottom: 8px;
`;

const Swatch = styled.button`
  width: 28px; height: 28px;
  border-radius: 6px;
  border: 2px solid ${({ $sel }) => ($sel ? '#1a237e' : '#e2e8f0')};
  background: ${({ $c }) => $c};
  cursor: pointer;
  padding: 0;
`;

const Row = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const Hex = styled.input`
  flex: 1;
  padding: 4px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  font-size: 12px;
  font-family: monospace;
`;

export default function ColorPickerPopover({ value = '#000000', onChange, onClose }) {
  const [hex, setHex] = useState(value);

  useEffect(() => { setHex(value); }, [value]);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const pick = (c) => {
    setHex(c);
    onChange?.(c);
  };

  return (
    <Wrap onClick={(e) => e.stopPropagation()}>
      <Grid>
        {PRESET_COLORS.map((c) => (
          <Swatch
            key={c}
            type="button"
            $c={c}
            $sel={c.toLowerCase() === hex.toLowerCase()}
            onClick={() => pick(c)}
          />
        ))}
      </Grid>
      <Row>
        <input
          type="color"
          value={isValidHex(hex) ? hex : '#000000'}
          onChange={(e) => pick(e.target.value)}
          style={{ width: 32, height: 32, border: 0, padding: 0, cursor: 'pointer' }}
        />
        <Hex
          value={hex}
          onChange={(e) => {
            const v = e.target.value;
            setHex(v);
            if (isValidHex(v)) onChange?.(v);
          }}
        />
      </Row>
    </Wrap>
  );
}
