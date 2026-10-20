import { useTranslation } from 'react-i18next';
import { FORMATION_POSITIONS } from '@/vendor/matchSheet/LineupEditor';
import { getPlayerFullName, getPlayerFirstName } from '@/utils/playerHelpers';
import { normalizeFormation } from '@/features/rivalAnalysis/rivalAnalysisData';
import { normalizeKits } from '@/utils/kits';
import { getDefaultFormation } from '@/vendor/matchSheet/useMatchSheetForm';

const id = (value) => String(value?._id || value || '');

export default function MatchLineupPitch({ sheet }) {
  const { t } = useTranslation();
  const starters = sheet.alineacionTitulares || [];
  const formation = normalizeFormation(
    sheet.alineacion || getDefaultFormation(sheet.equipo?.jugadoresPorEquipo || 11),
  );
  const positions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['1-4-4-2'];
  const kits = normalizeKits(sheet.equipo?.equipaciones);
  const kit = sheet.equipacionPropia || kits[sheet.equipacionPropiaKey || 'first'];
  return (
    <>
      <div
        className="match-lineup-pitch"
        role="img"
        aria-label={`${t('matchPresentation.starters')}: ${formation}. ${starters.map(getPlayerFullName).join(', ')}`}
      >
        <svg viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="match-grass" width="166.66" height="640" patternUnits="userSpaceOnUse">
              <rect width="83.33" height="640" fill="#337640" />
              <rect x="83.33" width="83.33" height="640" fill="#3c8049" />
            </pattern>
          </defs>
          <rect width="1000" height="640" fill="url(#match-grass)" />
          <g fill="none" stroke="#edf8e9" strokeWidth="3">
            <rect x="25" y="25" width="950" height="590" />
            <path d="M500 25V615" />
            <circle cx="500" cy="320" r="75" />
            <path d="M25 170H170V470H25 M975 170H830V470H975 M25 245H80V395H25 M975 245H920V395H975" />
          </g>
          <g fill="#edf8e9">
            <circle cx="500" cy="320" r="4" />
            <circle cx="120" cy="320" r="4" />
            <circle cx="880" cy="320" r="4" />
          </g>
        </svg>
        {starters.map((player, index) => {
          const saved = (sheet.posicionesVisuales || []).find(
            (pos) => id(pos.player) === id(player),
          );
          const position = saved || positions[index] || { x: 50, y: 50 };
          const x = Number.isFinite(Number(position.x))
            ? Math.min(88, Math.max(12, Number(position.x)))
            : 50;
          const y = Number.isFinite(Number(position.y))
            ? Math.min(94, Math.max(6, Number(position.y)))
            : 50;
          return (
            <div
              className="match-pitch-player"
              key={id(player)}
              style={{ left: `${100 - y}%`, top: `${x}%` }}
              title={getPlayerFullName(player)}
              aria-hidden="true"
            >
              <svg viewBox="0 0 56 56" className="match-pitch-shirt">
                <path
                  d="M17 6L7 12L1 25L12 30L16 24V51H40V24L44 30L55 25L49 12L39 6L34 11H22Z"
                  fill={index === 0 ? '#facc15' : kit?.primaryColor || '#2563eb'}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x="28"
                  y="36"
                  textAnchor="middle"
                  fill="white"
                  stroke="#17243c"
                  strokeWidth=".5"
                  fontSize="19"
                  fontWeight="800"
                >
                  {player.dorsal ?? ''}
                </text>
              </svg>
              <span>{getPlayerFirstName(player)}</span>
            </div>
          );
        })}
        <span className="match-pitch-formation">{formation}</span>
      </div>
      {!starters.length && <p className="match-empty">{t('matchPresentation.noLineup')}</p>}
    </>
  );
}
