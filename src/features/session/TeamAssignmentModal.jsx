import { useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdClose } from 'react-icons/md';
import Modal from '@/ui/Modal';
import { Button, Row, Muted } from '@/ui/primitives';

export const TEAM_COLORS = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

const TeamBlock = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
`;

const TeamHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

const Badge = styled.div`
  width: 28px; height: 28px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  color: #fff;
  font-weight: 800;
  font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
`;

const TeamTitle = styled.div`
  font-weight: 700;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text};
`;

const Pool = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid ${({ $sel, $color, theme }) => ($sel ? $color : theme.colors.border)};
  background: ${({ $sel, $color, theme }) => ($sel ? $color : theme.colors.surface)};
  color: ${({ $sel, theme }) => ($sel ? '#fff' : theme.colors.text)};
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  opacity: ${({ $disabled }) => ($disabled ? 0.4 : 1)};
  pointer-events: ${({ $disabled }) => ($disabled ? 'none' : 'auto')};
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  &:focus-visible { outline: none; box-shadow: ${({ theme }) => theme.shadows.focus}; }
`;

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 6px;
`;

function buildEmpty(equipos) {
  return Array.from({ length: equipos }, (_, i) => ({
    teamNumber: i + 1,
    players: [],
    extraPlayers: [],
  }));
}

export default function TeamAssignmentModal({
  open,
  onClose,
  exercise,
  rosterPlayers = [],
  extraPlayers = [],
  initialAssignments = [],
  onConfirm,
}) {
  const { t } = useTranslation();
  const equipos = exercise?.equipos || 0;
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    if (!open) return;
    if (initialAssignments && initialAssignments.length === equipos) {
      // deep clone to avoid mutating redux frozen state
      setAssignments(initialAssignments.map((a) => ({
        teamNumber: a.teamNumber,
        players: [...(a.players || [])],
        extraPlayers: [...(a.extraPlayers || [])],
      })));
    } else {
      setAssignments(buildEmpty(equipos));
    }
  }, [open, equipos]); // eslint-disable-line react-hooks/exhaustive-deps

  const usedRoster = useMemo(() => {
    const m = new Map();
    assignments.forEach((a) => a.players.forEach((id) => m.set(id, a.teamNumber)));
    return m;
  }, [assignments]);

  const usedExtras = useMemo(() => {
    const m = new Map();
    assignments.forEach((a) => a.extraPlayers.forEach((id) => m.set(id, a.teamNumber)));
    return m;
  }, [assignments]);

  const togglePlayer = (teamNumber, playerId, isExtra) => {
    setAssignments((prev) => prev.map((a) => {
      if (a.teamNumber !== teamNumber) return a;
      const list = isExtra ? a.extraPlayers : a.players;
      const next = list.includes(playerId)
        ? list.filter((x) => x !== playerId)
        : [...list, playerId];
      return isExtra ? { ...a, extraPlayers: next } : { ...a, players: next };
    }));
  };

  const clearAll = () => setAssignments(buildEmpty(equipos));

  const playerName = (p) => p.nombre || p.apellidos || '?';

  if (!exercise) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('session.assignTeams', 'Asignar equipos')}
      width={620}
      footer={
        <Row style={{ justifyContent: 'space-between', width: '100%' }}>
          <Button type="button" $variant="ghost" onClick={clearAll}>
            <MdClose /> {t('session.clearTeams', 'Limpiar')}
          </Button>
          <Row style={{ gap: 8 }}>
            <Button type="button" $variant="ghost" onClick={onClose}>
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                onConfirm?.(assignments);
                onClose?.();
              }}
            >
              {t('common.confirm', 'Confirmar')}
            </Button>
          </Row>
        </Row>
      }
    >
      <Muted style={{ marginBottom: 10 }}>
        {t('session.assignTeamsHelp', 'Asigna jugadores a cada equipo. Un jugador no puede estar en dos equipos a la vez.')}
      </Muted>

      {assignments.map((a) => {
        const color = TEAM_COLORS[(a.teamNumber - 1) % TEAM_COLORS.length];
        return (
          <TeamBlock key={a.teamNumber}>
            <TeamHeader>
              <Badge $color={color}>{a.teamNumber}</Badge>
              <TeamTitle>
                {t('session.teamN', 'Equipo {{n}}', { n: a.teamNumber })}
              </TeamTitle>
              <Muted style={{ marginLeft: 'auto', fontSize: 12 }}>
                {a.players.length + a.extraPlayers.length} {t('session.players', 'jugadores')}
              </Muted>
            </TeamHeader>

            {rosterPlayers.length > 0 && (
              <>
                <SectionLabel>{t('session.roster', 'Plantilla')}</SectionLabel>
                <Pool style={{ marginBottom: 8 }}>
                  {rosterPlayers.map((p) => {
                    const sel = a.players.includes(p._id);
                    const usedBy = usedRoster.get(p._id);
                    const disabled = usedBy && usedBy !== a.teamNumber;
                    return (
                      <Chip
                        key={p._id}
                        type="button"
                        $sel={sel}
                        $color={color}
                        $disabled={disabled}
                        onClick={() => togglePlayer(a.teamNumber, p._id, false)}
                      >
                        {p.dorsal ? `${p.dorsal} · ` : ''}{playerName(p)}
                      </Chip>
                    );
                  })}
                </Pool>
              </>
            )}

            {extraPlayers.length > 0 && (
              <>
                <SectionLabel>{t('session.extras', 'Extras')}</SectionLabel>
                <Pool>
                  {extraPlayers.map((p) => {
                    const sel = a.extraPlayers.includes(p._id);
                    const usedBy = usedExtras.get(p._id);
                    const disabled = usedBy && usedBy !== a.teamNumber;
                    return (
                      <Chip
                        key={p._id}
                        type="button"
                        $sel={sel}
                        $color={color}
                        $disabled={disabled}
                        onClick={() => togglePlayer(a.teamNumber, p._id, true)}
                      >
                        {playerName(p)}
                      </Chip>
                    );
                  })}
                </Pool>
              </>
            )}
          </TeamBlock>
        );
      })}
    </Modal>
  );
}
