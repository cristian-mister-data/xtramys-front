import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Browser } from '@capacitor/browser';
import { useTranslation } from 'react-i18next';
import {
  connectAppleCalendar,
  connectGoogleCalendar,
  disconnectCalendar,
  getCalendarConflicts,
  getCalendarStatus,
  getGoogleCalendars,
  syncCalendar,
  updateCalendarConnection,
  resolveCalendarConflict,
} from '@/api/calendar';
import {
  isAppleCalendarAvailable,
  listAppleCalendars,
  requestAppleCalendarAccess,
  syncAppleCalendar,
} from '@/platform/appleCalendar';
import { isNative } from '@/platform/capacitor';
import { toast } from '@/ui/toast';
import { confirmAction } from '@/ui/confirm';

const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 20px;
  padding: 24px;
  margin-top: 24px;
`;
const Header = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 16px;
  padding-bottom: 14px;
`;
const Title = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  font-size: 18px;
  margin: 0 0 6px;
`;
const Provider = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 14px;
  padding: 16px;
  & + & { margin-top: 12px; }
`;
const ProviderHeader = styled.div`
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  flex-wrap: wrap;
`;
const Status = styled.span`
  align-items: center;
  display: inline-flex;
  font-size: 13px;
  gap: 6px;
  &::before {
    background: ${({ $connected }) => $connected ? '#10b981' : '#94a3b8'};
    border-radius: 50%;
    content: '';
    height: 9px;
    width: 9px;
  }
`;
const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`;
const Action = styled.button`
  background: ${({ $danger, theme }) => $danger ? 'transparent' : theme.colors.primary};
  border: 1px solid ${({ $danger, theme }) => $danger ? '#ef4444' : theme.colors.primary};
  border-radius: 9px;
  color: ${({ $danger, theme }) => $danger ? '#ef4444' : theme.colors.onPrimary};
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  min-height: 40px;
  padding: 8px 13px;
  &:disabled { cursor: not-allowed; opacity: .55; }
  &:focus-visible { outline: 3px solid #60a5fa; outline-offset: 2px; }
`;
const Select = styled.select`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 9px;
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  min-height: 40px;
  padding: 8px 10px;
  width: 100%;
`;
const Options = styled.fieldset`
  border: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 14px 0 0;
  padding: 0;
  label { align-items: center; cursor: pointer; display: inline-flex; gap: 7px; font-size: 13px; }
  input { height: 18px; width: 18px; }
  legend {
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
    clip: rect(0 0 0 0);
  }
`;
const Help = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 13px;
  line-height: 1.5;
  margin: 6px 0 0;
`;
const Conflict = styled.div`
  background: ${({ theme }) => theme.colors.warningSoft};
  border: 1px solid ${({ theme }) => theme.colors.warning};
  border-radius: 12px;
  color: ${({ theme }) => theme.colors.warningSoftText};
  margin-bottom: 12px;
  padding: 14px;
`;

const emptyStatus = {
  google: { connected: false },
  apple: { connected: false },
};

function relativeDate(value, locale, never) {
  if (!value) return never;
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60_000);
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(minutes, 'minute');
}

