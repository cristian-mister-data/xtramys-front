import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const login = read('src/pages/auth/Login.jsx');
const register = read('src/pages/auth/Register.jsx');
const verify = read('src/pages/auth/VerifyEmail.jsx');
const app = read('src/App.jsx');
const subscribe = read('src/pages/Subscribe.jsx');
const accountStep = read('src/components/subscription/SubscribeAccountStep.jsx');
const router = read('src/router/AppRouter.jsx');
const langSubscribe = read('src/pages/LangSubscribe.jsx');

assert.match(login, /state=\{\{ from: location\.state\?\.from \}\}/);
assert.match(login, /params\.set\('checkout', '1'\)/);
assert.match(register, /from: location\.state\?\.from/);
assert.match(verify, /returnToSubscribe/);
assert.match(router, /const SubscribeRoute = isNative \?/);
assert.match(router, /: lazy_\(<Subscribe \/>\)/);
assert.doesNotMatch(router, /const SubscribeRoute = \(\s*<ProtectedRoute>/);
assert.match(router, /function ClubSubscribeRedirect\(\)/);
assert.match(router, /params\.set\('plan', 'club'\)/);
assert.match(router, /path="\/suscripcion" element=\{<LangSubscribe lang="es">\{SubscribeRoute\}<\/LangSubscribe>\}/);
assert.match(langSubscribe, /return children/);
assert.doesNotMatch(langSubscribe, /<Navigate/);
assert.match(app, /const language = routeLanguage \|\| userLanguage/);
assert.match(subscribe, /<SubscribeAccountStep/);
assert.match(subscribe, /accountIntent === 'demo'/);
assert.match(subscribe, /navigate\('\/app', \{ replace: true \}\)/);
assert.match(subscribe, /intent=\{accountIntent\}/);
assert.match(subscribe, /!authChecked && !user/);
assert.match(subscribe, /user\.correo/);
assert.match(accountStep, /mode === 'register'/);
assert.match(accountStep, /mode === 'login'/);
assert.match(accountStep, /authApi\.verifyEmail/);
assert.match(accountStep, /intent === 'demo' \? '\/app' : paymentReturnPath\(returnPath\)/);
assert.match(accountStep, /signInWithAppleWeb/);
assert.match(accountStep, /provider: 'apple'/);

console.log('Public web checkout, embedded account flow and native subscription guard OK');
