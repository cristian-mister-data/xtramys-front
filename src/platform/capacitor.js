import { Capacitor } from '@capacitor/core';

export const platform = Capacitor.getPlatform();
export const isNative = Capacitor.isNativePlatform();

export function setNativeDocumentFlags() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.platform = platform;
  document.documentElement.dataset.native = isNative ? 'true' : 'false';
}
