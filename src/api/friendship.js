import api from './client';

export const sendFriendRequest = (email) => api.post('/friendship/send', { email });
export const acceptFriendRequest = (id) => api.post(`/friendship/${id}/accept`);
export const rejectFriendRequest = (id) => api.post(`/friendship/${id}/reject`);
export const removeFriend = (id) => api.delete(`/friendship/${id}`);
export const getFriends = () => api.get('/friendship/list');
export const getPendingRequests = () => api.get('/friendship/pending');
export const getSentRequests = () => api.get('/friendship/sent');
export const cancelSentRequest = (id) => api.delete(`/friendship/sent/${id}`);
