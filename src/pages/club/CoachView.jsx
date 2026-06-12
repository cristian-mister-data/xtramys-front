import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  MdArrowBack, MdLock, MdHome, MdCalendarMonth, MdEmojiEvents, MdPeople,
  MdMap, MdSportsSoccer, MdFitnessCenter, MdOutlineAssignment, MdVideoLibrary,
  MdLibraryBooks, MdSportsHandball, MdTimer, MdFavorite, MdShield, MdDescription,
  MdMedicalServices, MdAnalytics, MdAccessibility, MdBarChart, MdRestaurant,
  MdHealthAndSafety, MdPerson, MdInfo, MdMenu, MdClose, MdChevronRight,
  MdStar, MdCalendarToday, MdSchedule, MdLocationOn, MdFlag, MdGroup,
  MdEmail, MdPhone, MdMale, MdFemale, MdScore, MdDateRange, MdCategory,
  MdMenuBook, MdPlayArrow, MdImage, MdCheckCircle, MdCancel, MdWarning,
} from 'react-icons/md';
import api from '@/api/client';
import { Card, Button, Row, Stack, Badge, Muted, PageHeader, PageTitle } from '@/ui/primitives';
import { toast } from '@/ui/toast';

const Layout = styled.div`
  display: flex;
  gap: 24px;
  align-items: flex-start;

  @media (max-width: 900px) {
    flex-direction: column;
    gap: 0;
  }
`;

const Sidebar = styled.aside`
  width: 240px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  overflow: hidden;
  position: sticky;
  top: 24px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;

  @media (max-width: 900px) {
    display: ${({ $open }) => $open ? 'block' : 'none'};
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: 100;
    max-height: 100vh;
    border-radius: 0;
    width: 100%;
    padding-top: 60px;
  }
`;

const SidebarBackdrop = styled.div`
  @media (max-width: 900px) {
    display: ${({ $open }) => $open ? 'block' : 'none'};
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 99;
  }
`;

const SidebarGroup = styled.div`
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const SidebarGroupTitle = styled.div`
  padding: 12px 16px 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const SidebarItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 16px;
  background: ${({ $active, theme }) => $active ? theme.colors.primarySoft : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.text};
  border: none;
  border-left: 3px solid ${({ $active, theme }) => $active ? theme.colors.primary : 'transparent'};
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }

  svg {
    flex-shrink: 0;
  }
`;

const MainContent = styled.main`
  flex: 1;
  min-width: 0;
`;

const Page = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 12px; }
  @media (max-width: 480px) { padding: 8px; }
`;

const TopAlert = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2'};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(239, 68, 68, 0.3)' : '#fca5a5'};
  color: ${({ theme }) => theme.mode === 'dark' ? '#fca5a5' : '#b91c1c'};
  padding: 14px 18px;
  border-radius: 12px;
  margin-bottom: 20px;
  font-size: 14px;
  line-height: 1.4;

  @media (max-width: 480px) { padding: 10px 12px; font-size: 12px; margin-bottom: 14px; }
`;

const ProfileHeaderCard = styled(Card)`
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.02)'};

  @media (max-width: 480px) { padding: 16px; gap: 14px; }
`;

const BigAvatar = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 22px;
  background-image: ${({ src }) => src ? `url(${src})` : 'none'};
  background-size: cover;
  background-position: center;
  border: 3px solid ${({ theme }) => theme.colors.border};
  flex-shrink: 0;

  @media (max-width: 480px) { width: 52px; height: 52px; font-size: 18px; }
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;

  @media (max-width: 900px) { margin-bottom: 12px; }
`;

const MobileMenuButton = styled(Button)`
  display: none;

  @media (max-width: 900px) {
    display: inline-flex;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  margin-bottom: 20px;

  @media (max-width: 720px) { padding: 12px 14px; gap: 10px; margin-bottom: 14px; }
`;

const SectionIconBox = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primarySoftText};
  flex-shrink: 0;

  svg { width: 22px; height: 22px; }

  @media (max-width: 720px) { width: 32px; height: 32px; svg { width: 18px; height: 18px; } }
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};

  @media (max-width: 720px) { font-size: 16px; }
`;

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;

  @media (max-width: 480px) { grid-template-columns: 1fr; gap: 12px; }
`;

