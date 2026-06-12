import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { MdPersonAdd, MdShield, MdDelete, MdVisibility, MdLockOpen, MdLock, MdMail } from 'react-icons/md';
import api from '@/api/client';
import { Card, Button, Field, Input, Label, Row, Stack, Badge, Muted, PageHeader, PageTitle, Divider } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { startSupervision } from '@/store/slices/user/userSlice';
import Modal from '@/ui/Modal';

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 16px;
  }
`;

const StatCard = styled(Card)`
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 16px;
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.02)'};
  background: ${({ theme }) => theme.colors.surface};
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 4px;
    background: ${({ $color }) => $color || 'linear-gradient(90deg, #3b82f6, #60a5fa)'};
  }

  @media (max-width: 480px) {
    padding: 14px;
    border-radius: 12px;
  }
`;

const StatNumber = styled.div`
  font-size: 28px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.text};
  margin: 6px 0 2px;

  @media (max-width: 480px) {
    font-size: 22px;
  }
`;

const StatLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatIcon = styled.div`
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 30px;
  opacity: 0.1;
  color: ${({ theme }) => theme.colors.text};
`;

const TableContainer = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
`;

const Th = styled.th`
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.textSecondary};
  font-weight: 600;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.8px;

  @media (max-width: 600px) {
    padding: 10px 10px;
    font-size: 10px;

    &:nth-child(2) {
      display: none;
    }
  }
`;

const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;

  @media (max-width: 600px) {
    padding: 10px 10px;

    &:nth-child(2) {
      display: none;
    }
  }
`;

const MemberNameSection = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Avatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
  background-image: ${({ $src }) => $src ? `url(${$src})` : 'none'};
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
`;

const ActionBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid ${({ theme, $type }) => {
    if ($type === 'danger') return theme.colors.error;
    if ($type === 'success') return '#10b981';
    if ($type === 'warning') return '#f59e0b';
    return theme.colors.border;
  }};
  background: ${({ theme, $type }) => {
    if ($type === 'danger') return 'rgba(239,68,68,0.08)';
    if ($type === 'success') return 'rgba(16,185,129,0.08)';
    if ($type === 'warning') return 'rgba(245,158,11,0.08)';
    return theme.colors.surface;
  }};
  color: ${({ theme, $type }) => {
    if ($type === 'danger') return theme.colors.error;
    if ($type === 'success') return '#10b981';
    if ($type === 'warning') return '#f59e0b';
    return theme.colors.text;
  }};
  cursor: pointer;
  transition: all 150ms ease;
  margin-right: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;

  &:hover {
    opacity: 0.8;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    padding: 4px 7px;
    font-size: 11px;
    gap: 3px;
    margin-right: 2px;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ClubBanner = styled.div`
  background: ${({ theme }) => theme.mode === 'dark' ? 'linear-gradient(135deg, #1e293b, #0f172a)' : 'linear-gradient(135deg, #1e3a5f, #2563eb 60%, #3b82f6)'};
  border-radius: 16px;
  padding: 28px 24px;
  color: #fff;
  margin-bottom: 24px;
  box-shadow: ${({ theme }) => theme.mode === 'dark' ? 'none' : '0 4px 20px rgba(37,99,235,0.15)'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  @media (max-width: 480px) {
    padding: 20px 16px;
    border-radius: 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    margin-bottom: 16px;
  }
`;

const LicenseBar = styled.div`
  margin-top: 6px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.15);
  overflow: hidden;
  div {
    height: 100%;
    border-radius: 3px;
    background: ${({ $full }) => $full ? '#ef4444' : '#10b981'};
    transition: width 0.4s ease;
  }
`;

const ConfirmBox = styled.div`
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
`;

const Page = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 16px; }
  @media (max-width: 480px) { padding: 12px; }
`;

const InfoNotice = styled.div`
  background: rgba(59,130,246,0.06);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-bottom: 16px;
  line-height: 1.5;
