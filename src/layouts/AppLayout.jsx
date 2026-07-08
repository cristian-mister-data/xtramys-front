import { Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MdVisibility, MdClose } from 'react-icons/md';
import Header from './Header';
import Sidebar from './Sidebar';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import { TutorialProvider } from '@/components/shared/TutorialProvider';
import XtramysCommunityInvite from '@/components/shared/XtramysCommunityInvite';
import { useTranslation } from 'react-i18next';

const Shell = styled.div`
  height: 100dvh;
  overflow: hidden;
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 60px 1fr;
  grid-template-areas:
    'sidebar header'
    'sidebar content';
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 1280px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      'header'
      'content';
    grid-template-rows: 56px 1fr;
  }
`;

const Main = styled.main`
  grid-area: content;
  padding: 24px;
  overflow: auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;

  @media (max-width: 1280px) {
    padding: 16px;
  }

  @media (max-width: 600px) {
    padding: 12px;
  }
`;

const SupervisionBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 16px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb'};
  border-bottom: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(245, 158, 11, 0.3)' : '#fde68a'};
  color: ${({ theme }) => theme.mode === 'dark' ? '#fbbf24' : '#92400e'};
  font-size: 13px;
  font-weight: 600;
  grid-column: 1 / -1;
  position: sticky;
  top: 0;
  z-index: 10;

  svg {
    flex-shrink: 0;
  }

  @media (max-width: 1280px) {
    font-size: 12px;
    padding: 6px 12px;
  }
`;

export default function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch();
  const seasonId = useSelector((s) => s.season.season?._id);
  const supervising = useSelector((s) => s.usuario.supervising);
  const supervisedUser = useSelector((s) => s.usuario.user);
  const userId = supervisedUser?._id || supervisedUser?.id || supervisedUser?.correo;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const requestedTeamsSeasonRef = useRef(null);
  const hideSearch = location.pathname.startsWith('/club/dashboard');

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
        <Header onMenu={() => setDrawerOpen((v) => !v)} hideSearch={hideSearch} />
        {supervising && !bannerDismissed && (
          <SupervisionBanner>
            <MdVisibility size={18} />
            <span>
              {t('supervision.supervising', 'Supervisando a')} <strong>{supervisedUser?.nombre || ''}</strong>
              {supervisedUser?.apellido ? ` ${supervisedUser.apellido}` : ''}
              {' — '}{t('supervision.readOnly', 'Modo solo lectura')}
            </span>
            <button
              onClick={() => setBannerDismissed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: 4,
                marginLeft: 8,
                opacity: 0.7,
              }}
              aria-label="Cerrar"
            >
              <MdClose size={16} />
            </button>
          </SupervisionBanner>
        )}
        <Main>
          <Outlet />
        </Main>
        <XtramysCommunityInvite userId={userId} />
      </Shell>
    </TutorialProvider>
  );
}
