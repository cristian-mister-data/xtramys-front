import { createPrivateKey, sign } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function checkAppStoreApp(env, request = fetch) {
  const bundleId = env.ARCHIVED_BUNDLE_IDENTIFIER;
  if (!bundleId || bundleId !== env.BUNDLE_IDENTIFIER) {
    throw new Error('El Bundle ID archivado no coincide con BUNDLE_IDENTIFIER. Revisa el proyecto iOS y el secreto de GitHub.');
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const payload = `${encode({ alg: 'ES256', kid: env.APPSTORE_API_KEY_ID, typ: 'JWT' })}.${encode({ iss: env.APPSTORE_ISSUER_ID, iat: issuedAt, exp: issuedAt + 300, aud: 'appstoreconnect-v1' })}`;
  const signature = sign('sha256', Buffer.from(payload), {
    key: createPrivateKey(env.APPSTORE_API_PRIVATE_KEY),
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');
  const url = new URL('https://api.appstoreconnect.apple.com/v1/apps');
  url.searchParams.set('filter[bundleId]', bundleId);
  url.searchParams.set('limit', '1');
  const response = await request(url, {
    headers: { Authorization: `Bearer ${payload}.${signature}` },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const errorResponse = await response.json().catch(() => ({}));
    const details = (errorResponse.errors || []).map(({ code, title, detail }) => [code, title, detail].filter(Boolean).join(': ')).join('; ');
    throw new Error(`App Store Connect respondió HTTP ${response.status}. ${details || 'Apple no proporcionó más detalles.'}`);
  }
  const result = await response.json();
  if (!result.data?.length) {
    throw new Error('La clave API no encuentra una app de App Store Connect con el Bundle ID archivado. Comprueba que la app exista en Mis apps y que la clave pertenezca a esa cuenta y tenga acceso. Registrar el identificador en Apple Developer no crea la app de App Store Connect.');
  }
  console.log('App de App Store Connect encontrada y accesible con la clave API.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await checkAppStoreApp(process.env);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