`;

export default function ClubDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Invite modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  // Deactivate/Remove confirm modal
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'deactivate'|'activate'|'remove', member }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClubData = async () => {
    try {
      const response = await api.get('/club/my-club');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching club data:', error);
      toast.error(error.message || t('connection.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubData();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await api.post('/club/invite', { email: inviteEmail });
      toast.success(t('club.inviteModal.success', 'Invitación enviada correctamente'));
      setIsInviteOpen(false);
      setInviteEmail('');
      fetchClubData();
    } catch (error) {
      toast.error(error.message || t('club.inviteModal.error', 'Error al enviar la invitación'));
    } finally {
      setInviting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    setActionLoading(true);
    try {
      if (confirmModal.type === 'remove') {
        await api.post('/club/remove-user', { targetUserId: confirmModal.member._id });
        toast.success('Usuario eliminado de la organización');
      } else {
        await api.post('/club/toggle-user', { targetUserId: confirmModal.member._id });
        const isActivating = confirmModal.member.clubMemberStatus !== 'active';
        toast.success(isActivating ? 'Acceso reactivado' : 'Acceso suspendido');
      }
      setConfirmModal(null);
      fetchClubData();
    } catch (error) {
      toast.error(error.message || 'Error al realizar la acción');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Muted>{t('message.loading')}</Muted>
      </div>
    );
  }

  if (!data || !data.club) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <PageTitle>{t('club.title')}</PageTitle>
        <Muted>No se encontró información del club.</Muted>
      </div>
    );
  }

  const { club, members, stats } = data;
  const initials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const activeCount = club.activeUsers || 0;
  const maxCount = club.maxUsers || 0;
  const availableSlots = Math.max(0, maxCount - activeCount);
  const isFull = activeCount >= maxCount;
  const pct = maxCount > 0 ? Math.min(100, Math.round((activeCount / maxCount) * 100)) : 0;

  return (
    <Page>
      {/* Club Banner */}
      <ClubBanner>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{club.name}</h1>
          <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: 13 }}>
            Panel de administración · {activeCount} / {maxCount} licencias usadas
          </p>
          <LicenseBar $full={isFull}>
            <div style={{ width: `${pct}%` }} />
          </LicenseBar>
        </div>
        <Button
          style={{
            background: isFull ? 'rgba(255,255,255,0.15)' : '#10b981',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: isFull ? 'none' : '0 4px 12px rgba(16,185,129,0.3)',
            cursor: isFull ? 'not-allowed' : 'pointer',
            opacity: isFull ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            fontSize: 14,
            width: '100%',
            justifyContent: 'center',
          }}
          onClick={() => !isFull && setIsInviteOpen(true)}
          disabled={isFull}
          title={isFull ? 'Límite de licencias alcanzado' : 'Invitar miembro'}
        >
          <MdPersonAdd size={18} />
          {isFull ? 'Límite alcanzado' : t('club.actions.invite', 'Invitar Miembro')}
        </Button>
      </ClubBanner>

      {/* Stats */}
      <StatsGrid>
        <StatCard $color="linear-gradient(90deg, #10b981, #34d399)">
          <StatIcon><MdShield /></StatIcon>
          <StatLabel>{t('club.activeUsers', 'Licencias activas')}</StatLabel>
          <StatNumber>{activeCount} / {maxCount}</StatNumber>
          <Muted style={{ fontSize: 12 }}>{availableSlots} libre{availableSlots !== 1 ? 's' : ''}</Muted>
        </StatCard>
        <StatCard $color="linear-gradient(90deg, #3b82f6, #60a5fa)">
          <StatLabel>{t('club.trainings', 'Entrenamientos')}</StatLabel>
          <StatNumber>{stats.trainings}</StatNumber>
          <Muted style={{ fontSize: 12 }}>Total del club</Muted>
        </StatCard>
        <StatCard $color="linear-gradient(90deg, #f59e0b, #fbbf24)">
          <StatLabel>{t('club.exercises', 'Ejercicios')}</StatLabel>
          <StatNumber>{stats.exercises}</StatNumber>
          <Muted style={{ fontSize: 12 }}>Biblioteca compartida</Muted>
        </StatCard>
        <StatCard $color="linear-gradient(90deg, #8b5cf6, #a78bfa)">
          <StatLabel>{t('club.strategies', 'Estrategias')}</StatLabel>
          <StatNumber>{stats.strategies}</StatNumber>
          <Muted style={{ fontSize: 12 }}>Táctica compartida</Muted>
        </StatCard>
      </StatsGrid>

      {/* Members table */}
      <Card style={{ padding: 24, borderRadius: 16 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>
          Entrenadores del club
        </h2>
        <InfoNotice>
          ℹ️ Puedes <strong>suspender el acceso</strong> de un entrenador sin eliminarlo del club (conserva sus datos). 
          Si eliminas un entrenador, se desvincula pero sus datos permanecen. 
          Para volver a añadirle, invítale de nuevo.
        </InfoNotice>
        <TableContainer>
          {members.length === 0 ? (
            <EmptyState>
              <MdMail size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Aún no hay entrenadores en tu club</p>
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>
                Haz clic en "Invitar Miembro" para enviar la primera invitación.
              </p>
            </EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Entrenador</Th>
                  <Th>Correo</Th>
                  <Th>Estado</Th>
                  <Th>Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isActive = member.clubMemberStatus === 'active';
                  const isPending = member.clubMemberStatus === 'pending';
                  let statusTone = 'neutral';
                  if (isActive) statusTone = 'success';
                  else if (member.clubMemberStatus === 'inactive') statusTone = 'error';
                  else if (isPending) statusTone = 'warning';

                  return (
                    <tr key={member._id}>
                      <Td>
                        <MemberNameSection>
                          <Avatar $src={member.imagen}>
                            {!member.imagen && initials(`${member.nombre} ${member.apellido}`)}
                          </Avatar>
                          <div>
                            <div style={{ fontWeight: 600 }}>{member.nombre} {member.apellido}</div>
                            {!member.emailVerificado && (
                              <Badge $tone="warning" style={{ fontSize: 10, padding: '1px 6px', marginTop: 2 }}>
                                Pendiente activación
                              </Badge>
                            )}
                          </div>
                        </MemberNameSection>
                      </Td>
                      <Td style={{ fontSize: 13, color: 'inherit', opacity: 0.8 }}>{member.correo}</Td>
                      <Td>
                        <Badge $tone={statusTone}>
                          {isActive ? 'Activo' : isPending ? 'Invitado' : 'Suspendido'}
                        </Badge>
                      </Td>
                      <Td>
                        {/* View coach data (read-only) */}
                        <ActionBtn
                          title="Ver actividad"
                          onClick={async () => {
                            try {
                              const res = await api.get(`/user/${member._id}`);
                              const coachUser = res.data?.usuario || res.data;
                              dispatch(startSupervision(coachUser));
                              navigate('/app', { replace: true });
                            } catch {
                              toast.error(t('connection.loadError', 'Error al cargar los datos del entrenador'));
                            }
                          }}
                        >
                          <MdVisibility size={14} />
                          Ver
                        </ActionBtn>
                        {/* Resend invite for pending members */}
                        {isPending && (
                          <ActionBtn
                            title="Reenviar invitación"
                            onClick={async () => {
                              try {
                                const res = await api.post('/club/resend-invite', { targetUserId: member._id });
                                toast.success(res.data?.mensaje || 'Invitación reenviada');
                                fetchClubData();
                              } catch (err) {
                                toast.error(err.response?.data?.mensaje || 'Error al reenviar invitación');
                              }
                            }}
                          >
                            <MdMail size={14} />
                            Reenviar
                          </ActionBtn>
                        )}
                        {/* Suspend / Reactivate access */}
                        {isActive ? (
                          <ActionBtn
                            $type="warning"
                            title="Suspender acceso (conserva datos)"
                            onClick={() => setConfirmModal({ type: 'deactivate', member })}
                          >
                            <MdLock size={14} />
                            Suspender
                          </ActionBtn>
                        ) : (
                          <ActionBtn
                            $type="success"
                            title="Reactivar acceso"
                            onClick={() => setConfirmModal({ type: 'activate', member })}
                            disabled={isFull}
                          >
                            <MdLockOpen size={14} />
                            Reactivar
                          </ActionBtn>
                        )}
                        {/* Remove from club */}
                        <ActionBtn
                          $type="danger"
                          title="Eliminar del club"
                          onClick={() => setConfirmModal({ type: 'remove', member })}
                        >
                          <MdDelete size={14} />
                          Eliminar
                        </ActionBtn>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </TableContainer>
      </Card>

      {/* ── INVITE MODAL ── */}
      <Modal
        open={isInviteOpen}
        onClose={() => { setIsInviteOpen(false); setInviteEmail(''); }}
        title={t('club.inviteModal.title', 'Invitar entrenador')}
      >
        <form onSubmit={handleInvite}>
          <Stack $gap={16}>
            <InfoNotice>
              📧 El entrenador recibirá un correo con un enlace para establecer su contraseña y activar su cuenta.
              Si ya tiene cuenta en Xtramys, se vinculará automáticamente.
            </InfoNotice>
            <Field>
              <Label>{t('club.inviteModal.emailLabel', 'Correo electrónico')}</Label>
              <Input
                type="email"
                placeholder={t('club.inviteModal.emailPlaceholder', 'entrenador@ejemplo.com')}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
              <Button
                type="button"
                $variant="secondary"
                onClick={() => { setIsInviteOpen(false); setInviteEmail(''); }}
              >
                {t('message.cancel', 'Cancelar')}
              </Button>
              <Button
                type="submit"
                $variant="primary"
                disabled={inviting || !inviteEmail}
              >
                {inviting ? t('message.loading', 'Enviando...') : t('club.inviteModal.send', 'Enviar invitación')}
              </Button>
            </Row>
          </Stack>
        </form>
      </Modal>

      {/* ── CONFIRM ACTION MODAL (suspend / remove) ── */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={
          confirmModal?.type === 'remove'
            ? 'Eliminar del club'
            : confirmModal?.type === 'deactivate'
            ? 'Suspender acceso'
            : 'Reactivar acceso'
        }
      >
        <Stack $gap={16}>
          <ConfirmBox>
            <strong>{confirmModal?.member?.nombre} {confirmModal?.member?.apellido}</strong>
            <br />
            <span style={{ fontSize: 13, opacity: 0.7 }}>{confirmModal?.member?.correo}</span>
          </ConfirmBox>

          {confirmModal?.type === 'remove' && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              ¿Seguro que quieres <strong>eliminar</strong> a este entrenador del club?
              Sus datos de entrenamientos y equipos se conservarán, pero ya no tendrá acceso.
              Puedes volver a invitarle en cualquier momento.
            </p>
          )}
          {confirmModal?.type === 'deactivate' && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              ¿Quieres <strong>suspender el acceso</strong> de este entrenador?
              Seguirá en el club pero no podrá iniciar sesión. 
              Su licencia quedará libre. Puedes reactivarle cuando quieras.
            </p>
          )}
          {confirmModal?.type === 'activate' && (
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              ¿Quieres <strong>reactivar el acceso</strong> de este entrenador?
              Volverá a tener acceso completo a su cuenta.
            </p>
          )}
          {confirmModal?.type === 'activate' && isFull && (
            <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
              ⚠️ No hay licencias disponibles. Suspende o elimina otro entrenador primero.
            </div>
          )}

          <Row style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" $variant="secondary" onClick={() => setConfirmModal(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              $variant={confirmModal?.type === 'remove' ? 'danger' : 'primary'}
              disabled={actionLoading || (confirmModal?.type === 'activate' && isFull)}
              onClick={handleConfirmAction}
            >
              {actionLoading
                ? 'Procesando...'
                : confirmModal?.type === 'remove'
                ? 'Sí, eliminar'
                : confirmModal?.type === 'deactivate'
                ? 'Sí, suspender'
                : 'Sí, reactivar'}
            </Button>
          </Row>
        </Stack>
      </Modal>
    </Page>
  );
}
