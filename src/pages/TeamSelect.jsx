import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { MdArrowForward, MdHistory, MdLockOutline, MdRefresh, MdShield } from 'react-icons/md';
import { fetchWorkspaces, selectWorkspace } from '@/store/slices/workspace/workspaceSlice';
import { RESET_WORKSPACE } from '@/store/actionTypes';

const Page = styled.main`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: max(24px, env(safe-area-inset-top)) 18px max(24px, env(safe-area-inset-bottom));
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;

const Shell = styled.section`
  width: min(920px, 100%);
`;

const Title = styled.h1`
  margin: 0 0 8px;
  font-size: clamp(26px, 5vw, 42px);
`;

const Subtitle = styled.p`
  margin: 0 0 26px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr));
  gap: 14px;
`;

const TeamButton = styled.button`
  min-height: 150px;
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-align: left;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
  &:hover, &:focus-visible {
    transform: translateY(-2px);
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.md};
    outline: none;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
  padding: 6px 9px;
  border-radius: 999px;
  background: ${({ $historical }) => $historical ? 'rgba(245,158,11,.13)' : 'rgba(59,130,246,.13)'};
  color: ${({ $historical }) => $historical ? '#d97706' : '#3b82f6'};
  font-size: 12px;
  font-weight: 700;
`;

const Empty = styled.div`
  padding: 26px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 14px;
  padding: 10px 14px;
  border: 0;
  border-radius: 10px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
`;

export default function TeamSelect() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectingId, setSelectingId] = useState(null);
  const autoSelecting = useRef(false);
  const { items, loading, loaded, error } = useSelector((state) => state.workspace);
  const user = useSelector((state) => state.usuario?.user);
  const supervising = useSelector((state) => state.usuario?.supervising);

  useEffect(() => {
    const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';
    const isClubAdminMode = user?.clubRole === 'admin' || (user?.role === 'club_admin' && user?.clubRole !== 'coach');
    if (supervising || isDemo) navigate('/app', { replace: true });
    else if (isClubAdminMode) navigate('/club/dashboard', { replace: true });
  }, [navigate, supervising, user?.clubRole, user?.role, user?.plan, user?.accessMode]);

  useEffect(() => {
    if (!loaded && !loading) dispatch(fetchWorkspaces());
  }, [dispatch, loaded, loading]);

  const choose = async (workspace) => {
    const teamId = workspace.team?._id;
    setSelectingId(teamId);
    try {
      await dispatch(selectWorkspace(workspace)).unwrap();
      dispatch({ type: RESET_WORKSPACE });
      const destination = location.state?.from?.pathname;
      navigate(destination && destination !== '/team-select' ? destination : '/app', { replace: true });
    } finally {
      setSelectingId(null);
    }
  };

  useEffect(() => {
    if (!loaded || loading || error || items.length !== 1 || selectingId || autoSelecting.current) return;
    autoSelecting.current = true;
    choose(items[0]);
  }, [loaded, loading, error, items, selectingId]);

  const singleWorkspaceRedirecting = loaded && items.length === 1;

  return (
    <Page>
      <Shell>
        {singleWorkspaceRedirecting ? <Empty>{t('workspace.openingTeam', 'Abriendo tu equipo…')}</Empty> : null}
        {!singleWorkspaceRedirecting ? (
          <>
        <Title>{t('workspace.selectTitle')}</Title>
        <Subtitle>{t('workspace.selectSubtitle')}</Subtitle>
        {error ? (
          <Empty>
            {t('workspace.loadError')}
            <div>
              <RetryButton type="button" onClick={() => dispatch(fetchWorkspaces({ force: true }))} disabled={loading}>
                <MdRefresh aria-hidden="true" />
                {t('workspace.retry')}
              </RetryButton>
            </div>
          </Empty>
        ) : null}
        {!error && loaded && items.length === 0 ? <Empty>{t('workspace.noTeams')}</Empty> : null}
        <Grid>
          {items.map((workspace) => {
            const team = workspace.team || {};
            const season = team.temporada?.año || team.temporada?.year || '';
            return (
              <TeamButton
                key={team._id}
                type="button"
                onClick={() => choose(workspace)}
                disabled={Boolean(selectingId)}
                aria-busy={selectingId === team._id}
              >
                <Row>
                  <MdShield size={30} aria-hidden="true" />
                  <MdArrowForward size={22} aria-hidden="true" />
                </Row>
                <h2 style={{ margin: '15px 0 5px', fontSize: 19 }}>{team.nombre}</h2>
                <div style={{ opacity: 0.68, fontSize: 13 }}>{workspace.club?.name}{season ? ` · ${season}` : ''}</div>
                <Badge $historical={workspace.historical}>
                  {workspace.historical ? <MdHistory /> : <MdLockOutline />}
                  {workspace.historical
                    ? t('workspace.historical')
                    : workspace.canWrite ? t('workspace.manage') : t('workspace.view')}
                </Badge>
              </TeamButton>
            );
          })}
        </Grid>
          </>
        ) : null}
      </Shell>
    </Page>
  );
}
