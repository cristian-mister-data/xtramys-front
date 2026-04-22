import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { toast } from './toast';

const slide = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Stack = styled.div`
  position: fixed;
  top: 16px;
  right: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: ${({ theme }) => theme.zIndex.toast};
`;

const Item = styled.div`
  background: ${({ $type, theme }) =>
    $type === 'error' ? theme.colors.error
    : $type === 'success' ? theme.colors.success
    : theme.colors.info};
  color: #fff;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
  box-shadow: ${({ theme }) => theme.shadows.lg};
  min-width: 240px;
  max-width: 360px;
  animation: ${slide} 0.18s ease-out;
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
    <Stack>
      {items.map((t) => (
        <Item key={t.id} $type={t.type}>{t.message}</Item>
      ))}
    </Stack>
  );
}
