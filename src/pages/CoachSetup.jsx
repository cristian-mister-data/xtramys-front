import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { MdSportsSoccer, MdPerson, MdTimer, MdPeople } from 'react-icons/md';
import api from '@/api/client';
import { Card, Button, Field, Input, Label, Row, Stack, Muted, PageTitle } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { setUser } from '@/store/slices/user/userSlice';
import { saveUser } from '@/auth/storage';

const Page = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: 480px) {
    padding: 16px;
    align-items: flex-start;
    padding-top: 48px;
  }
`;

const SetupCard = styled(Card)`
  width: 100%;
  max-width: 480px;
  padding: 36px;
  border-radius: 16px;

  @media (max-width: 480px) {
    padding: 24px;
  }
`;

const IconWrap = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  display: grid;
  place-items: center;
  margin: 0 auto 16px;

  svg {
    width: 28px;
    height: 28px;
  }
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
`;

const StepDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.border};
  transition: background 0.2s;
`;

const categoryOptions = [
  { value: 'prebenjamin', label: 'Prebenjamín' },
  { value: 'benjamin', label: 'Benjamín' },
  { value: 'alevin', label: 'Alevín' },
  { value: 'infantil', label: 'Infantil' },
  { value: 'cadete', label: 'Cadete' },
  { value: 'juvenil', label: 'Juvenil' },
  { value: 'senior', label: 'Sénior' },
  { value: 'otro', label: 'Otra' },
];

const timeOptions = [
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 25, label: '25 min' },
  { value: 30, label: '30 min' },
  { value: 35, label: '35 min' },
  { value: 40, label: '40 min' },
  { value: 45, label: '45 min' },
];

const playersOptions = [
  { value: 7, label: '7' },
  { value: 8, label: '8' },
  { value: 11, label: '11' },
];

const OptionCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 2px solid ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.primarySoft : theme.colors.surface};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 480px) {
    padding: 12px 14px;
  }
`;

const OptionLabel = styled.div`
  font-size: 14px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text};
`;

const ConfigRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ConfigCard = styled.div`
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const ConfigLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 6px;
`;

