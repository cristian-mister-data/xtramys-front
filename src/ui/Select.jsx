import { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';

const Wrap = styled.div`
  position: relative;
  width: 100%;
`;

const Trigger = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid ${({ theme, $open }) => $open ? theme.colors.borderFocus : theme.colors.inputBorder};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.inputBg};
  color: ${({ theme, $placeholder }) => $placeholder ? theme.colors.inputPlaceholder : theme.colors.text};
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.borderStrong};
  }
  &:focus-visible {
    outline: none;
    border-color: ${({ theme }) => theme.colors.borderFocus};
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const popIn = keyframes`
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const List = styled.ul`
  position: absolute;
  z-index: ${({ theme }) => theme.zIndex.dropdown};
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: ${({ theme }) => theme.colors.surfaceElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  max-height: 240px;
  overflow-y: auto;
  animation: ${popIn} 0.14s ease-out;
  transform-origin: top center;
`;

const Item = styled.li`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  font-size: 14px;
  color: ${({ $active, theme }) => $active ? theme.colors.primarySoftText : theme.colors.text};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: ${({ $active, theme }) => $active ? theme.colors.primarySoft : 'transparent'};
  font-weight: ${({ $active }) => $active ? 600 : 400};
  transition: background 0.12s ease;

  &:hover {
    background: ${({ $active, theme }) => $active ? theme.colors.primarySoft : theme.colors.backgroundAlt};
  }
`;

const Caret = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 10px;
  line-height: 1;
  transition: transform 0.18s ease;
  transform: rotate(${({ $open }) => $open ? '180deg' : '0deg'});
`;

const Check = styled.span`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
`;

export default function Select({ value, onChange, options, placeholder = 'Seleccionar...', renderLabel, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);
  const display = selected ? (renderLabel ? renderLabel(selected) : selected.label) : placeholder;

  return (
    <Wrap ref={ref}>
      <Trigger
        type="button"
        disabled={disabled}
        $placeholder={!selected}
        $open={open}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</span>
        <Caret $open={open} aria-hidden="true">▼</Caret>
      </Trigger>
      {open && (
        <List role="listbox">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <Item
                key={opt.value}
                role="option"
                aria-selected={active}
                $active={active}
                onClick={() => { onChange(opt.value); setOpen(false); }}
              >
                <span>{renderLabel ? renderLabel(opt) : opt.label}</span>
                {active && <Check aria-hidden="true">✓</Check>}
              </Item>
            );
          })}
        </List>
      )}
    </Wrap>
  );
}
