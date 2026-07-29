import styled, { useTheme } from 'styled-components';
import { useTranslation } from 'react-i18next';
import Modal from '@/ui/Modal';
import { Stack } from '@/ui/primitives';

const Section = styled.div`
  margin-bottom: 16px;
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme, $color }) => $color || theme.colors.text};
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Item = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  text-align: left;
  margin-bottom: 6px;
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color, theme }) => $color || theme.colors.primary};
  flex-shrink: 0;
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const Sub = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  margin-top: 2px;
`;

const Empty = styled.div`
  text-align: center;
  padding: 24px 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
`;

export default function DayEventsModal({
  open,
  onClose,
  date,
  matches = [],
  sessions = [],
  onMatchPress,
  onSessionPress,
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const dateLabel = date
    ? date.toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={dateLabel || t('season.dayEvents', 'Eventos del día')}
      width={520}
    >
      <Stack $gap={0}>
        {matches.length === 0 && sessions.length === 0 && (
          <Empty>{t('season.noEvents', 'Sin eventos en este día')}</Empty>
        )}

        {matches.length > 0 && (
          <Section>
            <SectionTitle>
              ⚽ {t('season.matchSheets', 'Fichas de partido')} ({matches.length})
            </SectionTitle>
            {matches.map((m) => (
              <Item key={m._id} onClick={() => onMatchPress?.(m)}>
                <Dot $color={m?.torneoId?.color || theme.colors.primary} />
                <Content>
                  <Title>vs {m.rival || '—'}</Title>
                  <Sub>
                    {m?.torneoId?.nombre || (m.competicion === 'amistoso' ? t('matchSheet.friendly', 'Amistoso') : '')}
                    {' • '}
                    {m.ubicacion === 'local' ? t('matchSheet.modals.home', 'Local')
                      : m.ubicacion === 'visitante' ? t('matchSheet.modals.away', 'Visitante')
                      : m.ubicacion === 'neutral' ? t('matchSheet.modals.neutral', 'Neutral')
                      : (m.ubicacion || '—')}
                  </Sub>
                </Content>
              </Item>
            ))}
          </Section>
        )}

        {sessions.length > 0 && (
          <Section>
            <SectionTitle $color={theme.colors.success}>
              🏋 {t('season.trainingSessions', 'Entrenamientos')} ({sessions.length})
            </SectionTitle>
            {sessions.map((s) => (
              <Item key={s._id} onClick={() => onSessionPress?.(s)}>
                <Dot $color={theme.colors.success} />
                <Content>
                  <Title>
                    {t('season.training', 'Entrenamiento')}
                    {s.horaInicio ? ` - ${s.horaInicio}` : ''}
                  </Title>
                  <Sub>
                    {t('season.exercisesCount', {
                      count: (s.ejercicios?.length || 0) + (s.tareasPersonalizadas?.length || 0),
                      defaultValue: `${(s.ejercicios?.length || 0) + (s.tareasPersonalizadas?.length || 0)} ejercicios`,
                    })}
                    {s.horaFin ? ` • ${t('season.until', 'hasta')} ${s.horaFin}` : ''}
                  </Sub>
                </Content>
              </Item>
            ))}
          </Section>
        )}
      </Stack>
    </Modal>
  );
}
