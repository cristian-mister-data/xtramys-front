import { Outlet, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const Shell = styled.div`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: #4a8c3f; /* same green as tactical board, avoids any flash */
  overflow: hidden;
  /* Provide a flex context so children with flex:1 fill correctly */
  display: flex;
`;

const Inner = styled.div`
  flex: 1;
  display: flex;
  min-width: 0;
  min-height: 0;
`;

const BackBtn = styled.button`
  position: fixed;
  bottom: 12px;
  right: 12px;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(4px);
  &:hover { background: rgba(0, 0, 0, 0.8); }
`;

export default function FullscreenLayout() {
  const navigate = useNavigate();
  return (
    <Shell>
      <Inner>
        <Outlet />
      </Inner>
      <BackBtn onClick={() => navigate(-1)} aria-label="Volver">← Volver</BackBtn>
    </Shell>
  );
}
