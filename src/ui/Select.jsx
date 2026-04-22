import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Wrap = styled.div`
  position: relative;
  width: 100%;
`;

const Trigger = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme, $placeholder }) => $placeholder ? theme.colors.textMuted : theme.colors.text};
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; }
`;

const List = styled.ul`
  position: absolute;
  z-index: 50;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  max-height: 240px;
  overflow-y: auto;
`;

const Item = styled.li`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${({ $active, theme }) => $active ? theme.colors.backgroundAlt : 'transparent'};
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const Caret = styled.span`
  margin-left: 8px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 12px;
`;

export default function Select({ value, onChange, options, placeholder = 'Seleccionar...', renderLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const display = selected ? (renderLabel ? renderLabel(selected) : selected.label) : placeholder;

  return (
    <Wrap ref={ref}>
      <Trigger
        type="button"
        $placeholder={!selected}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{display}</span>
        <Caret>{open ? '▲' : '▼'}</Caret>
      </Trigger>
      {open && (
        <List>
          {options.map((opt) => (
            <Item
              key={opt.value}
              $active={opt.value === value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              <span>{renderLabel ? renderLabel(opt) : opt.label}</span>
              {opt.value === value && <span style={{ color: '#2563eb' }}>✓</span>}
            </Item>
          ))}
        </List>
      )}
    </Wrap>
  );
}
