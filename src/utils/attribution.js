const STORAGE_KEY = 'xtramys_attribution';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

export function captureAttributionFromLocation(location = window.location) {
  const params = new URLSearchParams(location.search);
  const attribution = {};

  UTM_KEYS.forEach((key) => {
    const value = params.get(key);
    if (value) attribution[key] = value;
  });

  if (!Object.keys(attribution).length) return null;

  const stored = {
    ...attribution,
    landingPage: `${location.pathname}${location.search}`,
    referrer: document.referrer || '',
    capturedAt: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return stored;
}

export function getStoredAttribution() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
