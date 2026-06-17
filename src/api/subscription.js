import api from './client';
import { createReadCache } from '@/utils/readCache';

const subscriptionCache = createReadCache({ ttlMs: 30000 });
const clearSubscriptionCache = () => subscriptionCache.clear();

export const createCheckoutSession = (successBaseUrl, extraData = {}) =>
  api.post('/stripe/create-checkout-session', { successBaseUrl, ...extraData }).then((res) => res.data);

export const createPortalSession = () =>
  api.post('/stripe/create-portal-session').then((res) => res.data);

export const reactivateSubscription = (paymentProvider) =>
  api.post(`/${paymentProvider === 'paypal' ? 'paypal' : 'stripe'}/reactivate-subscription`).then((res) => {
    clearSubscriptionCache();
    return res.data;
  });

export const cancelSubscription = (paymentProvider) =>
  api.post(`/${paymentProvider === 'paypal' ? 'paypal' : 'stripe'}/cancel-subscription`).then((res) => {
    clearSubscriptionCache();
    return res.data;
  });

export const getSubscriptionStatus = () =>
  subscriptionCache.read('subscription:status', () => api.get('/stripe/subscription-status').then((res) => res.data));

export const updateLicenses = (quantity) =>
  api.post('/stripe/update-licenses', { quantity }).then((res) => {
    clearSubscriptionCache();
    return res.data;
  });

export const cancelLicenses = (quantity) =>
  api.post('/stripe/cancel-licenses', { quantity }).then((res) => {
    clearSubscriptionCache();
    return res.data;
  });

export const previewLicenses = (quantity) =>
  api.post('/stripe/preview-licenses', { quantity }).then((res) => res.data);

export const verifyPayPalSubscription = (subscriptionId) =>
  api.post('/paypal/verify-subscription', { subscriptionId }).then((res) => {
    clearSubscriptionCache();
    return res.data;
  });

export const capturePayPalOrder = (orderId) =>
  api.post('/paypal/capture-order', { orderId }).then((res) => {
    clearSubscriptionCache();
    return res.data;
  });
