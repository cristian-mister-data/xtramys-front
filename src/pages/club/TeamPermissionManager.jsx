import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdChevronRight, MdDeleteOutline, MdEdit, MdGroups, MdOutlineShield, MdPerson, MdSportsSoccer } from 'react-icons/md';
import styled from 'styled-components';
import api from '@/api/client';
import Modal from '@/ui/Modal';
import { Button, Card, Field, Input, Label, Muted } from '@/ui/primitives';
import { toast } from '@/ui/toast';

const Header = styled.div`
  display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; flex-wrap: wrap;
  min-width: 0;
`;
const HeaderCopy = styled.div`
  display: grid; gap: 8px;
`;
const Eyebrow = styled.div`
  display: inline-flex; align-items: center; gap: 8px; width: fit-content;
  padding: 7px 12px; border-radius: 999px; border: 1px solid ${({ theme }) => theme.colors.border};
  background:
    linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.01)),
    ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.primary}; font-size: 11px; font-weight: 900; letter-spacing: .08em;
  text-transform: uppercase;
`;
const HeaderTitle = styled.h2`
  margin: 0; font-size: clamp(24px, 3vw, 30px); line-height: 1.05; letter-spacing: -.03em;
`;
const HeaderSubtitle = styled(Muted)`
  max-width: 780px; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere;
`;
const HeaderControls = styled.div`
  display: grid; gap: 10px; width: min(100%, 300px); min-width: 0;
  @media (max-width: 760px) { width: 100%; }
`;
const LicensePill = styled.div`
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 42px; padding: 9px 16px; border-radius: 999px;
  background:
    radial-gradient(circle at top, rgba(59,130,246,.18), transparent 62%),
    ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid rgba(96,165,250,.28); font-size: 13px; font-weight: 900;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
`;
const CreatePanel = styled.div`
  margin-top: clamp(18px, 3vw, 26px); padding: clamp(14px, 3vw, 20px); border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015)),
    ${({ theme }) => theme.colors.backgroundAlt};
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
`;
const Form = styled.form`
  display: grid; grid-template-columns: minmax(180px, 1fr) minmax(150px, .65fr) auto;
  gap: 14px; align-items: end;
  & > * { min-width: 0; }
  & > div { margin-bottom: 0; }
  @media (max-width: 820px) { grid-template-columns: minmax(0, 1fr) minmax(150px, .7fr); }
  @media (max-width: 560px) { grid-template-columns: 1fr; }
`;
const SubmitWrap = styled.div`
  display: flex; align-items: flex-end; justify-content: flex-end;
  button { min-width: 150px; height: 46px; }
  @media (max-width: 820px) {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }
  @media (max-width: 560px) {
    grid-column: auto;
    justify-content: stretch;
    button { width: 100%; }
  }
`;
const SectionTitle = styled.div`
  display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin: clamp(20px, 4vw, 28px) 0 14px; font-size: 15px; font-weight: 900;
  letter-spacing: -.01em;
`;
const TopNav = styled.div`
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px;
  padding: 6px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015)),
    ${({ theme }) => theme.colors.backgroundAlt};
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
`;
const TopNavButton = styled.button`
  min-height: 44px; padding: 0 16px; border: 0; border-radius: 12px; cursor: pointer; font: inherit;
  font-size: 13px; font-weight: 800; color: ${({ theme, $active }) => $active ? theme.colors.surface : theme.colors.text};
  background: ${({ theme, $active }) => $active ? `linear-gradient(135deg, ${theme.colors.primary}, #2563eb)` : 'transparent'};
  box-shadow: ${({ $active }) => $active ? '0 10px 30px rgba(37,99,235,.24)' : 'none'};
`;
const Members = styled.div`display: grid; gap: 12px;`;
const Teams = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: clamp(10px, 2vw, 16px);
`;
const PanelCard = styled(Card)`
  width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; overflow: hidden;
  padding: clamp(14px, 3vw, 26px) !important;
  margin-bottom: 24px;
  border-radius: clamp(16px, 3vw, 24px);
  background: linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.01));
  box-shadow: 0 24px 60px rgba(2,6,23,.18);
  border: 1px solid rgba(96,165,250,.14);
`;
const TeamCard = styled.section`
  min-width: 0; border: 1px solid ${({ theme, $open }) => $open ? theme.colors.primary : theme.colors.border};
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.01)),
    ${({ theme }) => theme.colors.surface};
  overflow: hidden;
  box-shadow: ${({ $open }) => $open ? '0 18px 48px rgba(0,0,0,.18)' : '0 8px 24px rgba(0,0,0,.08)'};
`;
const TeamSummary = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: 16px; padding: clamp(14px, 3vw, 20px);
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`;
const TeamIdentity = styled.div`
  min-width: 0; display: grid; gap: 9px;
`;
const TeamName = styled.strong`
  display: block; max-width: 100%; overflow-wrap: anywhere; word-break: break-word;
  font-size: 21px; line-height: 1.16; letter-spacing: -.03em;
`;
const TeamMeta = styled.div`
  display: flex; flex-wrap: wrap; gap: 7px;
`;
const MetaChip = styled.span`
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 9px; border-radius: 999px;
  color: ${({ theme }) => theme.colors.muted}; background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border}; font-size: 11px; font-weight: 800;
