import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from './Header';
import Sidebar from './Sidebar';
import { fetchTemporadasUsuario } from '@/store/slices/season/seasonThunks';

const Shell = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'sidebar header'
    'sidebar content';
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      'header'
      'content';
  }
`;

const Main = styled.main`
  grid-area: content;
  padding: 24px;
  overflow: auto;
  min-width: 0;
`;

export default function AppLayout() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.usuario.user);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (user?._id) {
      dispatch(fetchTemporadasUsuario({ usuario: user._id }));
    }
  }, [dispatch, user?._id]);

  return (
    <Shell>
      <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <Header onMenu={() => setDrawerOpen((v) => !v)} />
      <Main>
        <Outlet />
      </Main>
    </Shell>
  );
}
