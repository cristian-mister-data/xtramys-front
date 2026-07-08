import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { toast } from './toast';

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const Stack = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: ${({ theme }) => theme.zIndex.toast};
  pointer-events: none;

  html[data-native="true"] & {
    top: calc(16px + env(safe-area-inset-top, 0px));
  }
`;

const palette = (type, theme) => {
  const c = theme.colors;
  switch (type) {
    case 'success':
      return { bg: c.successSoft, fg: c.successSoftText, accent: c.success };
    case 'error':
      return { bg: c.errorSoft, fg: c.errorSoftText, accent: c.error };
    case 'warning':
      return { bg: c.warningSoft, fg: c.warningSoftText, accent: c.warning };
    case 'info':
    default:
      return { bg: c.infoSoft, fg: c.infoSoftText, accent: c.info };
  }
};

const Item = styled.div`
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: ${({ $type, theme }) => palette($type, theme).bg};
  color: ${({ $type, theme }) => palette($type, theme).fg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 3px solid ${({ $type, theme }) => palette($type, theme).accent};
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
  line-height: 1.4;
  font-weight: 500;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  min-width: 260px;
  max-width: 380px;
  animation: ${slideIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(8px);
`;

const Dot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  background: ${({ $type, theme }) => palette($type, theme).accent};
  flex-shrink: 0;
`;

export default function Toaster() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    return toast.subscribe((t) => {
      setItems((prev) => [...prev, t]);
      setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 3500);
    });
  }, []);

  return (
    <Stack role="region" aria-label="Notificaciones" aria-live="polite">
      {items.map((t) => (
        <Item key={t.id} $type={t.type} role={t.type === 'error' ? 'alert' : 'status'}>
          <Dot $type={t.type} aria-hidden="true" />
          <span>{t.message}</span>
        </Item>
      ))}
    </Stack>
  );
}
