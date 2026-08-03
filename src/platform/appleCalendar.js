import { registerPlugin } from '@capacitor/core';
import { getAppleCalendarEvents, getCalendarStatus, sendAppleCalendarResults } from '@/api/calendar';
import { isNative, platform } from './capacitor';

const AppleCalendar = registerPlugin('AppleCalendar');
let activeSync;

export const isAppleCalendarAvailable = isNative && platform === 'ios';

export async function requestAppleCalendarAccess() {
  if (!isAppleCalendarAvailable) throw new Error('Apple Calendar solo está disponible en la app para iPhone');
  return AppleCalendar.requestAccess();
}

export async function listAppleCalendars() {
  if (!isAppleCalendarAvailable) return [];
  const { calendars = [] } = await AppleCalendar.listCalendars();
  return calendars;
}

export async function syncAppleCalendar(calendarId) {
  if (!isAppleCalendarAvailable || !calendarId) return null;
  if (activeSync) return activeSync;
  activeSync = (async () => {
    const events = await getAppleCalendarEvents();
    const { results = [] } = await AppleCalendar.syncEvents({ calendarId, events });
    await sendAppleCalendarResults(results);
    return results;
  })();
  try {
    return await activeSync;
  } finally {
    activeSync = null;
  }
}

export async function syncConnectedAppleCalendar() {
  if (!isAppleCalendarAvailable) return null;
  const { apple } = await getCalendarStatus();
  if (!apple?.connected || apple.settings?.automatic === false) return null;
  return syncAppleCalendar(apple.calendarId);
}
