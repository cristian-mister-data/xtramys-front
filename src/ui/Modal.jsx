import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${({ theme }) => theme.zIndex.modal};
  padding: 16px;
  overflow-y: auto;
`;

const Content = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  width: 100%;
  max-width: ${({ $width = 520 }) => `${$width}px`};
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadows.xl};
  overflow: hidden;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Title = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Close = styled.button`
  background: transparent;
  border: 0;
  font-size: 22px;
  line-height: 1;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const Body = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export default function Modal({ open, onClose, title, children, footer, width }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <Overlay onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <Content $width={width} role="dialog" aria-modal="true">
        {title && (
          <Header>
            <Title>{title}</Title>
            {onClose && <Close onClick={onClose} aria-label="Cerrar">×</Close>}
          </Header>
        )}
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Content>
    </Overlay>,
    document.body
  );
}
