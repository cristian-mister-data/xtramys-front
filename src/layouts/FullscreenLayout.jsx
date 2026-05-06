import { Outlet } from 'react-router-dom';
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

export default function FullscreenLayout() {
  return (
    <Shell>
      <Inner>
        <Outlet />
      </Inner>
    </Shell>
  );
}
