import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  ('ontouchstart' in window && window.innerWidth < 1280);

const pulse = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(90deg); }
  50% { transform: rotate(90deg); }
  75% { transform: rotate(90deg); }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 32px;
`;

const IconWrap = styled.div`
  font-size: 64px;
  animation: ${pulse} 2s ease-in-out infinite;
  color: #fbbf24;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h2`
  color: #f1f5f9;
  font-size: 22px;
  font-weight: 700;
  text-align: center;
  margin: 0;
`;

const Subtitle = styled.p`
  color: #94a3b8;
  font-size: 15px;
  text-align: center;
  margin: 0;
  max-width: 280px;
  line-height: 1.5;
`;

const Hint = styled.p`
  color: #64748b;
  font-size: 13px;
  text-align: center;
  margin: 8px 0 0;
`;

export default function RotatePrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isMobileDevice()) {
      setShow(false);
      return;
    }

    const mq = window.matchMedia('(orientation: portrait)');

    const check = () => {
      setShow(mq.matches);
    };

    check();
    mq.addEventListener('change', check);
    window.addEventListener('resize', check);

    return () => {
      mq.removeEventListener('change', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  if (!show) return null;

  return (
    <Overlay>
      <IconWrap>
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2" transform="rotate(90 12 12)" />
          <line x1="12" y1="9" x2="12" y2="15" />
          <line x1="9" y1="12" x2="15" y2="12" />
        </svg>
      </IconWrap>
      <Title>Gira tu dispositivo</Title>
      <Subtitle>La pizarra táctica se ve mejor en horizontal</Subtitle>
      <Hint>Activa la rotación automática si está desactivada</Hint>
    </Overlay>
  );
}
