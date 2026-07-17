import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

const Shell = styled.div`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  height: 100dvh;
  height: -webkit-fill-available;
  background: #4a8c3f;
  overflow: hidden;
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