const ConfigValue = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 6px;

  svg {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export default function CoachSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.usuario?.user);

  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [categoriaKey, setCategoriaKey] = useState('');
  const [tiempoPorParte, setTiempoPorParte] = useState(45);
  const [jugadoresPorEquipo, setJugadoresPorEquipo] = useState(11);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!user.clubId) {
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error(t('coachSetup.nameRequired', 'El nombre es obligatorio'));
      return;
    }
    if (!categoriaKey) {
      toast.error(t('coachSetup.categoryRequired', 'Selecciona una categoría'));
      return;
    }

    setLoading(true);
    try {
      let selectedSeason = null;
      try {
        const selectedRes = await api.get(`/season/selected/${user._id}`);
        selectedSeason = selectedRes.data?.[0] || null;
      } catch (_) {
        selectedSeason = null;
      }

      if (!selectedSeason) {
        const sRes = await api.get(`/season/user/${user._id}`);
        const seasons = sRes.data || [];
        selectedSeason = seasons.find((season) => season.seleccionada) || seasons[0] || null;
      }

      const seasonId = selectedSeason?._id;
      if (!seasonId) {
        toast.error(t('coachSetup.noActiveSeason', 'No se encontró una temporada activa. Contacta al administrador del club.'));
        return;
      }

      await api.post('/team/coach-setup', {
        seasonId,
        categoriaKey,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        tiempoPorParte,
        jugadoresPorEquipo,
      });

      const updatedUser = { ...user, nombre: nombre.trim(), apellido: apellido.trim() };
      saveUser(updatedUser);
      dispatch(setUser(updatedUser));

      toast.success(t('coachSetup.success', 'Your team has been created. Welcome!'));
      navigate('/app', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || t('coachSetup.errorConfig', 'Error al configurar tu perfil'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <SetupCard>
        <StepIndicator>
          <StepDot $active={step >= 1} />
          <StepDot $active={step >= 2} />
          <StepDot $active={step >= 3} />
        </StepIndicator>

        {step === 1 && (
          <>
            <IconWrap><MdPerson size={28} /></IconWrap>
            <PageTitle style={{ textAlign: 'center', marginBottom: 8 }}>
              {t('coachSetup.title', 'Welcome to the club')}
            </PageTitle>
            <Muted style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
              {t('coachSetup.subtitle', 'Tell us who you are to personalize your experience')}
            </Muted>
            <Stack $gap={14}>
              <Field>
                <Label>{t('coachSetup.name', 'Name')}</Label>
                <Input
                  placeholder={t('coachSetup.namePlaceholder', 'Your name')}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                />
              </Field>
              <Field>
                <Label>{t('coachSetup.surname', 'Surname')}</Label>
                <Input
                  placeholder={t('coachSetup.surnamePlaceholder', 'Your surname')}
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                />
              </Field>
              <Row style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                <Button onClick={() => setStep(2)} disabled={!nombre.trim()}>
{t('common.continue', 'Continue')}
              </Button>
            </Row>
            </Stack>
          </>
        )}

        {step === 2 && (
          <>
            <IconWrap><MdSportsSoccer size={28} /></IconWrap>
            <PageTitle style={{ textAlign: 'center', marginBottom: 8 }}>
              {t('coachSetup.categoryTitle', 'What category do you train?')}
            </PageTitle>
            <Muted style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
              {t('coachSetup.categorySubtitle', 'Select your team category')}
            </Muted>
            <Stack $gap={8}>
              {categoryOptions.map((opt) => (
                <OptionCard
                  key={opt.value}
                  $active={categoriaKey === opt.value}
                  onClick={() => setCategoriaKey(opt.value)}
                >
                  <MdSportsSoccer size={20} />
                  <OptionLabel $active={categoriaKey === opt.value}>
                    {t(`team.categories.${opt.value}`, opt.label)}
                  </OptionLabel>
                </OptionCard>
              ))}
            </Stack>
            <Row style={{ justifyContent: 'space-between', marginTop: 16 }}>
              <Button $variant="secondary" onClick={() => setStep(1)}>
                {t('common.back', 'Back')}
              </Button>
              <Button onClick={() => setStep(3)} disabled={!categoriaKey}>
                {t('common.continue', 'Continue')}
              </Button>
            </Row>
          </>
        )}

        {step === 3 && (
          <>
            <IconWrap><MdTimer size={28} /></IconWrap>
            <PageTitle style={{ textAlign: 'center', marginBottom: 8 }}>
              {t('coachSetup.configTitle', 'Game configuration')}
            </PageTitle>
            <Muted style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
              {t('coachSetup.configSubtitle', 'Adjust your match parameters')}
            </Muted>

            <Stack $gap={20}>
              <div>
                <ConfigLabel>{t('team.timePerHalf', 'Time per half')}</ConfigLabel>
                <Stack $gap={6}>
                  {timeOptions.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      $active={tiempoPorParte === opt.value}
                      onClick={() => setTiempoPorParte(opt.value)}
                    >
                      <MdTimer size={18} />
                      <OptionLabel $active={tiempoPorParte === opt.value}>
                        {t('team.timePerHalfMinutes', { minutes: opt.value })}
                      </OptionLabel>
                    </OptionCard>
                  ))}
                </Stack>
              </div>

              <div>
                <ConfigLabel>{t('team.playersPerTeam', 'Players per team')}</ConfigLabel>
                <Stack $gap={6}>
                  {playersOptions.map((opt) => (
                    <OptionCard
                      key={opt.value}
                      $active={jugadoresPorEquipo === opt.value}
                      onClick={() => setJugadoresPorEquipo(opt.value)}
                    >
                      <MdPeople size={18} />
                      <OptionLabel $active={jugadoresPorEquipo === opt.value}>{opt.label}</OptionLabel>
                    </OptionCard>
                  ))}
                </Stack>
              </div>
            </Stack>

            <ConfigRow style={{ marginTop: 20 }}>
              <ConfigCard>
                <ConfigLabel>{t('team.timePerHalf', 'Time per half')}</ConfigLabel>
                <ConfigValue>
                  <MdTimer size={16} />
                  {t('team.timePerHalfMinutes', { minutes: tiempoPorParte })}
                </ConfigValue>
              </ConfigCard>
              <ConfigCard>
                <ConfigLabel>{t('team.playersPerTeam', 'Players')}</ConfigLabel>
                <ConfigValue>
                  <MdPeople size={16} />
                  {t('team.playersPerTeamCount', { count: jugadoresPorEquipo })}
                </ConfigValue>
              </ConfigCard>
            </ConfigRow>

            <Row style={{ justifyContent: 'space-between', marginTop: 20 }}>
              <Button $variant="secondary" onClick={() => setStep(2)}>
                {t('common.back', 'Back')}
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? '...' : t('coachSetup.start', 'Start')}
              </Button>
            </Row>
          </>
        )}
      </SetupCard>
    </Page>
  );
}
