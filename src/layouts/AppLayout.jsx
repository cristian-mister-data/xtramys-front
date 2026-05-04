import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Header from './Header';
import Sidebar from './Sidebar';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import { TutorialProvider } from '@/components/shared/TutorialProvider';

const Shell = styled.div`
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 60px 1fr;
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
  const seasonId = useSelector((s) => s.season.season?._id);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const requestedTeamsSeasonRef = useRef(null);

  // Cargar equipos de la temporada actual a nivel global.
  // Antes cada página lo hacía por su cuenta (training, injuries, home,
  // matchSheets, statistics, tacticalBoard, season), pero otras
  // (tournaments, players, rivals, anthropometry, wellness, methodology…)
  // no lo hacían y al recargar quedaban sin equipos. Centralizamos aquí
  // para que toda la app tenga el mismo comportamiento al refrescar.
  useEffect(() => {
    if (!seasonId) {
      requestedTeamsSeasonRef.current = null;
      return;
    }
    if (requestedTeamsSeasonRef.current === seasonId) return;

    requestedTeamsSeasonRef.current = seasonId;
    dispatch(fetchEquiposTemporada({ season: seasonId }));
  }, [dispatch, seasonId]);

  return (
    <TutorialProvider>
      <Shell>
        <Sidebar open={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <Header onMenu={() => setDrawerOpen((v) => !v)} />
        <Main>
          <Outlet />
        </Main>
      </Shell>
    </TutorialProvider>
  );
}