export default function CalendarIntegrations() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState(emptyStatus);
  const [googleCalendars, setGoogleCalendars] = useState([]);
  const [appleCalendars, setAppleCalendars] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const [next, nextConflicts] = await Promise.all([getCalendarStatus(), getCalendarConflicts()]);
    setStatus(next);
    setConflicts(nextConflicts);
    if (next.google?.connected) setGoogleCalendars(await getGoogleCalendars());
    if (next.apple?.connected && isAppleCalendarAvailable) {
      setAppleCalendars(await listAppleCalendars().catch(() => []));
    }
  }, []);

  useEffect(() => {
    load().catch(() => toast.error(t('calendarIntegrations.loadError')));
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'google-connected') toast.success(t('calendarIntegrations.googleConnected'));
    if (params.get('calendarError')) toast.error(params.get('calendarError'));
    if (params.has('calendar') || params.has('calendarError')) {
      params.delete('calendar');
      params.delete('calendarError');
      window.history.replaceState({}, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
    }
  }, [load, t]);

  useEffect(() => {
    if (!isNative) return undefined;
    const listener = Browser.addListener('browserFinished', () => load().catch(() => {}));
    return () => { listener.then((handle) => handle.remove()); };
  }, [load]);

  const run = async (key, action, success) => {
    setBusy(key);
    try {
      await action();
      if (success) toast.success(success);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.mensaje || error?.message || t('calendarIntegrations.operationError'));
    } finally {
      setBusy('');
    }
  };

  const connectGoogle = () => run('google-connect', async () => {
    const { url } = await connectGoogleCalendar();
    if (isNative) await Browser.open({ url });
    else window.location.assign(url);
  });

  const connectApple = () => run('apple-connect', async () => {
    await requestAppleCalendarAccess();
    const calendars = await listAppleCalendars();
    setAppleCalendars(calendars);
    const calendar = calendars.find((item) => item.isDefault) || calendars[0];
    if (!calendar) throw new Error(t('calendarIntegrations.noAppleCalendars'));
    await connectAppleCalendar({
      calendarId: calendar.id,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    await syncAppleCalendar(calendar.id);
  }, t('calendarIntegrations.appleConnected'));

  const disconnect = async (provider) => {
    if (!await confirmAction(t('calendarIntegrations.disconnectConfirm'))) return;
    run(`${provider}-disconnect`, () => disconnectCalendar(provider), t('calendarIntegrations.disconnectSuccess'));
  };

  const updateSetting = (provider, change) => run(
    `${provider}-settings`,
    () => updateCalendarConnection(provider, change),
  );

  const manualSync = (provider) => run(`${provider}-sync`, async () => {
    if (provider === 'apple') await syncAppleCalendar(status.apple.calendarId);
    else await syncCalendar('google');
  }, t('calendarIntegrations.syncSuccess'));

  const resolveConflict = (conflict, choice) => run(
    `conflict-${conflict.id}`,
    async () => {
      await resolveCalendarConflict(conflict.type, conflict.id, {
        provider: conflict.provider,
        choice,
      });
      if (choice === 'local' && conflict.provider === 'apple') {
        await syncAppleCalendar(status.apple.calendarId);
      }
    },
    t('calendarIntegrations.conflictResolved'),
  );

  const renderProvider = (provider, name, available = true) => {
    const current = status[provider] || { connected: false };
    const calendars = provider === 'google' ? googleCalendars : appleCalendars;
    return (
      <Provider aria-labelledby={`${provider}-calendar-title`}>
        <ProviderHeader>
          <div>
            <strong id={`${provider}-calendar-title`}>{name}</strong>
            <Help>
              {current.connected
                ? `${current.email || t('calendarIntegrations.connected')} · ${t('calendarIntegrations.lastSync', {
                  date: relativeDate(current.lastSync, i18n.language, t('calendarIntegrations.never')),
                })}`
                : provider === 'apple' && !available
                  ? t('calendarIntegrations.iphoneOnly')
                  : t('calendarIntegrations.notConnected')}
            </Help>
            {current.lastError ? <Help role="alert">{t('calendarIntegrations.error', { message: current.lastError })}</Help> : null}
          </div>
          <Status $connected={current.connected}>
            {current.connected ? t('calendarIntegrations.connected') : t('calendarIntegrations.disconnected')}
          </Status>
        </ProviderHeader>

        {current.connected ? (
          <>
            {calendars.length ? (
              <div style={{ marginTop: 14 }}>
                <label htmlFor={`${provider}-calendar`}>{t('calendarIntegrations.destination')}</label>
                <Select
                  id={`${provider}-calendar`}
                  value={current.calendarId || ''}
                  onChange={(event) => {
                    const calendar = calendars.find((item) => item.id === event.target.value);
                    updateSetting(provider, { calendarId: event.target.value, timeZone: calendar?.timeZone });
                  }}
                  disabled={Boolean(busy)}
                >
                  {calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>{calendar.name}</option>
                  ))}
                </Select>
              </div>
            ) : null}
            <Options>
              <legend>{t('calendarIntegrations.options')}</legend>
              {[
                ['automatic', t('calendarIntegrations.automatic')],
                ['trainings', t('calendarIntegrations.trainings')],
                ['matches', t('calendarIntegrations.matches')],
              ].map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={current.settings?.[key] !== false}
                    onChange={(event) => updateSetting(provider, { [key]: event.target.checked })}
                    disabled={Boolean(busy)}
                  />
                  {label}
                </label>
              ))}
            </Options>
            <Actions>
              <Action type="button" onClick={() => manualSync(provider)} disabled={Boolean(busy)}>
                {busy === `${provider}-sync` ? t('calendarIntegrations.syncing') : t('calendarIntegrations.syncNow')}
              </Action>
              <Action $danger type="button" onClick={() => disconnect(provider)} disabled={Boolean(busy)}>
                {t('calendarIntegrations.disconnect')}
              </Action>
            </Actions>
          </>
        ) : (
          <Actions>
            <Action
              type="button"
              onClick={provider === 'google' ? connectGoogle : connectApple}
              disabled={Boolean(busy) || !available}
            >
              {busy === `${provider}-connect`
                ? t('calendarIntegrations.connecting')
                : t('calendarIntegrations.connect', { provider: name })}
            </Action>
          </Actions>
        )}
      </Provider>
    );
  };

  return (
    <Card>
      <Header>
        <Title>{t('calendarIntegrations.title')}</Title>
        <Help>{t('calendarIntegrations.subtitle')}</Help>
      </Header>
      {conflicts.length ? (
        <div role="alert" aria-live="polite">
          <strong>{t('calendarIntegrations.conflictsTitle')}</strong>
          <Help>{t('calendarIntegrations.conflictsHelp')}</Help>
          {conflicts.map((conflict) => (
            <Conflict key={`${conflict.provider}-${conflict.type}-${conflict.id}`}>
              <div><strong>{conflict.title}</strong> · {conflict.provider === 'google' ? 'Google Calendar' : 'Apple Calendar'}</div>
              <Actions>
                <Action
                  type="button"
                  onClick={() => resolveConflict(conflict, 'local')}
                  disabled={Boolean(busy)}
                >
                  {t('calendarIntegrations.keepXtramys')}
                </Action>
                <Action
                  type="button"
                  onClick={() => resolveConflict(conflict, 'external')}
                  disabled={Boolean(busy)}
                >
                  {t('calendarIntegrations.keepExternal')}
                </Action>
              </Actions>
            </Conflict>
          ))}
        </div>
      ) : null}
      {renderProvider('google', 'Google Calendar')}
      {renderProvider('apple', 'Apple Calendar', isAppleCalendarAvailable)}
    </Card>
  );
}
