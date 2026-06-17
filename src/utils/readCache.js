const normalizeCacheValue = (value) => {
  if (Array.isArray(value)) return value.map(normalizeCacheValue);
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (value[key] !== undefined) acc[key] = normalizeCacheValue(value[key]);
        return acc;
      }, {});
  }
  return value ?? null;
};

export function createReadCache({ ttlMs = 60000 } = {}) {
  const cache = new Map();

  const key = (scope, payload = {}) => `${scope}:${JSON.stringify(normalizeCacheValue(payload))}`;

  const read = (cacheKey, loader) => {
    const now = Date.now();
    const cached = cache.get(cacheKey);

    if (cached?.promise) return cached.promise;
    if (cached && cached.expiresAt > now && Object.prototype.hasOwnProperty.call(cached, 'data')) {
      return Promise.resolve(cached.data);
    }

    const promise = Promise.resolve()
      .then(loader)
      .then(
        (data) => {
          cache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs });
          return data;
        },
        (error) => {
          cache.delete(cacheKey);
          throw error;
        },
      );

    cache.set(cacheKey, {
      data: cached?.data,
      expiresAt: cached?.expiresAt || 0,
      promise,
    });

    return promise;
  };

  const clear = () => cache.clear();

  return { key, read, clear };
}
