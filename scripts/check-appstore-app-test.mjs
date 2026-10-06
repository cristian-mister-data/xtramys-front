import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { checkAppStoreApp } from './check-appstore-app.mjs';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const env = {
  ARCHIVED_BUNDLE_IDENTIFIER: 'com.xtramys.app',
  BUNDLE_IDENTIFIER: 'com.xtramys.app',
  APPSTORE_API_KEY_ID: 'test-key',
  APPSTORE_ISSUER_ID: 'test-issuer',
  APPSTORE_API_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }),
};
await checkAppStoreApp(env, async (url, options) => {
  assert.equal(url.searchParams.get('filter[bundleId]'), 'com.xtramys.app');
  const [header, payload, signature] = options.headers.Authorization.slice(7).split('.');
  assert.equal(verify('sha256', Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')), true);
  assert.equal(JSON.parse(Buffer.from(payload, 'base64url')).iss, 'test-issuer');
  return { ok: true, json: async () => ({ data: [{ id: 'test-app' }] }) };
});
await assert.rejects(checkAppStoreApp({ ...env, ARCHIVED_BUNDLE_IDENTIFIER: 'wrong' }), /Bundle ID/);
await assert.rejects(checkAppStoreApp(env, async () => ({ ok: false, status: 403, json: async () => ({ errors: [{ code: 'FORBIDDEN_ERROR', detail: 'The API key in use does not allow this request' }] }) })), /HTTP 403.*FORBIDDEN_ERROR.*The API key/);
await assert.rejects(checkAppStoreApp(env, async () => ({ ok: true, json: async () => ({ data: [] }) })), /no encuentra una app/);
console.log('App Store app preflight: ok');
