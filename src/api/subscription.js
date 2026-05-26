import api from './client';

export const createCheckoutSession = (successBaseUrl) =>
  api.post('/stripe/create-checkout-session', { successBaseUrl }).then((res) => res.data);

export const createPortalSession = () =>
  api.post('/stripe/create-portal-session').then((res) => res.data);

export const reactivateSubscription = () =>
  api.post('/stripe/reactivate-subscription').then((res) => res.data);

export const getSubscriptionStatus = () =>
  api.get('/stripe/subscription-status').then((res) => res.data);

export const verifyPayPalSubscription = (subscriptionId) =>
  api.post('/paypal/verify-subscription', { subscriptionId }).then((res) => res.data);
