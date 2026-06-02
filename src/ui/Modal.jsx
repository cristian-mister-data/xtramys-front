import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const pop = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.colors.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${({ theme }) => theme.zIndex.modal};
  padding: 16px;
  overflow-y: auto;
  /* Aseguramos que el overlay sea interactivo aunque algún ancestro
     (por ejemplo, un portal RN-web mal posicionado) tenga
     pointer-events: none. */
  pointer-events: auto;
  /* NOTA: backdrop-filter eliminado intencionadamente.
     Provoca un bug de pintado en Chromium/Edge cuando el elemento se
     monta vía createPortal: el modal se monta pero no se ve hasta que
     se dispara un repaint (por ejemplo un click), generando justo el
     síntoma "el modal no aparece hasta que pulso en cualquier sitio". */
  animation: ${fadeIn} 150ms ease-out;

  @media (max-width: 600px) {
    align-items: stretch;
    padding: 0;
  }
`;

const Content = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  width: 100%;
  max-width: ${({ $width = 520 }) => `${$width}px`};
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadows.xl};
  overflow: hidden;
  animation: ${pop} 180ms cubic-bezier(0.2, 0, 0, 1);

  @media (max-width: 600px) {
    max-width: 100%;
    min-height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    border-left: 0;
    border-right: 0;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  @media (max-width: 600px) {
    padding: 14px 16px;
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.3;
  flex: 1;
  min-width: 0;

  @media (max-width: 600px) {
    font-size: 16px;
  }
`;

const Close = styled.button`
  background: transparent;
  border: 0;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  line-height: 1;
  color: ${({ theme }) => theme.colors.textSecondary};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: background-color 120ms ease, color 120ms ease;

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
    color: ${({ theme }) => theme.colors.text};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadows.focus};
  }
`;

const Body = styled.div`
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  color: ${({ theme }) => theme.colors.text};
  min-width: 0;

  @media (max-width: 600px) {
    padding: 16px;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.backgroundAlt};

  @media (max-width: 600px) {
    padding: 12px 16px 16px;
    flex-wrap: wrap;

    > button,
    > a {
      flex: 1 1 140px;
      justify-content: center;
      min-width: 0;
    }
  }
`;

export default function Modal({ open, onClose, title, children, footer, width }) {
  const contentRef = useRef(null);
  const previouslyFocused = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === 'Escape' && onCloseRef.current) onCloseRef.current();
      if (e.key === 'Tab' && contentRef.current) {
        const focusables = contentRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foco inicial en el contenido
    requestAnimationFrame(() => {
      const focusables = contentRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const autoFocusEl = contentRef.current?.querySelector(
        '[autofocus]:not([disabled])'
      );
      if (autoFocusEl && typeof autoFocusEl.focus === 'function') {
        autoFocusEl.focus();
        return;
      }
      const firstInput = contentRef.current?.querySelector(
        'input:not([disabled]), textarea:not([disabled]), select:not([disabled])'
      );
      if (firstInput && typeof firstInput.focus === 'function') {
        firstInput.focus();
        return;
      }
      if (focusables && focusables.length > 0) focusables[0].focus();
      else contentRef.current?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      if (previouslyFocused.current && previouslyFocused.current.focus) {
        previouslyFocused.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <Overlay
      data-theme-aware="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <Content
        ref={contentRef}
        $width={width}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
      >
        {title && (
          <Header>
            <Title id="modal-title">{title}</Title>
            {onClose && (
              <Close onClick={onClose} aria-label="Cerrar diálogo">×</Close>
            )}
          </Header>
        )}
        <Body>{children}</Body>
        {footer && <Footer>{footer}</Footer>}
      </Content>
    </Overlay>,
    document.body
  );
}
