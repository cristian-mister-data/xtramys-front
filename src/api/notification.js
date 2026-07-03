import api, { apiBase } from './client';

export const NOTIFICATION_CHANGED_EVENT = 'xtramys:notifications-changed';
export const notifyNotificationsChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
};
const changed = (promise) => promise.then((result) => {
  notifyNotificationsChanged();
  return result;
});

export const acceptFriendRequestByToken = (token) => apiBase.get(`/api/friendship/accept-by-token/${token}`);
export const getNotifications = (params) => api.get('/notification', { params, skipCache: true });
export const getUnreadCount = () => api.get('/notification/unread-count', { skipCache: true });
export const markAsRead = (id) => changed(api.put(`/notification/${id}/read`));
export const markAllAsRead = () => changed(api.put('/notification/read-all'));
export const deleteNotification = (id) => changed(api.delete(`/notification/${id}`));
export const deleteAllNotifications = () => changed(api.delete('/notification/all'));
