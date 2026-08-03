import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MdClose, MdDescription, MdHome, MdLock, MdPeople, MdPerson, MdShield, MdTimer, MdVisibility } from 'react-icons/md';
import Header from './Header';
import Sidebar from './Sidebar';
import { fetchEquiposTemporada } from '@/store/slices/team/teamThunks';
import { TutorialProvider } from '@/components/shared/TutorialProvider';
import XtramysCommunityInvite from '@/components/shared/XtramysCommunityInvite';
import { useTranslation } from 'react-i18next';
import { isSeasonReadOnly } from '@/hooks/useSupervision';
import { App as CapacitorApp } from '@capacitor/app';
import { isAppleCalendarAvailable, syncConnectedAppleCalendar } from '@/platform/appleCalendar';

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

  @media (max-width: 700px) {
    grid-template-areas:
      'header'
      'content';
    grid-template-rows: 56px minmax(0, 1fr);
  }

  html[data-native="true"] & {
    grid-template-areas:
      'header'
      'content';
    grid-template-rows: 56px minmax(0, 1fr);
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
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

  @media (max-width: 700px) {
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }

  html[data-native="true"] & {
    padding-bottom: 16px;
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

const BottomNav = styled.nav`
  grid-area: bottom;
  display: none;
  grid-template-columns: repeat(${({ $count }) => $count || 5}, minmax(0, 1fr));
  gap: 2px;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom, 0px));
  background: ${({ theme }) => theme.colors.headerBg};
  border-top: 1px solid ${({ theme }) => theme.colors.headerBorder};
  z-index: ${({ theme }) => theme.zIndex.sticky};

  @media (max-width: 700px) {
    display: none !important;
  }

  html[data-native="true"] & {
    display: none !important;
  }
`;

const BottomItem = styled(NavLink)`
  min-width: 0;
  min-height: 54px;
  border-radius: ${({ theme }) => theme.radius.md};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;

  svg {
    width: 22px;
    height: 22px;
  }

  &.active {
    color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primarySoft};
  }
`;

export default function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch();
  const season = useSelector((s) => s.season.season);
  const seasonId = season?._id;
  const supervising = useSelector((s) => s.usuario.supervising);
  const supervisedUser = useSelector((s) => s.usuario.user);
  const archivedSeason = isSeasonReadOnly(season, supervisedUser);
  const userId = supervisedUser?._id || supervisedUser?.id || supervisedUser?.correo;
  const isClubAdmin = supervisedUser?.role === 'club_admin';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const requestedTeamsSeasonRef = useRef(null);
  const hideSearch = location.pathname.startsWith('/club/dashboard');
  const bottomItems = isClubAdmin
    ? [
        { to: '/club/dashboard', label: t('menu.myClub', 'Mi Club'), Icon: MdShield },
        { to: '/profile', label: t('menu.profile', 'Perfil'), Icon: MdPerson },
      ]
    : [
        { to: '/app', label: t('menu.home', 'Inicio'), Icon: MdHome },
        { to: '/players', label: t('menu.players', 'Jugadores'), Icon: MdPeople },
        { to: '/training', label: t('menu.training', 'Entrenos'), Icon: MdTimer },
        { to: '/match-sheets', label: t('menu.matchSheetsShort', 'Partidos'), Icon: MdDescription },
        { to: '/profile', label: t('menu.profile', 'Perfil'), Icon: MdPerson },
      ];

  useEffect(() => setBannerDismissed(false), [seasonId, supervising]);

  useEffect(() => {
    if (!isAppleCalendarAvailable) return undefined;
    const sync = () => syncConnectedAppleCalendar().catch(() => {});
    sync();
    const listener = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) sync();
    });
    const interval = window.setInterval(sync, 5 * 60 * 1000);
    return () => {
      window.clearInterval(interval);
      listener.then((handle) => handle.remove());
    };
  }, []);

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
        {(supervising || archivedSeason) && !bannerDismissed && (
          <SupervisionBanner role="status">
            {supervising ? <MdVisibility size={18} /> : <MdLock size={18} />}
            <span>
              {supervising ? (
                <>
                  {t('supervision.supervising', 'Supervisando a')} <strong>{supervisedUser?.nombre || ''}</strong>
                  {supervisedUser?.apellido ? ` ${supervisedUser.apellido}` : ''}
                  {' — '}{t('supervision.readOnly', 'Modo solo lectura')}
                </>
              ) : t('season.archivedReadOnly', 'Temporada anterior · Solo lectura. Puedes consultar los datos, pero no crear, editar ni eliminar nada.')}
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
              aria-label={t('common.close', 'Cerrar')}
            >
              <MdClose size={16} />
            </button>
          </SupervisionBanner>
        )}
        <Main>
          <Outlet />
        </Main>
        <BottomNav $count={bottomItems.length} aria-label={t('common.mobileNavigation', 'Navegación móvil')}>
          {bottomItems.map(({ to, label, Icon }) => (
            <BottomItem key={to} to={to}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </BottomItem>
          ))}
        </BottomNav>
        <XtramysCommunityInvite userId={userId} />
      </Shell>
    </TutorialProvider>
  );
}
