import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap((name) => {
    if (['build', 'Pods', 'DerivedData'].includes(name)) return [];
    const child = join(path, name);
    return statSync(child).isDirectory() ? files(child) : [child];
  });
}

const nativeCode = ['android/app', 'ios/App', 'native']
  .flatMap(files)
  .filter((path) => /\.(gradle|java|kt|swift|pbxproj)$/.test(path))
  .map((path) => readFileSync(path, 'utf8'))
  .join('\n');

assert.doesNotMatch(nativeCode, /StoreBilling|billingclient|apps\.apple\.com\/account\/subscriptions|play\.google\.com\/store\/account\/subscriptions/i);

const router = readFileSync('src/router/AppRouter.jsx', 'utf8');
assert.doesNotMatch(router, /ExternalWebRedirect/);
assert.match(router, /const SubscribeRoute = isNative \? \([\s\S]*?<Navigate to="\/profile" replace \/>[\s\S]*?\) : lazy_\(<Subscribe \/>\)/);
assert.match(router, /isNative \? <Navigate to="\/auth\/login" replace \/>/);

const login = readFileSync('src/pages/auth/Login.jsx', 'utf8');
assert.match(login, /!isNative && <SocialButton/);
assert.doesNotMatch(login, /auth\/register\?source=app/);

const profile = readFileSync('src/pages/Profile.jsx', 'utf8');
assert.doesNotMatch(profile, /websiteUrl\(i18n\.language, '\/(profile|precios)'/);
assert.match(profile, /deletion-request/);

console.log('Mobile store-compliance boundary OK');
