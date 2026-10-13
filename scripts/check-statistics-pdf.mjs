import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { renderToFile } from '@react-pdf/renderer';
import { getGoalMinuteStats } from '../src/utils/goalMinuteStats.js';
import { safePdfName } from '../src/utils/pdfFilename.js';

const matches = [
  {golesFavor: 3, golesContra: 1, goles: [{minuto: 10},{minuto:'45+2'},{minuto:70}], golesRival:[{minuto:56}]},
  {golesFavor: 3, golesContra: 1, goles: [{minuto:20},{minuto:50},{minuto:'90+3'}], golesRival:[{minuto:73}]},
  {golesFavor: 3, golesContra: 0, goles: [{minuto:5},{minuto:35},{minuto:80}], golesRival:[]},
];
const own = getGoalMinuteStats(matches,'goles','golesFavor');
const rival = getGoalMinuteStats(matches,'golesRival','golesContra');
assert.equal(own.totalTimedGoals,9); assert.equal(own.avgPerMatch,'3.0');
assert.equal(own.avgFirstGoal,'11.7'); assert.equal(own.firstHalfGoals,5); assert.equal(own.secondHalfGoals,4);
assert.equal(own.earliest,5); assert.equal(own.latest,93); assert.equal(own.buckets['31-45'],2);
assert.equal(rival.avgFirstGoal,'64.5'); assert.equal(rival.avgPerMatch,'0.7');
assert.equal(rival.mostDangerousPeriod,'46-60');
const partial = getGoalMinuteStats([{golesFavor:4,goles:[{minuto:0},{minuto:''},{minuto:'abc'},{minuto:'12oops'},{minuto:null}]}],'goles','golesFavor');
assert.equal(partial.totalTimedGoals,1); assert.equal(partial.avgPerMatch,'4.0'); assert.equal(partial.earliest,0);
assert.equal(getGoalMinuteStats([],'goles','golesFavor').hasData,false);
assert.equal(getGoalMinuteStats([{tiempoPorParte:30,goles:[{minuto:'30+2'},{minuto:40}]}],'goles','golesFavor').firstHalfGoals,1);
for (const name of ['Mazarrón','MazarrÃ³n','MazarrA\u0303³n','Mazarrón'.normalize('NFD')]) {
  assert.equal(safePdfName(`Reporte_Estadísticas_Completo_${name}`),'Reporte_Estadísticas_Completo_Mazarrón.pdf');
}
assert.equal(safePdfName('Águilas_Ñandú_⚽.pdf'),'Águilas_Ñandú_⚽.pdf');
assert.equal(safePdfName('Equipo/2026:2027'),'Equipo-2026-2027.pdf');
const directory=resolve('tmp/pdfs'); await mkdir(directory,{recursive:true});
const bundled=await build({entryPoints:['src/vendor/statistics/pdf.js'],bundle:true,write:false,platform:'node',format:'esm',jsx:'automatic',loader:{'.js':'jsx'},external:['react','react/jsx-runtime','@react-pdf/renderer'],plugins:[{name:'stats-pdf-check',setup(builder){
  builder.onResolve({filter:/^@\//},args=>({path:resolve('src',args.path.slice(2)+'.js')}));
  builder.onLoad({filter:/pdfDesign\.js$/},async args=>{
    const source=await readFile(args.path,'utf8');
    const start=source.indexOf('export async function renderPdf('); const end=source.indexOf('// Re-export react-pdf',start);
    return {contents:source.slice(0,start)+'export async function renderPdf(documentElement,fileName) { globalThis.__statisticsDocument = documentElement; globalThis.__statisticsFilename = fileName; }\n'+source.slice(end),loader:'jsx'};
  });
}}]});
const modulePath=resolve(directory,'statistics-check.mjs'); await writeFile(modulePath,bundled.outputFiles[0].text);
const {generateCombinedStatsPdf,generateTeamStatsPdf}=await import(pathToFileURL(modulePath));
const locale=JSON.parse(await readFile('src/locales/es.json','utf8'));
const t=(key,options)=>{
  let value=key.split('.').reduce((object,part)=>object?.[part],locale);
  if(typeof value!=='string') value=typeof options==='string'?options:options?.defaultValue||key;
  if(options&&typeof options==='object') for(const [name,replacement] of Object.entries(options)) value=value.replaceAll(`{{${name}}}`,replacement);
  return value;
};
const stats={team:{matches:3,wins:3,draws:0,losses:0,winRate:100,goalsFor:9,goalsAgainst:2,cleanSheets:1,formations:{'1-4-3-3':3},mostUsedFormation:'1-4-3-3',avgSubs:'4.7',ownGoalStats:own,rivalGoalStats:rival},players:[]};
await generateTeamStatsPdf(stats,'Mazarrón','13 de octubre de 2026',t);
assert.equal(safePdfName(globalThis.__statisticsFilename),'Estadísticas_Equipo_Mazarrón.pdf');
await generateCombinedStatsPdf(stats,[],[],'Mazarrón','13 de octubre de 2026',t);
assert.equal(safePdfName(globalThis.__statisticsFilename),'Reporte_Estadísticas_Completo_Mazarrón.pdf');
if(process.argv.includes('--render')) {
  const output=resolve(directory,'Reporte_Estadísticas_Completo_Mazarrón_PRUEBA.pdf');
  await renderToFile(globalThis.__statisticsDocument,output);
  console.log(`Rendered isolated fixture: ${output}`);
}
console.log('Statistics PDF: goals scored/conceded, stoppage time, short halves, missing minutes, Unicode filenames and both exports passed');
