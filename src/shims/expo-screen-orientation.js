/** Shim no-op de expo-screen-orientation para web. */
export const Orientation = {
  PORTRAIT: 1, PORTRAIT_UP: 2, PORTRAIT_DOWN: 3,
  LANDSCAPE: 4, LANDSCAPE_LEFT: 5, LANDSCAPE_RIGHT: 6,
  UNKNOWN: 0,
};
export const OrientationLock = {
  DEFAULT: 0, ALL: 1, PORTRAIT: 2, PORTRAIT_UP: 3, PORTRAIT_DOWN: 4,
  LANDSCAPE: 5, LANDSCAPE_LEFT: 6, LANDSCAPE_RIGHT: 7, OTHER: 8, UNKNOWN: 9,
};
export async function lockAsync() { return; }
export async function unlockAsync() { return; }
export async function getOrientationAsync() { return Orientation.PORTRAIT; }
export async function getOrientationLockAsync() { return OrientationLock.DEFAULT; }
export function addOrientationChangeListener() { return { remove() {} }; }
export function removeOrientationChangeListener() {}
export function removeOrientationChangeListeners() {}
export default {
  Orientation, OrientationLock, lockAsync, unlockAsync,
  getOrientationAsync, getOrientationLockAsync,
  addOrientationChangeListener, removeOrientationChangeListener, removeOrientationChangeListeners,
};
