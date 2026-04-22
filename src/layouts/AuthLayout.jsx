import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

const Wrap = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  padding: 24px;
`;

const Card = styled.main`
  width: 100%;
  max-width: 480px;
`;

export default function AuthLayout() {
  return (
    <Wrap>
      <Card>
        <Outlet />
      </Card>
    </Wrap>
  );
}