const DataCard = styled(Card)`
  padding: 18px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: box-shadow 0.2s;
  cursor: default;

  &:hover {
    box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.06)'};
  }

  @media (max-width: 480px) { padding: 14px; }
`;

const CardTitle = styled.h4`
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

const CardText = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.5;
`;

const CardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.textSecondary};

  svg { flex-shrink: 0; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 24px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 16px;
  color: ${({ theme }) => theme.colors.textSecondary};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  @media (max-width: 480px) { padding: 40px 16px; }
`;

const PlayerAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
  background-image: ${({ $src }) => $src ? `url(${$src})` : 'none'};
  background-size: cover;
  background-position: center;
`;

const PlayerCard = styled(DataCard)`
  flex-direction: row;
  align-items: center;
  gap: 14px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 8px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: 8px;
  font-size: 13px;

  svg { color: ${({ theme }) => theme.colors.primary}; flex-shrink: 0; }
`;

const Thumb = styled.div`
  width: 100%;
  height: 140px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};

  img { width: 100%; height: 100%; object-fit: cover; }
  svg { opacity: 0.2; }
`;

const TagRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  th, td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  th {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.textSecondary};
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  tr:hover td {
    background: ${({ theme }) => theme.colors.backgroundAlt};
  }

  @media (max-width: 600px) {
    font-size: 12px;
    th, td { padding: 8px 8px; }
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Loading = () => (
  <div style={{ textAlign: 'center', padding: 60 }}>
    <Muted>Cargando...</Muted>
  </div>
);

const initials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const NAV_SECTIONS = [
  {
    title: '',
    items: [
      { key: 'dashboard', icon: MdHome, label: 'Inicio' },
      { key: 'season', icon: MdCalendarMonth, label: 'Temporada' },
      { key: 'tournaments', icon: MdEmojiEvents, label: 'Torneos' },
      { key: 'players', icon: MdPeople, label: 'Jugadores' },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { key: 'tactical-board', icon: MdMap, label: 'Pizarra táctica' },
      { key: 'exercises', icon: MdSportsSoccer, label: 'Ejercicios' },
      { key: 'strength-exercises', icon: MdFitnessCenter, label: 'Ejercicios de Fuerza' },
      { key: 'strategies', icon: MdOutlineAssignment, label: 'Estrategias' },
      { key: 'videos', icon: MdVideoLibrary, label: 'Mis Videos' },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { key: 'methodology', icon: MdLibraryBooks, label: 'Metodología' },
      { key: 'goalkeeper-methodology', icon: MdSportsHandball, label: 'Metodología porteros' },
      { key: 'sessions', icon: MdTimer, label: 'Entrenamientos' },
      { key: 'wellness', icon: MdFavorite, label: 'Wellness' },
      { key: 'rivals', icon: MdShield, label: 'Rivales' },
      { key: 'match-sheets', icon: MdDescription, label: 'Fichas de partido' },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { key: 'injuries', icon: MdMedicalServices, label: 'Lesiones' },
      { key: 'rival-analysis', icon: MdAnalytics, label: 'Análisis rival' },
      { key: 'anthropometry', icon: MdAccessibility, label: 'Antropometría' },
      { key: 'statistics', icon: MdBarChart, label: 'Estadísticas' },
      { key: 'nutrition', icon: MdRestaurant, label: 'Nutrición' },
      { key: 'injury-prevention', icon: MdHealthAndSafety, label: 'Prevención de lesiones' },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { key: 'profile', icon: MdPerson, label: 'Perfil' },
    ],
  },
];

function SectionPlaceholder({ icon: Icon, title, children }) {
  return (
    <>
      <SectionHeader>
        <SectionIconBox><Icon /></SectionIconBox>
        <SectionTitle>{title}</SectionTitle>
      </SectionHeader>
      {children}
    </>
  );
}

function DashboardView({ coach }) {
  const { t } = useTranslation();
  return (
    <>
      <SectionHeader>
        <SectionIconBox><MdHome /></SectionIconBox>
        <SectionTitle>{t('menu.home', 'Inicio')}</SectionTitle>
      </SectionHeader>
      <ProfileHeaderCard>
        <BigAvatar src={coach.imagen}>
          {!coach.imagen && initials(`${coach.nombre || ''} ${coach.apellido || ''}`)}
        </BigAvatar>
        <Stack $gap={4}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{coach.nombre} {coach.apellido}</h2>
          <Row $gap={6}>
            <MdEmail size={14} />
            <Muted>{coach.correo}</Muted>
          </Row>
          <Row style={{ marginTop: 4, gap: 6, flexWrap: 'wrap' }}>
            <Badge $tone={coach.clubMemberStatus === 'active' ? 'success' : 'neutral'}>
              {coach.clubMemberStatus || 'active'}
            </Badge>
            {coach.idioma && <Badge $tone="info">{coach.idioma.toUpperCase()}</Badge>}
            <Badge $tone="primary">{coach.plan || 'free'}</Badge>
          </Row>
        </Stack>
      </ProfileHeaderCard>
      <Muted style={{ display: 'block', textAlign: 'center', padding: 40 }}>
        {t('club.supervision.readOnlyMode')} — {t('club.supervision.readOnlyNotice')}
      </Muted>
    </>
  );
}

function SeasonView({ coachId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    api.get(`/season/user/${coachId}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data?.length) return <EmptyState><MdCalendarMonth size={40} /><Muted>Sin temporadas</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdCalendarMonth /></SectionIconBox><SectionTitle>Temporada</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(s => (
          <DataCard key={s._id}>
            <CardTitle>{s.nombre}</CardTitle>
            {s.descripcion && <CardText>{s.descripcion}</CardText>}
            <TagRow>
              {s.deporte && <Badge $tone="info">{s.deporte}</Badge>}
              {s.selected && <Badge $tone="success">Seleccionada</Badge>}
            </TagRow>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function TournamentsView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    const fetchAll = async () => {
      const sRes = await api.get(`/season/user/${coachId}`);
      const seasons = sRes.data || [];
      const allTeams = [];
      for (const s of seasons) {
        try {
          const tRes = await api.get(`/team/season/${s._id}`);
          allTeams.push(...(tRes.data || []));
        } catch {}
      }
      setTeams(allTeams);
      const tPromises = allTeams.map(t => api.get(`/tournament/equipo/${t._id}`).catch(() => null));
      const tResults = await Promise.all(tPromises);
      setData(tResults.filter(Boolean).flatMap(r => r.data || []));
    };
    fetchAll().finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdEmojiEvents size={40} /><Muted>Sin torneos</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdEmojiEvents /></SectionIconBox><SectionTitle>Torneos</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(t => (
          <DataCard key={t._id}>
            <CardTitle>{t.nombre}</CardTitle>
            {t.tipo && <CardRow><MdCategory /><span>{t.tipo}</span></CardRow>}
            {t.fecha && <CardRow><MdDateRange /><span>{new Date(t.fecha).toLocaleDateString()}</span></CardRow>}
            {t.ubicacion && <CardRow><MdLocationOn /><span>{t.ubicacion}</span></CardRow>}
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function PlayersView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    const fetchAll = async () => {
      const sRes = await api.get(`/season/user/${coachId}`);
      const seasons = sRes.data || [];
      const allTeams = [];
      for (const s of seasons) {
        try {
          const tRes = await api.get(`/team/season/${s._id}`);
          allTeams.push(...(tRes.data || []));
        } catch {}
      }
      const pPromises = allTeams.map(t => api.get(`/player/team/${t._id}`).catch(() => null));
      const pResults = await Promise.all(pPromises);
      setData(pResults.filter(Boolean).flatMap(r => r.data || []));
    };
    fetchAll().finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdPeople size={40} /><Muted>Sin jugadores</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdPeople /></SectionIconBox><SectionTitle>Jugadores ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(p => (
          <PlayerCard key={p._id}>
            <PlayerAvatar $src={p.foto}>{!p.foto && initials(`${p.nombre || ''} ${p.apellido || ''}`)}</PlayerAvatar>
            <div style={{ minWidth: 0 }}>
              <CardTitle>{p.nombre} {p.apellido}</CardTitle>
              <TagRow>
                {p.posicion && <Badge $tone="primary">{p.posicion}</Badge>}
                {p.dorsal && <Badge $tone="info">#{p.dorsal}</Badge>}
              </TagRow>
              <CardRow style={{ marginTop: 4 }}>
                {p.sexo === 'male' ? <MdMale /> : p.sexo === 'female' ? <MdFemale /> : null}
                {p.fechaNacimiento && <span>{new Date(p.fechaNacimiento).toLocaleDateString()}</span>}
              </CardRow>
            </div>
          </PlayerCard>
        ))}
      </DataGrid>
    </>
  );
}

function TacticalBoardView() {
  return (
    <>
      <SectionHeader><SectionIconBox><MdMap /></SectionIconBox><SectionTitle>Pizarra táctica</SectionTitle></SectionHeader>
      <EmptyState><MdMap size={40} /><Muted>Pizarra táctica disponible en modo lectura</Muted></EmptyState>
    </>
  );
}

function ExercisesView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    api.get(`/exercise/user/${coachId}`).then(r => setData(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdSportsSoccer size={40} /><Muted>Sin ejercicios</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdSportsSoccer /></SectionIconBox><SectionTitle>Ejercicios ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(e => (
          <DataCard key={e._id}>
            <Thumb>
              {e.imagen ? <img src={e.imagen} alt={e.nombre} /> : <MdSportsSoccer size={48} />}
            </Thumb>
            <CardTitle>{e.nombre}</CardTitle>
            <CardText>{e.descripcion || 'Sin descripción'}</CardText>
            <TagRow>
              <Badge $tone={e.visibility === 'CLUB' ? 'primary' : 'neutral'}>
                {e.visibility === 'CLUB' ? 'Club' : 'Privado'}
              </Badge>
              {e.numeroJugadores && <Badge $tone="info">{e.numeroJugadores} jug.</Badge>}
              {e.favorito && <Badge $tone="warning"><MdStar size={12} /></Badge>}
            </TagRow>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function StrengthExercisesView() {
  return (
    <>
      <SectionHeader><SectionIconBox><MdFitnessCenter /></SectionIconBox><SectionTitle>Ejercicios de Fuerza</SectionTitle></SectionHeader>
      <EmptyState><MdFitnessCenter size={40} /><Muted>Catálogo de ejercicios de fuerza disponible en modo lectura</Muted></EmptyState>
    </>
  );
}

function StrategiesView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    api.get(`/strategy/user/${coachId}`).then(r => setData(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdOutlineAssignment size={40} /><Muted>Sin estrategias</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdOutlineAssignment /></SectionIconBox><SectionTitle>Estrategias ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(s => (
          <DataCard key={s._id}>
            <Thumb>
              {s.imagen ? <img src={s.imagen} alt={s.nombre} /> : <MdOutlineAssignment size={48} />}
            </Thumb>
            <CardTitle>{s.nombre}</CardTitle>
            <CardText>{s.descripcion || 'Sin descripción'}</CardText>
            <TagRow>
              <Badge $tone={s.visibility === 'CLUB' ? 'primary' : 'neutral'}>
                {s.visibility === 'CLUB' ? 'Club' : 'Privado'}
              </Badge>
              {s.tipoCampo && <Badge $tone="info">{s.tipoCampo}</Badge>}
              {s.favorito && <Badge $tone="warning"><MdStar size={12} /></Badge>}
            </TagRow>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function VideosView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    api.get(`/video/list?user=${coachId}`).then(r => setData(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdVideoLibrary size={40} /><Muted>Sin videos</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdVideoLibrary /></SectionIconBox><SectionTitle>Mis Videos ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(v => (
          <DataCard key={v._id}>
            <Thumb>
              {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt={v.nombre} /> : <MdVideoLibrary size={48} />}
            </Thumb>
            <CardTitle>{v.nombre || 'Video'}</CardTitle>
            <CardText>{v.descripcion || 'Sin descripción'}</CardText>
            <TagRow>
              <Badge $tone={v.visibility === 'CLUB' ? 'primary' : 'neutral'}>
                {v.visibility === 'CLUB' ? 'Club' : 'Privado'}
              </Badge>
            </TagRow>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function MethodologyView({ coachId, type }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const label = type === 'goalkeeper' ? 'Metodología porteros' : 'Metodología';
  const Icon = type === 'goalkeeper' ? MdSportsHandball : MdLibraryBooks;
  const endpoint = type === 'goalkeeper' ? '/goalkeeper-methodology' : '/methodology';

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    api.get(`${endpoint}/user/${coachId}`).then(r => setData(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [coachId, endpoint]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><Icon size={40} /><Muted>Sin {label.toLowerCase()}</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><Icon /></SectionIconBox><SectionTitle>{label}</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(m => (
          <DataCard key={m._id}>
            <CardTitle>{m.nombre || 'Metodología'}</CardTitle>
            {m.descripcion && <CardText>{m.descripcion}</CardText>}
            <TagRow>
              {m.categorias?.length > 0 && <Badge $tone="info">{m.categorias.length} categorías</Badge>}
            </TagRow>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function SessionsView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    api.get(`/session/user/${coachId}`).then(r => setData(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdTimer size={40} /><Muted>Sin entrenamientos</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdTimer /></SectionIconBox><SectionTitle>Entrenamientos ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(s => (
          <DataCard key={s._id}>
            <CardTitle>{s.nombre || 'Entrenamiento'}</CardTitle>
            <InfoGrid>
              {s.fecha && <InfoItem><MdCalendarToday size={16} />{new Date(s.fecha).toLocaleDateString()}</InfoItem>}
              {s.duracion && <InfoItem><MdSchedule size={16} />{s.duracion} min</InfoItem>}
              {s.ubicacion && <InfoItem><MdLocationOn size={16} />{s.ubicacion}</InfoItem>}
              {s.objetivo && <InfoItem><MdFlag size={16} />{s.objetivo}</InfoItem>}
            </InfoGrid>
            <TagRow>
              {s.equipo && <Badge $tone="primary">{typeof s.equipo === 'object' ? s.equipo.nombre : s.equipo}</Badge>}
            </TagRow>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function WellnessView({ coachId }) {
  return (
    <>
      <SectionHeader><SectionIconBox><MdFavorite /></SectionIconBox><SectionTitle>Wellness</SectionTitle></SectionHeader>
      <EmptyState><MdFavorite size={40} /><Muted>Datos de wellness disponibles en las sesiones de entrenamiento</Muted></EmptyState>
    </>
  );
}

function RivalsView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    api.get(`/rival/user/${coachId}`).then(r => setData(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdShield size={40} /><Muted>Sin rivales</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdShield /></SectionIconBox><SectionTitle>Rivales ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(r => (
          <DataCard key={r._id}>
            <CardTitle>{r.nombre}</CardTitle>
            {r.entrenador && <CardRow><MdPerson size={14} />{r.entrenador}</CardRow>}
            {r.estadio && <CardRow><MdLocationOn size={14} />{r.estadio}</CardRow>}
            <TagRow>
              {r.categoria && <Badge $tone="info">{r.categoria}</Badge>}
            </TagRow>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function MatchSheetsView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    const fetchAll = async () => {
      const sRes = await api.get(`/season/user/${coachId}`);
      const seasons = sRes.data || [];
      const allTeams = [];
      for (const s of seasons) {
        try { const tRes = await api.get(`/team/season/${s._id}`); allTeams.push(...(tRes.data || [])); } catch {}
      }
      setTeams(allTeams);
      const mPromises = allTeams.map(t => api.get(`/match-sheet/equipo/${t._id}`).catch(() => null));
      const mResults = await Promise.all(mPromises);
      setData(mResults.filter(Boolean).flatMap(r => r.data || []));
    };
    fetchAll().finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdDescription size={40} /><Muted>Sin fichas de partido</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdDescription /></SectionIconBox><SectionTitle>Fichas de partido ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(m => (
          <DataCard key={m._id}>
            <CardTitle>{m.nombre || 'Ficha de partido'}</CardTitle>
            {m.rival && <CardRow><MdShield size={14} />{typeof m.rival === 'object' ? m.rival.nombre : m.rival}</CardRow>}
            {m.fecha && <CardRow><MdCalendarToday size={14} />{new Date(m.fecha).toLocaleDateString()}</CardRow>}
            {m.resultado && <CardRow><MdScore size={14} />{m.resultado}</CardRow>}
            <TagRow>
              {m.competicion && <Badge $tone="primary">{m.competicion}</Badge>}
              {m.tipo && <Badge $tone="info">{m.tipo}</Badge>}
            </TagRow>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function InjuriesView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    const fetchAll = async () => {
      const sRes = await api.get(`/season/user/${coachId}`);
      const seasons = sRes.data || [];
      const allTeams = [];
      for (const s of seasons) {
        try { const tRes = await api.get(`/team/season/${s._id}`); allTeams.push(...(tRes.data || [])); } catch {}
      }
      setTeams(allTeams);
      const iPromises = allTeams.map(t => api.get(`/injury/team/${t._id}`).catch(() => null));
      const iResults = await Promise.all(iPromises);
      setData(iResults.filter(Boolean).flatMap(r => r.data || []));
    };
    fetchAll().finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdMedicalServices size={40} /><Muted>Sin lesiones registradas</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdMedicalServices /></SectionIconBox><SectionTitle>Lesiones ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(inj => (
          <DataCard key={inj._id}>
            <CardTitle>{inj.tipo || 'Lesión'}</CardTitle>
            {inj.jugador && <CardRow><MdPerson size={14} />{typeof inj.jugador === 'object' ? `${inj.jugador.nombre} ${inj.jugador.apellido || ''}` : inj.jugador}</CardRow>}
            {inj.fechaInicio && <CardRow><MdDateRange size={14} />{new Date(inj.fechaInicio).toLocaleDateString()}</CardRow>}
            {inj.fechaFin && <CardRow><MdCheckCircle size={14} />{new Date(inj.fechaFin).toLocaleDateString()}</CardRow>}
            <TagRow>
              {inj.gravedad && <Badge $tone={inj.gravedad === 'grave' ? 'error' : inj.gravedad === 'moderada' ? 'warning' : 'info'}>{inj.gravedad}</Badge>}
              {inj.estado === 'activo' ? <Badge $tone="error">Activo</Badge> : <Badge $tone="success">Recuperado</Badge>}
            </TagRow>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function RivalAnalysisView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    const fetchAll = async () => {
      const sRes = await api.get(`/season/user/${coachId}`);
      const seasons = sRes.data || [];
      const allTeams = [];
      for (const s of seasons) {
        try { const tRes = await api.get(`/team/season/${s._id}`); allTeams.push(...(tRes.data || [])); } catch {}
      }
      const aPromises = allTeams.map(t => api.get(`/rival-analysis/team/${t._id}`).catch(() => null));
      const aResults = await Promise.all(aPromises);
      setData(aResults.filter(Boolean).flatMap(r => r.data || []));
    };
    fetchAll().finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdAnalytics size={40} /><Muted>Sin análisis de rivales</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdAnalytics /></SectionIconBox><SectionTitle>Análisis rival ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(a => (
          <DataCard key={a._id}>
            <CardTitle>{a.titulo || 'Análisis'}</CardTitle>
            {a.rival && <CardRow><MdShield size={14} />{typeof a.rival === 'object' ? a.rival.nombre : a.rival}</CardRow>}
            {a.fecha && <CardRow><MdCalendarToday size={14} />{new Date(a.fecha).toLocaleDateString()}</CardRow>}
            {a.notas && <CardText>{a.notas}</CardText>}
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function AnthropometryView({ coachId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    const fetchAll = async () => {
      const sRes = await api.get(`/season/user/${coachId}`);
      const seasons = sRes.data || [];
      const allTeams = [];
      for (const s of seasons) {
        try { const tRes = await api.get(`/team/season/${s._id}`); allTeams.push(...(tRes.data || [])); } catch {}
      }
      setTeams(allTeams);
      const aPromises = allTeams.map(t => api.get(`/anthropometry/team/${t._id}`).catch(() => null));
      const aResults = await Promise.all(aPromises);
      setData(aResults.filter(Boolean).flatMap(r => r.data || []));
    };
    fetchAll().finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data.length) return <EmptyState><MdAccessibility size={40} /><Muted>Sin datos antropométricos</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdAccessibility /></SectionIconBox><SectionTitle>Antropometría ({data.length})</SectionTitle></SectionHeader>
      <DataGrid>
        {data.map(a => (
          <DataCard key={a._id}>
            <CardTitle>{a.jugador ? (typeof a.jugador === 'object' ? `${a.jugador.nombre} ${a.jugador.apellido || ''}` : a.jugador) : 'Medición'}</CardTitle>
            {a.fecha && <CardRow><MdCalendarToday size={14} />{new Date(a.fecha).toLocaleDateString()}</CardRow>}
            <InfoGrid>
              {a.peso && <InfoItem><MdAccessibility size={16} />Peso: {a.peso} kg</InfoItem>}
              {a.altura && <InfoItem><MdAccessibility size={16} />Altura: {a.altura} cm</InfoItem>}
            </InfoGrid>
          </DataCard>
        ))}
      </DataGrid>
    </>
  );
}

function StatisticsView({ coachId }) {
  return (
    <>
      <SectionHeader><SectionIconBox><MdBarChart /></SectionIconBox><SectionTitle>Estadísticas</SectionTitle></SectionHeader>
      <EmptyState><MdBarChart size={40} /><Muted>Estadísticas disponibles en las fichas de partido</Muted></EmptyState>
    </>
  );
}

function NutritionView({ coachId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    api.get(`/nutrition/user/${coachId}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [coachId]);

  if (loading) return <Loading />;
  if (!data) return <EmptyState><MdRestaurant size={40} /><Muted>Sin plan nutricional</Muted></EmptyState>;

  return (
    <>
      <SectionHeader><SectionIconBox><MdRestaurant /></SectionIconBox><SectionTitle>Nutrición</SectionTitle></SectionHeader>
      <DataGrid>
        {data.preseason && (
          <DataCard>
            <CardTitle>Pretemporada</CardTitle>
            {data.preseason.objetivo && <CardText>{data.preseason.objetivo}</CardText>}
          </DataCard>
        )}
        {data.season && (
          <DataCard>
            <CardTitle>Temporada</CardTitle>
            {data.season.objetivo && <CardText>{data.season.objetivo}</CardText>}
          </DataCard>
        )}
      </DataGrid>
    </>
  );
}

function InjuryPreventionView() {
  return (
    <>
      <SectionHeader><SectionIconBox><MdHealthAndSafety /></SectionIconBox><SectionTitle>Prevención de lesiones</SectionTitle></SectionHeader>
      <EmptyState><MdHealthAndSafety size={40} /><Muted>Contenido de prevención de lesiones disponible en modo lectura</Muted></EmptyState>
    </>
  );
}

function ProfileView({ coach }) {
  return (
    <>
      <SectionHeader><SectionIconBox><MdPerson /></SectionIconBox><SectionTitle>Perfil</SectionTitle></SectionHeader>
      <ProfileHeaderCard>
        <BigAvatar src={coach.imagen}>
          {!coach.imagen && initials(`${coach.nombre || ''} ${coach.apellido || ''}`)}
        </BigAvatar>
        <Stack $gap={4}>
          <CardTitle>{coach.nombre} {coach.apellido}</CardTitle>
          <CardRow><MdEmail size={14} />{coach.correo}</CardRow>
          <TagRow style={{ marginTop: 4 }}>
            <Badge $tone={coach.clubMemberStatus === 'active' ? 'success' : 'neutral'}>{coach.clubMemberStatus}</Badge>
            {coach.idioma && <Badge $tone="info">{coach.idioma.toUpperCase()}</Badge>}
            <Badge $tone="primary">{coach.role}</Badge>
          </TagRow>
        </Stack>
      </ProfileHeaderCard>
      {coach.tutorialCompleto !== undefined && (
        <CardText style={{ marginTop: 8 }}>
          Tutorial completo: {coach.tutorialCompleto ? 'Sí' : 'No'}
        </CardText>
      )}
    </>
  );
}

export default function CoachView() {
  const { t } = useTranslation();
  const { id: coachId } = useParams();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);

  const section = NAV_SECTIONS.flatMap(g => g.items).find(i => i.key === activeSection);

  useEffect(() => {
    if (!coachId) return;
    setLoading(true);
    api.get(`/user/${coachId}`)
      .then(r => setCoach(r.data?.usuario || r.data))
      .catch(() => toast.error(t('connection.loadError')))
      .finally(() => setLoading(false));
  }, [coachId]);

  const navigateSection = useCallback((key) => {
    setActiveSection(key);
    setSidebarOpen(false);
  }, []);

  const renderContent = () => {
    if (loading) return <Loading />;
    if (!coach) return (
      <EmptyState>
        <MdInfo size={48} />
        <Muted>{t('club.supervision.noData')}</Muted>
        <Button $variant="secondary" onClick={() => navigate('/club/dashboard')}>
          <MdArrowBack /> {t('club.supervision.backToDashboard')}
        </Button>
      </EmptyState>
    );

    switch (activeSection) {
      case 'dashboard': return <DashboardView coach={coach} />;
      case 'season': return <SeasonView coachId={coachId} />;
      case 'tournaments': return <TournamentsView coachId={coachId} />;
      case 'players': return <PlayersView coachId={coachId} />;
      case 'tactical-board': return <TacticalBoardView />;
      case 'exercises': return <ExercisesView coachId={coachId} />;
      case 'strength-exercises': return <StrengthExercisesView />;
      case 'strategies': return <StrategiesView coachId={coachId} />;
      case 'videos': return <VideosView coachId={coachId} />;
      case 'methodology': return <MethodologyView coachId={coachId} type="standard" />;
      case 'goalkeeper-methodology': return <MethodologyView coachId={coachId} type="goalkeeper" />;
      case 'sessions': return <SessionsView coachId={coachId} />;
      case 'wellness': return <WellnessView coachId={coachId} />;
      case 'rivals': return <RivalsView coachId={coachId} />;
      case 'match-sheets': return <MatchSheetsView coachId={coachId} />;
      case 'injuries': return <InjuriesView coachId={coachId} />;
      case 'rival-analysis': return <RivalAnalysisView coachId={coachId} />;
      case 'anthropometry': return <AnthropometryView coachId={coachId} />;
      case 'statistics': return <StatisticsView coachId={coachId} />;
      case 'nutrition': return <NutritionView coachId={coachId} />;
      case 'injury-prevention': return <InjuryPreventionView />;
      case 'profile': return <ProfileView coach={coach} />;
      default: return <DashboardView coach={coach} />;
    }
  };

  return (
    <Page>
      <PageHeader>
        <Button $variant="secondary" onClick={() => navigate('/club/dashboard')}>
          <MdArrowBack />
          {t('club.supervision.backToDashboard')}
        </Button>
        <PageTitle>{t('club.supervision.title')}</PageTitle>
      </PageHeader>

      <TopAlert>
        <MdLock size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>{t('club.supervision.readOnlyMode')}</strong>: {t('club.supervision.readOnlyNotice')}
        </div>
      </TopAlert>

      {!loading && coach && (
        <Toolbar>
          <Row $gap={8}>
            <BigAvatar src={coach.imagen} style={{ width: 36, height: 36, fontSize: 13, borderWidth: 2 }}>
              {!coach.imagen && initials(`${coach.nombre || ''} ${coach.apellido || ''}`)}
            </BigAvatar>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{coach.nombre} {coach.apellido}</div>
              <Muted style={{ fontSize: 11 }}>{section?.label}</Muted>
            </div>
          </Row>
          <MobileMenuButton $variant="secondary" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <MdClose size={18} /> : <MdMenu size={18} />}
            Menú
          </MobileMenuButton>
        </Toolbar>
      )}

      <SidebarBackdrop $open={sidebarOpen} onClick={() => setSidebarOpen(false)} />
      <Layout>
        <Sidebar $open={sidebarOpen}>
          {NAV_SECTIONS.map(group => (
            <SidebarGroup key={group.title || '__main'}>
              {group.title && <SidebarGroupTitle>{group.title}</SidebarGroupTitle>}
              {group.items.map(item => (
                <SidebarItem
                  key={item.key}
                  $active={activeSection === item.key}
                  onClick={() => navigateSection(item.key)}
                >
                  <item.icon size={18} />
                  {item.label}
                </SidebarItem>
              ))}
            </SidebarGroup>
          ))}
        </Sidebar>

        <MainContent>
          {renderContent()}
        </MainContent>
      </Layout>
    </Page>
  );
}
