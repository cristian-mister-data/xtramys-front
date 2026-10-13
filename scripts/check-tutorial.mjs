import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUTORIAL_TASKS, PLAYER_FIELDS, newTutorial, advanceTask, readTutorialSession, tutorialCreationMiddleware, creationTasks } from '../src/components/shared/tutorialSteps.js';
import { lightTheme, darkTheme } from '../src/theme.js';
const luminance = color => {
  const channels = color.replace('#','').match(/../g).map(value => parseInt(value,16) / 255);
  const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
};
for (const theme of [lightTheme, darkTheme]) {
  for (const [foreground,background] of [['text','surface'],['textSecondary','surface'],['primary','surface'],['onPrimary','primary']]) {
    const values = [luminance(theme.colors[foreground]),luminance(theme.colors[background])].sort((a,b) => b-a);
    assert((values[0]+.05)/(values[1]+.05) >= 4.5, `${theme.mode}: ${foreground}/${background} contrast`);
  }
}
let session = newTutorial('coach');
assert.deepEqual(TUTORIAL_TASKS.map(task => task.id), ['player','exercise','training','rival','match']);
assert.equal(PLAYER_FIELDS.filter(field => field[3]).length, 2);
session = advanceTask(session, 'completed');
session = advanceTask(session, 'skipped');
assert.equal(session.task, 2); assert.equal(session.phase, 0);
assert.deepEqual(session.outcomes, ['completed','skipped','pending','pending','pending']);
globalThis.sessionStorage = {getItem: () => JSON.stringify(session)};
assert.deepEqual(readTutorialSession('coach'), session);
assert.equal(readTutorialSession('other-user'), null);
globalThis.sessionStorage = {getItem: () => '{broken'};
assert.equal(readTutorialSession('coach'), null);
const events = [];
globalThis.window = {dispatchEvent: event => events.push(event.detail)};
globalThis.CustomEvent = class {constructor(name, options) {this.type = name; this.detail = options.detail;}};
const middleware = tutorialCreationMiddleware() (action => action);
for (const type of Object.keys(creationTasks)) {
  middleware({type: type.replace('/fulfilled','/rejected')});
  middleware({type: type.replace('/fulfilled','/pending')});
  middleware({type});
}
assert.deepEqual(events, ['player','exercise','training','rival','match']);
const provider = readFileSync('src/components/shared/TutorialProvider.jsx','utf8');
assert.doesNotMatch(provider, /setVisible\(true\)|autoShownForUserRef/);
assert.match(provider, /tutorialCompleto: true/);
const player = readFileSync('src/components/player/PlayerFormModal.jsx','utf8');
for (const field of PLAYER_FIELDS) assert(player.includes(`data-tutorial="player-${field[0]}"`));
const markers = [['src/pages/Players.jsx','player-open'],['src/vendor/exercise/exerciseList.js','exercise-open'],['src/vendor/exercise/exerciseList.js','exercise-form'],['src/vendor/training/training.js','training-open'],['src/vendor/season/AddEventModal.js','training-form'],['src/features/rivals/Rivals.jsx','rival-open'],['src/features/rivals/Rivals.jsx','rival-form'],['src/vendor/matchSheet/matchSheetList.js','match-open'],['src/vendor/season/EditMatchSheetModal.js','match-form']];
markers.push(['src/pages/MatchSheets.jsx','match-open']);
for (const [file, marker] of markers) assert(readFileSync(file,'utf8').includes(marker), `${file}: missing ${marker}`);
console.log('Guided tutorial: task order, required fields, skips, account-scoped resume, successful saves only, no automatic start, form markers and WCAG AA text contrast passed');
