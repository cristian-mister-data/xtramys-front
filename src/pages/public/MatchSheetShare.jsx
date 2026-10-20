import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getPublicMatchSheet } from '@/api/matchSheet';
import MatchRivalReports from '@/components/season/MatchRivalReports';
import MatchLineupPitch from '@/components/season/MatchLineupPitch';
import SharedSetPieceBoard from '@/components/season/SharedSetPieceBoard';
import { getPlayerFullName, getPlayerInitials } from '@/utils/playerHelpers';
import { normalizeKits, normalizeRivalKits } from '@/utils/kits';
import { cdnUrl } from '@/config';
import '@/components/season/matchSheetPresentation.css';

const playerId = (player) => String(player?._id || player || '');
const media = (url) =>
  typeof url === 'string' && /^(https?:\/\/|data:image\/|\/)/i.test(url) ? cdnUrl(url) : undefined;

function PlayerList({ players = [], showPhotos = true, starters, reserves }) {
  const { t } = useTranslation();
  if (!players.length) return <p className="match-empty">{t('matchPresentation.noPlayers')}</p>;
  return (
    <ul className="match-player-list">
      {players.map((player) => (
        <li key={playerId(player)}>
          {showPhotos && media(player.foto) ? (
            <img className="match-player-avatar" src={media(player.foto)} alt="" loading="lazy" />
          ) : (
            <span className="match-player-avatar" aria-hidden="true">
              {getPlayerInitials(player)}
            </span>
          )}
          <span>
            <strong>{getPlayerFullName(player)}</strong>
            {player.posicion && (
              <small>
                {t(`injury.positions.${player.posicion.toLowerCase()}`, player.posicion)}
              </small>
            )}
          </span>
          {starters && (
            <span className="match-roster-role">
              {t(
                starters.has(playerId(player))
                  ? 'matchPresentation.starter'
                  : reserves?.has(playerId(player))
                    ? 'matchPresentation.reserve'
                    : 'matchPresentation.selected',
              )}
            </span>
          )}
          {player.dorsal != null && (
            <span
              className="match-player-number"
              aria-label={`${t('matchPresentation.number')} ${player.dorsal}`}
            >
              #{player.dorsal}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MatchSheetShare() {
  const { token } = useParams();
  const { t, i18n } = useTranslation();
  const [sheet, setSheet] = useState(null);
  const [error, setError] = useState(false);
  const [active, setActive] = useState('lineup');
  useEffect(() => {
    let alive = true;
    setSheet(null);
    setError(false);
    setActive('lineup');
    getPublicMatchSheet(token)
      .then(({ data }) => {
        if (alive) setSheet(data.matchSheet);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [token]);
  const date = (value) =>
    value && !Number.isNaN(new Date(value).getTime())
      ? new Intl.DateTimeFormat(i18n.language, { dateStyle: 'long', timeStyle: 'short' }).format(
          new Date(value),
        )
      : '';
  if (error)
    return (
      <main className="match-share-page">
        <p className="match-empty" role="alert">
          {t('matchPresentation.unavailable')}
        </p>
      </main>
    );
  if (!sheet)
    return (
      <main className="match-share-page">
        <p className="match-empty" role="status">
          {t('matchPresentation.loading')}
        </p>
      </main>
    );
  const ownName = sheet.equipo?.nombre || t('matchPresentation.team');
  const statisticKeys = [
    ...new Set([
      ...Object.keys(sheet.estadisticas || {}),
      ...Object.keys(sheet.estadisticasRival || {}),
    ]),
  ].filter(
    (key) =>
      typeof sheet.estadisticas?.[key] === 'number' ||
      typeof sheet.estadisticasRival?.[key] === 'number',
  );
  const rivalName = sheet.rivalId?.nombre || sheet.rival;
  const own = {
    name: ownName,
    crest: sheet.miEscudo || sheet.equipo?.escudo,
    score: sheet.golesFavor,
  };
  const rival = {
    name: rivalName,
    crest: sheet.rivalEscudo || sheet.rivalId?.escudo,
    score: sheet.golesContra,
  };
  const away = ['fuera', 'visitante', 'away'].includes((sheet.ubicacion || '').toLowerCase());
  const sides = away ? [rival, own] : [own, rival];
  const matchTime = sheet.fechaHora ? new Date(sheet.fechaHora).getTime() : NaN;
  const hasScore = sides.every(
    (team) => team.score != null && team.score !== '' && Number.isFinite(Number(team.score)),
  );
  const played =
    hasScore &&
    !(Number.isFinite(matchTime) && matchTime > Date.now()) &&
    Boolean(
      ['victoria', 'empate', 'derrota', 'win', 'draw', 'loss'].includes(
        (sheet.resultado || '').toLowerCase(),
      ) ||
      Number(sheet.golesFavor) > 0 ||
      Number(sheet.golesContra) > 0,
    );
  const starters = new Set((sheet.alineacionTitulares || []).map(playerId));
  const reserves = sheet.alineacionSuplentes?.length
    ? sheet.alineacionSuplentes
    : (sheet.convocados || []).filter((player) => !starters.has(playerId(player)));
  const tabs = [
    ['lineup', 'lineup'],
    ['callup', 'callup'],
    ['statistics', 'statistics'],
    ['rival', 'rivalReport'],
    ['abp', 'setPieces'],
  ];
  const kits = normalizeKits(sheet.equipo?.equipaciones);
  const rivalKits = normalizeRivalKits(sheet.rivalId?.equipaciones);
  const kitContext = {
    own: sheet.equipacionPropia || kits[sheet.equipacionPropiaKey || 'first'],
    rival: sheet.equipacionRival || rivalKits[sheet.equipacionRivalKey || 'first'],
    ownGoalkeeper: sheet.equipacionPorteroPropia || kits.goalkeeperFirst,
    rivalGoalkeeper: sheet.equipacionPorteroRival || rivalKits.goalkeeperFirst,
  };
  return (
    <main className="match-share-page">
      <a className="match-skip" href="#match-content">
        {t('matchPresentation.skip')}
      </a>
      <header className="match-share-hero">
        <h1>
          {sheet.torneoId?.nombre || t('matchPresentation.matchSheet')}
          {sheet.jornada != null ? ` · ${t('matchPresentation.matchday')} ${sheet.jornada}` : ''}
        </h1>
        {sheet.fechaHora && (
          <p>
            <time dateTime={sheet.fechaHora}>{date(sheet.fechaHora)}</time>
          </p>
        )}
        <div className="match-scoreboard">
          {sides.map((side, index) => (
            <div key={index} style={{ display: 'contents' }}>
              {index === 1 && (
                <div
                  className={`match-score${played ? '' : ' match-score-pending'}`}
                  aria-label={t('matchPresentation.score')}
                >
                  {played
                    ? `${sides[0].score} – ${sides[1].score}`
                    : t('matchPresentation.pending')}
                </div>
              )}
              <div className="match-team">
                {media(side.crest) ? (
                  <img src={media(side.crest)} alt="" />
                ) : (
                  <span className="match-team-placeholder" aria-hidden="true">
                    {side.name?.slice(0, 1)}
                  </span>
                )}
                <span>{side.name}</span>
              </div>
            </div>
          ))}
        </div>
        <p>
          {[
            sheet.campo,
            sheet.ubicacion &&
              t(
                `matchPresentation.location.${away ? 'away' : ['neutral'].includes(sheet.ubicacion.toLowerCase()) ? 'neutral' : 'home'}`,
              ),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </header>
      <div className="match-share-content">
        <nav className="match-share-nav" aria-label={t('matchPresentation.sections')}>
          {tabs.map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={active === key}
              aria-controls="match-content"
              onClick={() => setActive(key)}
            >
              {t(`matchPresentation.${label}`)}
            </button>
          ))}
        </nav>
        <section
          id="match-content"
          aria-label={t(`matchPresentation.${tabs.find(([key]) => key === active)[1]}`)}
        >
          {active === 'lineup' && (
            <div className="match-share-grid">
              <article className="match-share-card">
                <h2>{t('matchPresentation.starters')}</h2>
                <MatchLineupPitch sheet={sheet} />
                <details style={{ marginTop: 20 }}>
                  <summary>{t('matchPresentation.seeStarters')}</summary>
                  <PlayerList
                    players={sheet.alineacionTitulares}
                    showPhotos={sheet.alineacionMostrarFotos !== false}
                  />
                </details>
              </article>
              <aside className="match-share-card">
                <h2>
                  {t('matchPresentation.reserves')} · {reserves.length}
                </h2>
                <PlayerList
                  players={reserves}
                  showPhotos={sheet.alineacionMostrarFotos !== false}
                />
              </aside>
            </div>
          )}
          {active === 'callup' && (
            <article className="match-share-card match-callup-card">
              <header className="match-callup-header">
                <div>
                  <span className="match-eyebrow">{ownName}</span>
                  <h2>{t('matchPresentation.callup')}</h2>
                  <p>{t('matchPresentation.callupSubtitle')}</p>
                </div>
                <span className="match-callup-count">
                  {t('matchPresentation.playerCount', { count: sheet.convocados?.length || 0 })}
                </span>
              </header>
              {!!sheet.convocatoriaObservaciones?.trim() && (
                <p className="match-callup-note">{sheet.convocatoriaObservaciones}</p>
              )}
              <PlayerList
                players={sheet.convocados}
                starters={starters}
                reserves={new Set((sheet.alineacionSuplentes || []).map(playerId))}
              />
              {!!sheet.noConvocados?.length && (
                <details style={{ marginTop: 20 }}>
                  <summary>{t('matchSheet.lineup.notCalled')}</summary>
                  <PlayerList players={sheet.noConvocados} />
                </details>
              )}
            </article>
          )}
          {active === 'statistics' && (
            <article className="match-share-card">
              <h2>{t('matchPresentation.statistics')}</h2>
              {statisticKeys.length ? (
                <table className="match-share-table">
                  <caption className="match-eyebrow">
                    {ownName} / {rivalName}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('matchPresentation.statistic')}</th>
                      <th scope="col">{ownName}</th>
                      <th scope="col">{rivalName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statisticKeys.map((key) => (
                      <tr key={key}>
                        <th scope="row">
                          {t(`matchSheet.statistics.fields.${key}`, key.replace(/([A-Z])/g, ' $1'))}
                        </th>
                        <td>{sheet.estadisticas?.[key] ?? '—'}</td>
                        <td>{sheet.estadisticasRival?.[key] ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="match-empty">{t('matchPresentation.noStatistics')}</p>
              )}
            </article>
          )}
          {active === 'rival' && (
            <div className="match-share-stack">
              <MatchRivalReports reports={sheet.rivalAnalyses} />
              {sheet.notasEntrenador && (
                <article className="match-share-card">
                  <h2>{t('matchPresentation.matchNotes')}</h2>
                  <p className="match-share-note">{sheet.notasEntrenador}</p>
                </article>
              )}
            </div>
          )}
          {active === 'abp' && (
            <div className="match-share-stack">
              {!(sheet.setPieces || []).length && (
                <p className="match-empty">{t('matchPresentation.noSetPieces')}</p>
              )}
              {(sheet.setPieces || []).map((piece, index) => (
                <article className="match-share-card" key={index}>
                  <h2>{piece.nombre}</h2>
                  <SharedSetPieceBoard
                    setPiece={piece}
                    players={[...(sheet.convocados || []), ...(sheet.noConvocados || [])]}
                    kitContext={{ ...piece.pizarraConfig?.kitContext, ...kitContext }}
                  />
                  {piece.descripcion && <p className="match-share-note">{piece.descripcion}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
        <footer style={{ marginTop: 32, textAlign: 'center', color: '#526078', fontSize: 12 }}>
          XTRAMYS · {t('matchPresentation.matchSheet')}
        </footer>
      </div>
    </main>
  );
}