`;
const TeamActions = styled.div`
  display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-start; width: 100%;
  max-width: 100%;
  & > * { flex: 0 1 auto; min-width: 0; }
  @media (max-width: 640px) { justify-content: stretch; > * { flex: 1 1 0; } }
`;
const MemberCard = styled.section`
  overflow: hidden; border: 1px solid ${({ theme, $open }) => $open ? theme.colors.primary : theme.colors.border};
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.025), rgba(255,255,255,.01)),
    ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ $open }) => $open ? '0 18px 48px rgba(0,0,0,.18)' : '0 8px 24px rgba(0,0,0,.08)'};
`;
const MemberSummary = styled.div`
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center;
  gap: 14px; padding: clamp(14px, 3vw, 18px);
  @media (max-width: 860px) { grid-template-columns: auto minmax(0, 1fr) auto; & > button { grid-column: 1 / -1; width: 100%; } }
`;
const Avatar = styled.div`
  width: 48px; height: 48px; display: grid; place-items: center; border-radius: 16px;
  background:
    radial-gradient(circle at top, rgba(96,165,250,.25), transparent 70%),
    linear-gradient(145deg, ${({ theme }) => theme.colors.primary}22, ${({ theme }) => theme.colors.primary}40);
  color: ${({ theme }) => theme.colors.primary}; font-weight: 900; font-size: 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
`;
const ManageButton = styled.button`
  display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px;
  min-width: 0; padding: 0 14px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,.015)),
    ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  font: inherit; font-size: 13px; font-weight: 800; cursor: pointer;
  white-space: normal; text-align: center; overflow-wrap: anywhere;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
  &:hover, &:focus-visible {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 10px 22px rgba(37,99,235,.14);
    transform: translateY(-1px);
    outline: none;
  }
`;
const PermissionsPanel = styled.div`
  padding: clamp(14px, 3vw, 22px); border-top: 1px solid ${({ theme }) => theme.colors.border};
  background:
    linear-gradient(180deg, rgba(2,6,23,.08), rgba(255,255,255,.01)),
    ${({ theme }) => theme.colors.backgroundAlt};
`;
const TeamPanel = styled(PermissionsPanel)`
  display: grid; gap: 16px; padding: clamp(14px, 3vw, 20px);
`;
const PanelTitle = styled.div`
  display: flex; align-items: center; gap: 9px; font-size: 13px; font-weight: 900;
  color: ${({ theme }) => theme.colors.text};
`;
const EditGrid = styled.div`
  display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(150px, .6fr); gap: 12px;
  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;
