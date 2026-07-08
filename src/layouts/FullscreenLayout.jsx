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

  html[data-native="true"] & {
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
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
