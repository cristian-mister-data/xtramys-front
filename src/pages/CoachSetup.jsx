import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { MdSportsSoccer, MdPerson, MdCategory } from 'react-icons/md';
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

export default function CoachSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.usuario?.user);

  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [categoriaKey, setCategoriaKey] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!user.clubId) {
      navigate('/app', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!categoriaKey) {
      toast.error('Selecciona una categoría');
      return;
    }

    setLoading(true);
    try {
      const sRes = await api.get(`/season/user/${user._id}`);
      const seasons = sRes.data || [];
      const seasonId = seasons[0]?._id;
      if (!seasonId) {
        toast.error('No se encontró una temporada activa. Contacta al administrador del club.');
        return;
      }

      const res = await api.post('/team/coach-setup', {
        seasonId,
        categoriaKey,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
      });

      const updatedUser = { ...user, nombre: nombre.trim(), apellido: apellido.trim() };
      saveUser(updatedUser);
      dispatch(setUser(updatedUser));

      toast.success('¡Bienvenido! Tu equipo ha sido creado.');
      navigate('/app', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Error al configurar tu perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <SetupCard>
        <StepIndicator>
          <StepDot $active={step === 1} />
          <StepDot $active={step === 2} />
        </StepIndicator>

        {step === 1 && (
          <>
            <IconWrap><MdPerson size={28} /></IconWrap>
            <PageTitle style={{ textAlign: 'center', marginBottom: 8 }}>
              {t('coachSetup.title', 'Bienvenido al club')}
            </PageTitle>
            <Muted style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
              {t('coachSetup.subtitle', 'Cuéntanos quién eres para personalizar tu experiencia')}
            </Muted>
            <Stack $gap={14}>
              <Field>
                <Label>{t('coachSetup.name', 'Nombre')}</Label>
                <Input
                  placeholder={t('coachSetup.namePlaceholder', 'Tu nombre')}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoFocus
                />
              </Field>
              <Field>
                <Label>{t('coachSetup.surname', 'Apellidos')}</Label>
                <Input
                  placeholder={t('coachSetup.surnamePlaceholder', 'Tus apellidos')}
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                />
              </Field>
              <Row style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                <Button onClick={() => setStep(2)} disabled={!nombre.trim()}>
                  {t('common.continue', 'Continuar')}
                </Button>
              </Row>
            </Stack>
          </>
        )}

        {step === 2 && (
          <>
            <IconWrap><MdCategory size={28} /></IconWrap>
            <PageTitle style={{ textAlign: 'center', marginBottom: 8 }}>
              {t('coachSetup.categoryTitle', '¿Qué categoría entrenas?')}
            </PageTitle>
            <Muted style={{ textAlign: 'center', display: 'block', marginBottom: 24 }}>
              {t('coachSetup.categorySubtitle', 'Selecciona la categoría de tu equipo')}
            </Muted>
            <Stack $gap={8}>
              {categoryOptions.map((opt) => (
                <Card
                  key={opt.value}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderRadius: 10,
                    border: categoriaKey === opt.value ? '2px solid' : '1px solid',
                    borderColor: categoriaKey === opt.value
                      ? ({ theme }) => theme.colors.primary
                      : ({ theme }) => theme.colors.border,
                    background: categoriaKey === opt.value
                      ? ({ theme }) => theme.colors.primarySoft
                      : ({ theme }) => theme.colors.surface,
                    transition: 'all 0.15s',
                  }}
                  onClick={() => { setCategoriaKey(opt.value); }}
                >
                  <Row $gap={10}>
                    <MdSportsSoccer size={20} />
                    <span style={{ fontWeight: categoriaKey === opt.value ? 600 : 400 }}>{opt.label}</span>
                  </Row>
                </Card>
              ))}
            </Stack>
            <Row style={{ justifyContent: 'space-between', marginTop: 16 }}>
              <Button $variant="secondary" onClick={() => setStep(1)}>
                {t('common.back', 'Atrás')}
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !categoriaKey}>
                {loading ? '...' : t('coachSetup.start', 'Comenzar')}
              </Button>
            </Row>
          </>
        )}
      </SetupCard>
    </Page>
  );
}
