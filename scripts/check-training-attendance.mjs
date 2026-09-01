import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { didPlayerAttendTraining, isPlayerInTraining } from '../src/utils/trainingAttendance.js';

const legacy = { jugadores: ['1'], jugadoresExtras: [{ _id: '2' }] };
assert.equal(isPlayerInTraining(legacy, '1'), true);
assert.equal(didPlayerAttendTraining(legacy, '1'), true);
assert.equal(didPlayerAttendTraining(legacy, '2'), true);
assert.equal(didPlayerAttendTraining(legacy, '3'), false);

const checked = { ...legacy, asistenciaRegistrada: true, jugadoresAusentes: [{ _id: '2' }] };
assert.equal(didPlayerAttendTraining(checked, '1'), true);
assert.equal(didPlayerAttendTraining(checked, '2'), false);

const detailSource = readFileSync(new URL('../src/vendor/season/TrainingSessionDetailModal.js', import.meta.url), 'utf8');
assert.match(detailSource, /session\.presentPlayers/);
assert.match(detailSource, /session\.absentPlayers/);
assert.match(detailSource, /accessibilityRole="checkbox"/);

const pdfSource = readFileSync(new URL('../src/vendor/training/SessionPDF.js', import.meta.url), 'utf8');
assert.match(pdfSource, /jugadoresPresentesNombres/);
assert.match(pdfSource, /jugadoresAusentesNombres/);
assert.match(pdfSource, /session\.attendanceDefaultPdf/);

const trainingListSource = readFileSync(new URL('../src/vendor/training/training.js', import.meta.url), 'utf8');
assert.match(trainingListSource, /const presentCount = attendanceRoster\.length - absentCount/);
assert.match(trainingListSource, /session\.presentPlayers/);
assert.match(trainingListSource, /session\.absentPlayers/);

console.log('training attendance check ok');
