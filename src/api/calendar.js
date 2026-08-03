import api from './client';

export const getCalendarStatus = () => api.get('/calendar/status').then((response) => response.data);
export const connectGoogleCalendar = () => api.post('/calendar/google/connect').then((response) => response.data);
export const getGoogleCalendars = () => api.get('/calendar/google/calendars').then((response) => response.data);
export const connectAppleCalendar = (payload) => api.post('/calendar/apple/connect', payload).then((response) => response.data);
export const updateCalendarConnection = (provider, payload) => api.patch(`/calendar/${provider}`, payload).then((response) => response.data);
export const disconnectCalendar = (provider) => api.delete(`/calendar/${provider}`);
export const syncCalendar = (provider) => api.post('/calendar/sync', { provider }).then((response) => response.data);
export const getAppleCalendarEvents = () => api.get('/calendar/events').then((response) => response.data);
export const sendAppleCalendarResults = (results) => api.post('/calendar/apple/sync', { results });
export const getCalendarConflicts = () => api.get('/calendar/conflicts').then((response) => response.data);
export const resolveCalendarConflict = (type, id, payload) => (
  api.post(`/calendar/conflicts/${type}/${id}/resolve`, payload)
);
