import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

const Wrap = styled.div`
  min-height: 100dvh;
  width: 100%;
  overflow-y: auto;
  background: #f0f4f8;

  html[data-native="true"] & {
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
`;

export default function AuthLayout() {
  return (
    <Wrap>
      <Outlet />
    </Wrap>
  );
}