const DangerButton = styled(Button)`
  background: transparent !important; color: #f87171 !important; border: 1px solid rgba(248,113,113,.35) !important;
  &:hover { background: rgba(248,113,113,.1) !important; border-color: #f87171 !important; }
`;
const ConfirmCopy = styled.div`
  display: grid; gap: 8px; line-height: 1.55;
  strong { overflow-wrap: anywhere; }
`;
const TeamGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 10px; margin-top: 12px;
`;
const TeamRow = styled.div`
  display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start;
  gap: 12px 14px; padding: 14px; border: 1px solid ${({ theme }) => theme.colors.border}; border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.01)),
    ${({ theme }) => theme.colors.surface};
  transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease;
  &:hover { border-color: rgba(96,165,250,.28); box-shadow: 0 12px 26px rgba(0,0,0,.14); transform: translateY(-1px); }
  input { width: 18px; height: 18px; accent-color: ${({ theme }) => theme.colors.primary}; }
`;
const TeamRowBody = styled.div`
  min-width: 0; display: grid; gap: 4px;
`;
const TeamRowName = styled.strong`
  display: block; overflow-wrap: anywhere; word-break: break-word;
  font-size: 15px; line-height: 1.25; letter-spacing: -.02em;
`;
const PermissionField = styled.div`
  grid-column: 1 / -1; min-width: 0; width: 100%;
`;
const Select = styled.select`
  width: 100%; min-width: 0; min-height: 46px; padding: 10px 42px 10px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.02)),
    ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font: inherit; font-size: 13px; font-weight: 800; line-height: 1.2;
  color-scheme: ${({ theme }) => theme.mode};
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, currentColor 50%),
    linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% - 3px),
    calc(100% - 12px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
  transition: border-color .18s ease, box-shadow .18s ease;
  option {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.surfaceElevated || theme.colors.surface};
  }
  &:hover, &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px rgba(37,99,235,.14);
    outline: none;
  }
  &:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
