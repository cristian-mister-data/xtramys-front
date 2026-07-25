import { registerPlugin } from '@capacitor/core';
import { APPLE_CLIENT_ID, APPLE_REDIRECT_URI } from '@/config';

const AppleSignIn = registerPlugin('AppleSignIn');
const APPLE_JS_URL = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
let sdkPromise;

const loadAppleSdk = () => {
  if (window.AppleID?.auth) return Promise.resolve(window.AppleID);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${APPLE_JS_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.AppleID), { once: true });
      existing.addEventListener('error', () => reject(new Error('APPLE_SDK_UNAVAILABLE')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = APPLE_JS_URL;
    script.async = true;
    script.onload = () => resolve(window.AppleID);
    script.onerror = () => reject(new Error('APPLE_SDK_UNAVAILABLE'));
    document.head.appendChild(script);
  });

  return sdkPromise;
};

const createNonce = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const signInWithAppleWeb = async () => {
  if (!APPLE_CLIENT_ID) throw new Error('APPLE_LOGIN_NOT_CONFIGURED');

  const AppleID = window.AppleID?.auth ? window.AppleID : await loadAppleSdk();
  const nonce = createNonce();
  const state = createNonce();
  AppleID.auth.init({
    clientId: APPLE_CLIENT_ID,
    scope: 'name email',
    redirectURI: APPLE_REDIRECT_URI || `${window.location.origin}/auth/apple/callback`,
    state,
    nonce,
    usePopup: true,
  });

  try {
    const result = await AppleID.auth.signIn();
    const authorization = result?.authorization;
    if (!authorization?.id_token) throw new Error('INVALID_APPLE_CREDENTIAL');
    if (authorization.state !== state) throw new Error('INVALID_APPLE_STATE');
    return {
      identityToken: authorization.id_token,
      authorizationCode: authorization.code,
      nonce,
      givenName: result?.user?.name?.firstName,
      familyName: result?.user?.name?.lastName,
    };
  } catch (error) {
    if (['popup_closed_by_user', 'user_cancelled', 'user_cancelled_authorize'].includes(error?.error)) {
      const cancellation = error instanceof Error ? error : new Error('Sign in with Apple cancelled');
      cancellation.code = 'APPLE_SIGN_IN_CANCELLED';
      throw cancellation;
    }
    throw error;
  }
};

export const signInWithApple = () => AppleSignIn.signIn();
