import api, { apiBase } from './client';

export const NOTIFICATION_CHANGED_EVENT = 'xtramys:notifications-changed';
export const notifyNotificationsChanged = (detail) => {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(NOTIFICATION_CHANGED_EVENT, { detail }));
};
const changed = (promise) => promise.then((result) => {
  notifyNotificationsChanged();
  return result;
});

let unreadCache = { at: 0, data: null };
let unreadInFlight = null;

export const acceptFriendRequestByToken = (token) => apiBase.get(`/api/friendship/accept-by-token/${token}`);
export const getNotifications = (params) => api.get('/notification', { params, skipCache: true });
export const getUnreadCount = ({ force = false } = {}) => {
  const fresh = Date.now() - unreadCache.at < 30000;
  if (!force && unreadCache.data && fresh) return Promise.resolve(unreadCache.data);
  if (!force && unreadInFlight) return unreadInFlight;
  unreadInFlight = api.get('/notification/unread-count', { skipCache: true })
    .then((res) => {
      unreadCache = { at: Date.now(), data: res };
      return res;
    })
    .finally(() => { unreadInFlight = null; });
  return unreadInFlight;
};
export const markAsRead = (id) => changed(api.put(`/notification/${id}/read`));
export const markAllAsRead = () => changed(api.put('/notification/read-all'));
export const deleteNotification = (id) => changed(api.delete(`/notification/${id}`));
export const deleteAllNotifications = () => changed(api.delete('/notification/all'));
