import { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdChevronLeft, MdChevronRight, MdSportsSoccer, MdFitnessCenter } from 'react-icons/md';
import { useSelector, useDispatch } from 'react-redux';
import { setCalendarDate } from '@/store/slices/season/seasonSlice';

const Wrap = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 16px;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const NavBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 8px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const TodayBtn = styled.button`
  padding: 6px 12px;
  margin-left: 8px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const MonthLabel = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  text-transform: capitalize;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`;

const DayHeader = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
  padding: 6px 0;
`;

const Cell = styled.div`
  background: ${({ theme, $today, $other }) =>
    $other ? theme.colors.backgroundAlt : $today ? '#eff6ff' : theme.colors.surface};
  border: 1px solid ${({ theme, $today }) => $today ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  min-height: 110px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  opacity: ${({ $other }) => $other ? 0.55 : 1};
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  overflow: hidden;
  transition: box-shadow 0.1s, transform 0.05s;
  &:hover {
    ${({ $clickable }) => $clickable && 'box-shadow: 0 2px 8px rgba(0,0,0,0.08); transform: translateY(-1px);'}
  }

  @media (max-width: 600px) {
    min-height: 80px;
  }
`;

const DayNum = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme, $today }) => $today ? theme.colors.primary : theme.colors.text};
  margin-bottom: 2px;
  padding: 0 2px;
`;

const ChipList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-height: 0;
`;

const Chip = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 5px;
  border-radius: 4px;
  border: 0;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  font-size: 10px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  border-left: 3px solid ${({ $color }) => $color};
  &:hover { filter: brightness(0.95); }

  & > svg { flex-shrink: 0; }
  & > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
`;

const MoreLink = styled.button`
  background: transparent;
  border: 0;
  font-size: 10px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
  cursor: pointer;
  text-align: left;
  padding: 2px 4px;
  &:hover { text-decoration: underline; }
`;

const Loading = styled.div`
  text-align: center;
  padding: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
`;

const Legend = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const LegendDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
`;

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function sameDay(a, b) { return a && b && a.toDateString() === b.toDateString(); }

function buildGrid(refDate) {
  const first = startOfMonth(refDate);
  const offset = (first.getDay() + 6) % 7; // lunes primero
  const start = new Date(first);
  start.setDate(start.getDate() - offset);
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

function indexEvents(matchSheets, sessions) {
  const map = new Map();
  const get = (date) => {
    const k = new Date(date).toDateString();
    if (!map.has(k)) map.set(k, { matches: [], sessions: [] });
    return map.get(k);
  };
  (matchSheets || []).forEach((m) => {
    const date = m?.fechaHora || m?.fecha;
    if (!date) return;
    get(date).matches.push(m);
  });
  (sessions || []).forEach((s) => {
    if (!s?.fecha) return;
    get(s.fecha).sessions.push(s);
  });
  return map;
}

function withAlpha(hex, alpha = '20') {
  if (!hex || typeof hex !== 'string') return '#dbeafe';
  if (hex.startsWith('#') && (hex.length === 7 || hex.length === 4)) return hex + alpha;
  return hex;
}

const MAX_VISIBLE = 3;

export default function SeasonCalendar({
  matchSheets = [],
  trainingSessions = [],
  loading,
  onDayPress,
  onMatchPress,
  onSessionPress,
}) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const savedCalendarDate = useSelector((state) => state.season.calendarDate);
  const [refDate, setRefDate] = useState(() => 
    savedCalendarDate ? new Date(savedCalendarDate) : startOfMonth(new Date())
  );
  
  useEffect(() => {
    dispatch(setCalendarDate(refDate.toISOString()));
  }, [refDate, dispatch]);

  const cells = useMemo(() => buildGrid(refDate), [refDate]);
  const events = useMemo(
    () => indexEvents(matchSheets, trainingSessions),
    [matchSheets, trainingSessions]
  );
  const today = new Date();
  const locale = i18n.language === 'en' ? 'en-US' : 'es-ES';
  const monthLabel = refDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const dayNames = (() => {
    const base = new Date(2024, 0, 1); // lunes
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale, { weekday: 'short' });
    });
  })();

  const handleChipClick = (e, fn, item) => {
    e.stopPropagation();
    fn?.(item);
  };

  return (
    <Wrap>
      <Toolbar>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavBtn onClick={() => setRefDate((d) => addMonths(d, -1))} aria-label="prev">
            <MdChevronLeft size={20} />
          </NavBtn>
          <NavBtn onClick={() => setRefDate((d) => addMonths(d, 1))} aria-label="next">
            <MdChevronRight size={20} />
          </NavBtn>
          <TodayBtn onClick={() => setRefDate(startOfMonth(new Date()))}>
            {t('common.today', 'Hoy')}
          </TodayBtn>
        </div>
        <MonthLabel>{monthLabel}</MonthLabel>
        <div style={{ width: 120 }} />
      </Toolbar>

      <Grid>
        {dayNames.map((n) => <DayHeader key={n}>{n}</DayHeader>)}
        {cells.map((d) => {
          const ev = events.get(d.toDateString());
          const isOther = d.getMonth() !== refDate.getMonth();
          const isToday = sameDay(d, today);
          const allItems = ev ? [
            ...ev.matches.map((m) => ({ kind: 'match', item: m })),
            ...ev.sessions.map((s) => ({ kind: 'session', item: s })),
          ] : [];
          const hasEvents = allItems.length > 0;
          const visible = allItems.slice(0, MAX_VISIBLE);
          const more = allItems.length - visible.length;

          return (
            <Cell
              key={d.toISOString()}
              $other={isOther}
              $today={isToday}
              $clickable={hasEvents}
              onClick={() => hasEvents && onDayPress?.({ date: d, events: ev })}
            >
              <DayNum $today={isToday}>{d.getDate()}</DayNum>
              <ChipList>
                {visible.map(({ kind, item }) => {
                  if (kind === 'match') {
                    const color = item?.torneoId?.color || '#3b82f6';
                    return (
                      <Chip
                        key={`m-${item._id}`}
                        $bg={withAlpha(color, '22')}
                        $color={color}
                        onClick={(e) => handleChipClick(e, onMatchPress, item)}
                        title={`vs ${item.rival || '—'}`}
                      >
                        <MdSportsSoccer size={11} />
                        <span>vs {item.rival || '—'}</span>
                      </Chip>
                    );
                  }
                  return (
                    <Chip
                      key={`s-${item._id}`}
                      $bg="#d1fae5"
                      $color="#059669"
                      onClick={(e) => handleChipClick(e, onSessionPress, item)}
                      title={t('season.training', 'Entrenamiento')}
                    >
                      <MdFitnessCenter size={11} />
                      <span>{item.horaInicio || t('season.training', 'Entreno')}</span>
                    </Chip>
                  );
                })}
                {more > 0 && (
                  <MoreLink
                    onClick={(e) => { e.stopPropagation(); onDayPress?.({ date: d, events: ev }); }}
                  >
                    +{more} {t('season.more', 'más')}
                  </MoreLink>
                )}
              </ChipList>
            </Cell>
          );
        })}
      </Grid>

      <Legend>
        <LegendItem>
          <LegendDot $color="#3b82f6" />
          {t('season.match', 'Partido')}
        </LegendItem>
        <LegendItem>
          <LegendDot $color="#10b981" />
          {t('season.training', 'Entrenamiento')}
        </LegendItem>
      </Legend>

      {loading && <Loading>{t('common.loading', 'Cargando...')}</Loading>}
    </Wrap>
  );
}
