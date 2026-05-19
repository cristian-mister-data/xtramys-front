// Find/replace masivo de imports relativos en src/vendor.
// Patrones cubren todas las variantes detectadas.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(name)) out.push(p);
  }
  return out;
}
const files = walk('src/vendor');
const RX = [
  // redux/slices/* → @/store/slices/*
  [/from ['"](?:\.\.\/)+redux\/slices\//g, "from '@/store/slices/"],
  [/from ['"](?:\.\.\/)+redux\/rootReducer['"]/g, "from '@/store/rootReducer'"],
  [/from ['"](?:\.\.\/)+redux\//g, "from '@/store/"],
  // utils
  [/from ['"](?:\.\.\/)+utils\//g, "from '@/utils/"],
  // data
  [/from ['"](?:\.\.\/)+data\//g, "from '@/data/"],
  // config
  [/from ['"](?:\.\.\/)+config['"]/g, "from '@/config'"],
  // i18n
  [/from ['"](?:\.\.\/)+i18n['"]/g, "from '@/i18n'"],
  // shared con multi nivel
  [/from ['"](?:\.\.\/)+shared\//g, "from '@/vendor/shared/"],
  // appLayout / customAlert / ProfessionalHeader top-level
  [/from ['"](?:\.\.\/)+appLayout['"]/g, "from '@/vendor/shared/appLayout'"],
  [/from ['"](?:\.\.\/)+customAlert['"]/g, "from '@/vendor/shared/customAlert'"],
  [/from ['"](?:\.\.\/)+ProfessionalHeader['"]/g, "from '@/vendor/shared/ProfessionalHeader'"],
  [/from ['"](?:\.\.\/)+RivalSelector['"]/g, "from '@/vendor/shared/RivalSelector'"],
  [/from ['"](?:\.\.\/)+ConnectionErrorModal['"]/g, "from '@/vendor/shared/ConnectionErrorModal'"],
  [/from ['"](?:\.\.\/)+ErrorBoundary['"]/g, "from '@/vendor/shared/ErrorBoundary'"],
  [/from ['"](?:\.\.\/)+ExerciseSelectorModal['"]/g, "from '@/vendor/shared/ExerciseSelectorModal'"],
  [/from ['"](?:\.\.\/)+StrengthExerciseSelectorModal['"]/g, "from '@/vendor/shared/StrengthExerciseSelectorModal'"],
  [/from ['"](?:\.\.\/)+StrengthExerciseViewer['"]/g, "from '@/vendor/shared/StrengthExerciseViewer'"],
  [/from ['"](?:\.\.\/)+VideoPreviewScreen['"]/g, "from '@/vendor/shared/VideoPreviewScreen'"],
  [/from ['"](?:\.\.\/)+OnboardingTutorial['"]/g, "from '@/vendor/shared/OnboardingTutorial'"],
  [/from ['"](?:\.\.\/)+FolderPickerModal['"]/g, "from '@/vendor/shared/FolderPickerModal'"],
  // tacticalBoard
  [/from ['"](?:\.\.\/)+tacticalBoard\//g, "from '@/vendor/tacticalBoard/"],
  // season
  [/from ['"](?:\.\.\/)+season\//g, "from '@/vendor/season/"],
  // matchSheet
  [/from ['"](?:\.\.\/)+matchSheet\//g, "from '@/vendor/matchSheet/"],
  // exercise / strategy / anthropometry / etc
  [/from ['"](?:\.\.\/)+exercise\//g, "from '@/vendor/exercise/"],
  [/from ['"](?:\.\.\/)+strategy\//g, "from '@/vendor/strategy/"],
  [/from ['"](?:\.\.\/)+anthropometry\//g, "from '@/vendor/anthropometry/"],
  [/from ['"](?:\.\.\/)+session\//g, "from '@/vendor/training/"],
  [/from ['"](?:\.\.\/)+wellness\//g, "from '@/vendor/wellness/"],
  [/from ['"](?:\.\.\/)+injuries\//g, "from '@/vendor/injuries/"],
  [/from ['"](?:\.\.\/)+statistics\//g, "from '@/vendor/statistics/"],
  [/from ['"](?:\.\.\/)+myVideos\//g, "from '@/vendor/myVideos/"],
  [/from ['"](?:\.\.\/)+createSeason\//g, "from '@/vendor/createSeason/"],
  // player
  [/from ['"](?:\.\.\/)+player\//g, "from '@/components/player/"],
  // NetworkContext (may not exist; map to a stub later if needed)
  [/from ['"](?:\.\.\/)+utils\/NetworkContext['"]/g, "from '@/utils/NetworkContext'"],
];

let changed = 0;
for (const f of files) {
  let s = readFileSync(f, 'utf8');
  const orig = s;
  for (const [rx, rep] of RX) s = s.replace(rx, rep);
  if (s !== orig) { writeFileSync(f, s); changed++; }
}
