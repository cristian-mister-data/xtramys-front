import { Browser } from '@capacitor/browser';
import { isNative } from './capacitor';

const WEBSITE_URL = import.meta.env.VITE_WEBSITE_URL || 'https://xtramys.com';
const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'https://app.xtramys.com';

export function websiteUrl(language, path = '') {
  const lang = language?.startsWith('en') ? 'en' : 'es';
  return new URL(`/${lang}/${path.replace(/^\/+/, '')}`, WEBSITE_URL).toString();
}

export function webAppUrl(path = '') {
  return new URL(path.replace(/^\/+/, ''), `${WEB_APP_URL.replace(/\/+$/, '')}/`).toString();
}

export function openExternalWeb(url) {
  if (isNative) return Browser.open({ url });
  window.location.assign(url);
  return Promise.resolve();
}