`;

export default function TeamPermissionManager({ data, onRefresh }) {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState('accounts');
  const [name, setName] = useState('');
  const [seasonId, setSeasonId] = useState('');
  const [openMemberId, setOpenMemberId] = useState('');
  const [openTeamId, setOpenTeamId] = useState('');
  const [editingTeamId, setEditingTeamId] = useState('');
  const [editingTeamName, setEditingTeamName] = useState('');
  const [confirmTeam, setConfirmTeam] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  // El gestor solo debe mostrar equipos con licencia activa. Los registros
  // desactivados se conservan para histórico, pero no forman parte de los
  // equipos operativos ni deben duplicar las opciones de permisos.
  const teams = useMemo(
    () => (data?.teams || []).filter((team) => team.licenseActive !== false),
    [data?.teams],
  );
  const members = data?.members || [];
  const accesses = data?.accesses || [];
  const maxTeams = data?.club?.maxTeams ?? data?.club?.maxUsers ?? 0;
  const activeTeams = teams.filter((team) => team.licenseActive !== false).length;
  const activeTeamIds = useMemo(() => new Set(teams.map((team) => String(team._id))), [teams]);
  const atLimit = maxTeams > 0 && activeTeams >= maxTeams;
  const seasons = useMemo(() => [...new Map(
    (data?.seasons?.length ? data.seasons : teams.map((team) => team.temporada))
      .filter(Boolean).map((season) => [String(season._id || season), season]),
  ).values()], [data?.seasons, teams]);

  useEffect(() => {
    if (!seasons.length) return setSeasonId('');
    if (!seasons.some((season) => String(season._id || season) === String(seasonId))) {
      setSeasonId(String(seasons[0]._id || seasons[0]));
    }
  }, [seasonId, seasons]);

  const accessFor = (teamId, userId) => accesses.find((access) =>
    String(access.teamId) === String(teamId) && String(access.userId) === String(userId));

  const createTeam = async (event) => {
    event.preventDefault();
    if (!name.trim() || !seasonId || atLimit) return;
    setSaving(true);
    try {
      await api.post('/club/teams', { nombre: name.trim(), temporada: seasonId, categoriaKey: 'otro' });
      setName('');
      toast.success(t('clubTeamManager.created'));
      await onRefresh();
    } catch (error) {
      toast.error(error.message || t('clubTeamManager.createError'));
    } finally { setSaving(false); }
  };

  const changeAccess = async (team, member, permission) => {
    const key = `${team._id}:${member._id}`;
    setBusyKey(key);
    try {
      const existing = accessFor(team._id, member._id);
      if (permission === 'none') {
        if (existing) await api.delete(`/club/team-access/${team._id}/${member._id}`);
      } else {
        await api.put('/club/team-access', { teamId: team._id, userId: member._id, permission });
      }
      toast.success(t('clubTeamManager.permissionSaved'));
      await onRefresh();
    } catch (error) {
      toast.error(error.message || t('clubTeamManager.permissionError'));
    } finally { setBusyKey(''); }
  };

  const startEditingTeam = (team) => {
    setOpenTeamId(String(team._id));
    setEditingTeamId(String(team._id));
    setEditingTeamName(team.nombre || '');
  };

  const saveTeam = async (team) => {
    const trimmed = editingTeamName.trim();
    if (!trimmed) return;
    const key = `team:${team._id}`;
    setBusyKey(key);
    try {
      await api.put(`/club/teams/${team._id}`, { nombre: trimmed, temporada: team.temporada?._id || team.temporada });
      toast.success(t('clubTeamManager.teamUpdated'));
      setEditingTeamId('');
      setEditingTeamName('');
      await onRefresh();
    } catch (error) {
      toast.error(error.message || t('clubTeamManager.teamUpdateError'));
    } finally {
      setBusyKey('');
    }
  };

  const deleteTeam = async (team) => {
    const key = `delete:${team._id}`;
    setBusyKey(key);
    try {
      await api.delete(`/club/teams/${team._id}`);
      toast.success(t('clubTeamManager.teamDeleted'));
      setConfirmTeam(null);
      if (openTeamId === String(team._id)) setOpenTeamId('');
      await onRefresh();
    } catch (error) {
      toast.error(error.message || t('clubTeamManager.teamDeleteError'));
    } finally {
      setBusyKey('');
    }
  };

  return (
    <PanelCard>
      <Header>
        <HeaderCopy>
          <Eyebrow><MdOutlineShield size={14} />{t('clubTeamManager.eyebrow')}</Eyebrow>
          <HeaderTitle>{t('clubTeamManager.title')}</HeaderTitle>
          <HeaderSubtitle>{t('clubTeamManager.userSubtitle')}</HeaderSubtitle>
        </HeaderCopy>
        <HeaderControls>
          <LicensePill>{t('clubTeamManager.licenseCount', { used: activeTeams, total: maxTeams })}</LicensePill>
          <TopNav>
            <TopNavButton type="button" $active={activeView === 'accounts'} onClick={() => setActiveView('accounts')}>{t('clubTeamManager.accountsTitle')}</TopNavButton>
            <TopNavButton type="button" $active={activeView === 'teams'} onClick={() => setActiveView('teams')}>{t('clubTeamManager.teamsTitle')}</TopNavButton>
          </TopNav>
        </HeaderControls>
      </Header>

      {activeView === 'teams' ? (
        <CreatePanel>
          {atLimit ? (
            <Muted>{t('clubTeamManager.limitReached')}</Muted>
          ) : (
            <Form onSubmit={createTeam}>
              <Field><Label>{t('clubTeamManager.teamName')}</Label><Input placeholder={t('clubTeamManager.teamName')} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /></Field>
              <Field><Label>{t('clubTeamManager.season')}</Label><Select value={seasonId} onChange={(event) => setSeasonId(event.target.value)}>{seasons.map((season) => <option key={season._id || season} value={season._id || season}>{season.año || season.year}</option>)}</Select></Field>
              <SubmitWrap>
                <Button type="submit" disabled={saving || !name.trim() || !seasons.length}>{saving ? t('common.saving') : t('clubTeamManager.createTeam')}</Button>
              </SubmitWrap>
            </Form>
          )}
          {!seasons.length ? <Muted style={{ display: 'block', marginTop: 10 }}>{t('clubTeamManager.createSeasonFirst')}</Muted> : null}
        </CreatePanel>
      ) : null}

      {activeView === 'accounts' ? (
        <>
          <SectionTitle><MdGroups size={20} />{t('clubTeamManager.accountsTitle')}</SectionTitle>
          <Members>
            {members.map((member) => {
              const isOpen = openMemberId === String(member._id);
              const teamCount = accesses.filter((access) =>
                String(access.userId) === String(member._id) && activeTeamIds.has(String(access.teamId))
              ).length;
              const displayName = `${member.nombre || ''} ${member.apellido || ''}`.trim() || member.correo;
              const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
              return (
                <MemberCard key={member._id} $open={isOpen}>
                  <MemberSummary>
                    <Avatar>{initials || <MdPerson />}</Avatar>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 18, letterSpacing: '-.02em' }}>{displayName}</strong>
                      <Muted style={{ display: 'block', fontSize: 12, marginTop: 2 }}>{member.correo}</Muted>
                      <Muted style={{ display: 'block', fontSize: 11, marginTop: 4 }}>{t('clubTeamManager.assignedTeams', { count: teamCount })}</Muted>
                    </div>
                    <ManageButton type="button" aria-expanded={isOpen} onClick={() => setOpenMemberId(isOpen ? '' : String(member._id))}>
                      <MdOutlineShield size={18} />{isOpen ? t('clubTeamManager.closePermissions') : t('clubTeamManager.managePermissions')}<MdChevronRight style={{ transform: isOpen ? 'rotate(90deg)' : 'none' }} />
                    </ManageButton>
                  </MemberSummary>

                  {isOpen ? (
                    <PermissionsPanel>
                      <Label style={{ display: 'block' }}>{t('clubTeamManager.chooseTeamsForUser')}</Label>
                      <TeamGrid>
                        {teams.map((team) => {
                          const permission = accessFor(team._id, member._id)?.permission || 'none';
                          const key = `${team._id}:${member._id}`;
                          return (
                            <TeamRow key={team._id}>
                              <input type="checkbox" checked={permission !== 'none'} onChange={(event) => changeAccess(team, member, event.target.checked ? 'view' : 'none')} disabled={busyKey === key || team.licenseActive === false} aria-label={team.nombre} />
                              <TeamRowBody>
                                <TeamRowName title={team.nombre}>{team.nombre}</TeamRowName>
                                <Muted style={{ fontSize: 11 }}>{team.temporada?.año || ''}</Muted>
                              </TeamRowBody>
                              <PermissionField>
                                <Select aria-label={t('clubTeamManager.permissionFor', { name: team.nombre })} value={permission === 'none' ? 'view' : permission} disabled={permission === 'none' || busyKey === key || team.licenseActive === false} onChange={(event) => changeAccess(team, member, event.target.value)}>
                                  <option value="view">{t('workspace.view')}</option>
                                  <option value="manage">{t('workspace.manage')}</option>
                                </Select>
                              </PermissionField>
                            </TeamRow>
                          );
                        })}
                      </TeamGrid>
                    </PermissionsPanel>
                  ) : null}
                </MemberCard>
              );
            })}
            {!members.length ? <Muted>{t('clubTeamManager.noMembers')}</Muted> : null}
          </Members>
        </>
      ) : (
        <>
          <SectionTitle><MdSportsSoccer size={20} />{t('clubTeamManager.teamsTitle')} <Muted style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600 }}>{t('clubTeamManager.teamCount', { count: teams.length })}</Muted></SectionTitle>
          <Teams>
            {teams.map((team) => {
              const isOpen = openTeamId === String(team._id);
              const isEditing = editingTeamId === String(team._id);
              const assignedUsers = accesses.filter((access) => String(access.teamId) === String(team._id)).length;
              return (
                <TeamCard key={team._id} $open={isOpen}>
                  <TeamSummary>
                    <TeamIdentity>
                      <TeamName title={team.nombre}>{team.nombre}</TeamName>
                      <TeamMeta>
                        <MetaChip><MdOutlineShield size={14} />{team.temporada?.año || '—'}</MetaChip>
                        <MetaChip><MdGroups size={14} />{t('clubTeamManager.teamUsersCount', { count: assignedUsers })}</MetaChip>
                      </TeamMeta>
                    </TeamIdentity>
                    <TeamActions>
                      <ManageButton type="button" onClick={() => isEditing ? setEditingTeamId('') : startEditingTeam(team)}>
                        <MdEdit size={18} />{isEditing ? t('edition.cancel') : t('edition.edit')}
                      </ManageButton>
                      <ManageButton type="button" onClick={() => setOpenTeamId(isOpen ? '' : String(team._id))}>
                        <MdChevronRight size={18} style={{ transform: isOpen ? 'rotate(90deg)' : 'none', flexShrink: 0 }} />{t('clubTeamManager.manageTeam')}
                      </ManageButton>
                    </TeamActions>
                  </TeamSummary>

                  {isOpen ? (
                    <TeamPanel>
                      <PanelTitle><MdEdit size={17} />{isEditing ? t('edition.edit') : t('clubTeamManager.manageTeam')}</PanelTitle>
                      <EditGrid>
                        <Field>
                          <Label>{t('clubTeamManager.teamName')}</Label>
                          <Input value={isEditing ? editingTeamName : team.nombre} disabled={!isEditing || busyKey === `team:${team._id}`} onChange={(event) => setEditingTeamName(event.target.value)} maxLength={120} />
                        </Field>
                        <Field>
                          <Label>{t('clubTeamManager.season')}</Label>
                          <Input value={team.temporada?.año || ''} disabled />
                        </Field>
                      </EditGrid>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {isEditing ? (
                          <Button type="button" disabled={busyKey === `team:${team._id}` || !editingTeamName.trim()} onClick={() => saveTeam(team)}>
                            {busyKey === `team:${team._id}` ? t('common.saving') : t('edition.save')}
                          </Button>
                        ) : null}
                        <DangerButton
                          type="button"
                          disabled={busyKey === `delete:${team._id}`}
                          onClick={() => setConfirmTeam(team)}
                          style={{ background: '#dc2626', borderColor: '#dc2626' }}
                        >
                          <MdDeleteOutline size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                          {busyKey === `delete:${team._id}` ? t('common.saving') : t('edition.delete')}
                        </DangerButton>
                      </div>
                      <Muted>{t('clubTeamManager.teamDeleteHint')}</Muted>
                    </TeamPanel>
                  ) : null}
                </TeamCard>
              );
            })}
          </Teams>
        </>
      )}

      <Modal
        open={Boolean(confirmTeam)}
        onClose={() => (confirmTeam && busyKey === `delete:${confirmTeam._id}` ? null : setConfirmTeam(null))}
        title={t('clubTeamManager.deleteTeamTitle', 'Eliminar equipo')}
        footer={(
          <>
            <Button type="button" $variant="secondary" onClick={() => setConfirmTeam(null)} disabled={Boolean(busyKey)}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button type="button" $variant="danger" onClick={() => confirmTeam && deleteTeam(confirmTeam)} disabled={!confirmTeam || busyKey === `delete:${confirmTeam?._id}`}>
              {busyKey === `delete:${confirmTeam?._id}` ? t('common.saving') : t('edition.delete')}
            </Button>
          </>
        )}
      >
        <ConfirmCopy>
          <span>{t('clubTeamManager.deleteTeamConfirm', { name: confirmTeam?.nombre || '' })}</span>
          <Muted>{t('clubTeamManager.teamDeleteHint')}</Muted>
        </ConfirmCopy>
      </Modal>
    </PanelCard>
  );
}
