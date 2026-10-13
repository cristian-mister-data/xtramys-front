import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from 'styled-components';
import { readFileSync } from 'node:fs';
import { getNewSeasonName } from '../src/utils/seasonName.js';
import { formatLocalDateTime } from '../src/utils/localDateTime.js';

const previousTimezone = process.env.TZ;
try {
  process.env.TZ = 'Europe/Madrid';
  assert.match(formatLocalDateTime('2026-10-20T09:28:00Z', 'es-ES'), /11:28/);
  assert.match(formatLocalDateTime('2026-12-20T09:28:00Z', 'es-ES'), /10:28/);
  process.env.TZ = 'America/New_York';
  assert.match(formatLocalDateTime('2026-10-20T09:28:00Z', 'es-ES'), /5:28/);
} finally {
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
}

assert.equal(getNewSeasonName('2026-2027', []), '2026-2027');
assert.equal(getNewSeasonName('2026-2027', [{año: '2026-2027'}, {año: '2026-2027 (2)'}]), '2026-2027 (3)');

const require = createRequire(import.meta.url);
const stubs = {
  'react-redux': 'export const useSelector = f => f(globalThis.__trialUi); export const useDispatch = () => () => ({unwrap: async () => {}});',
  'react-i18next': 'export const useTranslation = () => ({i18n: {language: globalThis.__trialUi.lang}});',
  'react-router-dom': 'import React from "react"; export const useNavigate = () => () => {}; export const Link = () => null; export const useLocation = () => ({pathname: "/app"}); export const Navigate = ({to}) => React.createElement("div", {"data-destination": to});',
  '@/store/slices/workspace/workspaceSlice': 'export const fetchWorkspaces = () => ({}); export const selectWorkspace = () => ({});',
  '@/store/slices/user/userSlice': 'export const startSupervision = () => ({});',
  '@/store/slices/season/seasonThunks': 'export const createTemporadaEquipo = {fulfilled: "temporada/createTemporadaEquipo/fulfilled"};',
  '@/api/client': 'export default {};',
  '@/auth/storage': 'export const clearUser = () => globalThis.__activationEvents.push("clear"); export const saveToken = async token => globalThis.__activationEvents.push(token); export const saveUser = user => globalThis.__activationEvents.push(user); export const loadWorkspace = () => null; export const clearWorkspace = () => {}; export const saveWorkspace = () => {};',
  '@/api/auth': 'export const requestTrialActivation = async () => {}; export const activateTrialFromEmail = async credentials => {globalThis.__activationCredentials = credentials; return globalThis.__activationResult;};',
  '@/store/slices/user/userThunks': 'export const fetchMe = () => ({});',
  '@/platform/capacitor': 'export const isNative = true;',
  '@/platform/externalWeb': 'export const openExternalWeb = async () => {}; export const websiteUrl = () => "https://xtramys.com/es/precios";',
};
async function load(file) {
  const output = await build({ entryPoints: [resolve(file)], write: false, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react/jsx-runtime', 'styled-components', '@capacitor/app'], plugins: [{name: 'local-ui-test', setup(builder) {
    builder.onResolve({filter: /.*/}, args => {
      if (stubs[args.path]) return {path: args.path, namespace: 'stub'};
      if (args.path.startsWith('@/')) return {path: resolve('src', args.path.slice(2) + '.js')};
    });
    builder.onLoad({filter: /.*/, namespace: 'stub'}, args => ({contents: stubs[args.path], loader: 'js'}));
  }}] });
  const Module = require('node:module');
  const compiled = new Module(resolve('scripts/ui-test.cjs'));
  compiled.filename = resolve('scripts/ui-test.cjs');
  compiled.paths = require.resolve.paths('react');
  const localRequire = compiled.require.bind(compiled);
  compiled.require = id => id === 'styled-components' ? require(id).default : localRequire(id);
  compiled._compile(output.outputFiles[0].text, compiled.filename);
  return compiled.exports.default;
}
const TrialOffer = await load('src/components/subscription/TrialOffer.jsx');
const Gate = await load('src/components/demo/DemoSubscribeGate.jsx');
const theme = {colors: {surface: '#fff', background: '#fff', text: '#111', border: '#ddd'}};
const account = {role: 'user', plan: 'free', correo: 'coach@example.com', emailVerificado: true, trialEligible: true};
function render(Component, user, props = {}, lang = 'es') {
  globalThis.__trialUi = {usuario: {user}, lang};
  return renderToStaticMarkup(React.createElement(ThemeProvider, {theme}, React.createElement(Component, props)));
}
const initial = render(TrialOffer, account);
const usedEmail = render(TrialOffer, {...account, trialEligible: false, trialStatus: 'used'});
assert.match(usedEmail, /Este correo ya ha utilizado los 7 días gratis/);
assert.match(usedEmail, /Ver planes y comprar/);
assert.doesNotMatch(usedEmail, /Activar 7 días gratis|Reenviar|Empieza cuando|Te enviaremos|caduca/);
assert.match(initial, /Activar 7 días gratis/); assert.match(initial, /Ver planes y comprar/); assert.match(initial, /únicamente cuando confirmes/);
assert.match(render(TrialOffer, {...account, trialStatus: 'awaiting_activation'}), /todavía no ha empezado/);
const cooldown = render(TrialOffer, {...account, trialStatus: 'awaiting_activation', trialActivationRequestedAt: new Date().toISOString()});
assert.match(cooldown, /Reenviar en 30 s/); assert.match(cooldown, /disabled=""/);
assert.match(render(TrialOffer, account, {}, 'en'), /Activate 7 days free/);
const active = {...account, trialStartedAt: new Date(Date.now()-1000).toISOString(), trialEndsAt: new Date(Date.now()+86400000).toISOString(), accessMode: 'trial'};
const TrialStatus = await load('src/components/subscription/TrialStatus.jsx');
const status = render(TrialStatus, active);
assert.match(status, /Tu prueba gratuita está activa/);
assert.match(status, /<time dateTime="/);
assert.match(status, /Sin tarjeta ni cobros automáticos/);
assert.match(render(TrialStatus, active, {}, 'en'), /Your free trial is active/);
assert.equal(render(TrialStatus, {...active, plan: 'pro', subscriptionStatus: 'active', accessMode: 'full'}), '');
assert.match(render(TrialOffer, active), /Abrir aplicación/);
const children = React.createElement('p', null, 'PRIVATE CONTENT');
for (const feature of ['nutrition','methodology','goalkeeperMethodology']) {
  const html = render(Gate, active, {feature, children});
  assert.doesNotMatch(html, /PRIVATE CONTENT/); assert.match(html, /Ver planes y comprar/);
  assert.match(render(Gate, {...active, plan: 'pro', subscriptionStatus: 'active', accessMode: 'full'}, {feature, children}), /PRIVATE CONTENT/);
}
assert.match(render(Gate, active, {children}), /PRIVATE CONTENT/);
const expired = render(TrialOffer, {...active, trialEndsAt: new Date(Date.now()-1).toISOString()});
assert.match(expired, /Tu trabajo se conserva/); assert.doesNotMatch(expired, /Activar 7 días gratis/); assert.match(expired, /Ver planes y comprar/);
const confirmation = readFileSync('../xtramys-web/src/app/[lang]/auth/trial/client.tsx', 'utf8');
assert.match(confirmation, /getAppUrl\(\).*\/auth\/trial.*window.location.hash/);
const ActivateTrial = await load('src/pages/auth/ActivateTrial.jsx');
const effects = [];
const originalEffect = React.useEffect;
React.useEffect = effect => effects.push(effect);
globalThis.__activationEvents = [];
globalThis.__activationResult = {token: 'new-session', usuario: active};
const browserWindow = globalThis.window;
globalThis.window = {location: {hash: `#correo=coach%40example.com&token=${'a'.repeat(64)}`, replace: path => globalThis.__activationEvents.push(path)}};
try {
  render(ActivateTrial, account);
  effects.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(globalThis.__activationCredentials, {correo: account.correo, token: 'a'.repeat(64)});
  assert.deepEqual(globalThis.__activationEvents, ['clear', 'new-session', active, '/app']);
  effects.forEach(effect => effect());
  assert.equal(globalThis.__activationEvents.length, 4);
  effects.length = 0;
  globalThis.__activationEvents = [];
  globalThis.__activationResult = {token: 'new-session', usuario: account};
  render(ActivateTrial, account);
  effects.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(globalThis.__activationEvents, []);
} finally { React.useEffect = originalEffect; globalThis.window = browserWindow; }
const WorkspaceGate = await load('src/router/WorkspaceGate.jsx');
const TeamSelect = await load('src/pages/TeamSelect.jsx');
const previousSessionStorage = globalThis.sessionStorage;
globalThis.sessionStorage = {getItem: () => null};
try {
  for (const user of [active, {...account, plan: 'pro', subscriptionStatus: 'active', accessMode: 'full'}]) {
    globalThis.__trialUi = {usuario: {user}, workspace: {items: [], selected: null, loaded: true, loading: false, error: null}, lang: 'es'};
    for (const Component of [WorkspaceGate, TeamSelect]) {
      const html = renderToStaticMarkup(React.createElement(ThemeProvider, {theme}, React.createElement(Component, {}, children)));
      assert.match(html, /data-destination="\/season\/create"/);
    }
    globalThis.__trialUi.workspace.selected = {team: {_id: 'existing-team'}};
    assert.match(renderToStaticMarkup(React.createElement(WorkspaceGate, {}, children)), /PRIVATE CONTENT/);
    globalThis.__trialUi.usuario.user = {...user, trialSetupRequired: true};
    globalThis.__trialUi.workspace.items = [{team: {_id: 'existing-team'}}];
    for (const Component of [WorkspaceGate, TeamSelect]) {
      const html = renderToStaticMarkup(React.createElement(ThemeProvider, {theme}, React.createElement(Component, {}, children)));
      assert.match(html, /data-destination="\/season\/create"/);
      assert.doesNotMatch(html, /PRIVATE CONTENT/);
    }
  }
  globalThis.__trialUi.usuario.user = {...active, clubId: 'club'};
  globalThis.__trialUi.workspace.selected = null;
  assert.match(renderToStaticMarkup(React.createElement(WorkspaceGate, {}, children)), /data-destination="\/team-select"/);
  globalThis.__trialUi.usuario.user = active;
  globalThis.__trialUi.workspace.error = 'API unavailable';
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(WorkspaceGate, {}, children)), /\/season\/create/);
  const workspaceReducer = await load('src/store/slices/workspace/workspaceSlice.js');
  const refreshed = workspaceReducer({items: [], selected: null, loaded: true, loading: false, error: null}, {type: 'temporada/createTemporadaEquipo/fulfilled', payload: {}});
  assert.equal(refreshed.loaded, false);
  const selected = workspaceReducer(refreshed, {type: 'workspace/list/fulfilled', payload: {
    selectedTeamId: 'new-team', workspaces: [{team: {_id: 'demo-team'}}, {team: {_id: 'new-team'}}],
  }});
  assert.equal(selected.selected.team._id, 'new-team');
} finally { globalThis.sessionStorage = previousSessionStorage; }
console.log('Trial UI: automatic activation, session persistence, redirect, cooldown, paid gates and expiry passed');
