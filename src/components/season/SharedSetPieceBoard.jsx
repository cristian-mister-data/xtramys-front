import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SetPiecePreview from '@/vendor/matchSheet/SetPiecePreview';
import { decomposeFieldId, getAspectForView } from '@/vendor/tacticalBoard/fields';
import { getPlayerFullName } from '@/utils/playerHelpers';
import { usesImportedImage } from '@/utils/contentVisual';
import './matchSheetPresentation.css';

export default function SharedSetPieceBoard({ setPiece, kitContext, players = [], video }) {
  const { t } = useTranslation();
  const board = useRef(null);
  const [width, setWidth] = useState(720);
  const [showVideo, setShowVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const toggleButton = useRef(null);
  const videoSrc =
    video?.url || (!usesImportedImage(setPiece) && (setPiece.video?.url || setPiece.videoUrl));
  useEffect(() => {
    setShowVideo(false);
    setVideoError(false);
    setVideoLoading(false);
  }, [videoSrc, setPiece._id]);
  useEffect(() => {
    const node = board.current;
    const measure = () => setWidth(node.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const field = decomposeFieldId(setPiece.customFieldType || setPiece.tipoCampo || 'full');
  const assignments = (setPiece.assignments || [])
    .map((assignment) => {
      const player =
        players.find(
          (player) => String(player._id) === String(assignment.player?._id || assignment.player),
        ) || assignment.player;
      return {
        ...assignment,
        name:
          getPlayerFullName(typeof player === 'object' ? player : null) || assignment.playerName,
      };
    })
    .filter((assignment) => assignment.name);
  return (
    <>
      <p className="match-board-hint">{t('matchPresentation.boardScrollHint')}</p>
      <div className="match-board-media">
        <div
          className="match-board-scroll"
          tabIndex={0}
          role="region"
          aria-label={t('matchPresentation.setPieceBoard', { name: setPiece.nombre })}
        >
          <div
            ref={board}
            className="match-board-expanded match-board-frame"
            style={{ height: Math.ceil(width * getAspectForView(field.viewMode)) }}
          >
            {showVideo ? (
              <video
                className="match-board-video"
                key={videoSrc}
                src={videoSrc}
                controls
                autoPlay
                playsInline
                aria-label={setPiece.nombre}
                onLoadStart={() => setVideoLoading(true)}
                onLoadedData={() => setVideoLoading(false)}
                onError={() => {
                  setVideoError(true);
                  setVideoLoading(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setShowVideo(false);
                    setVideoError(false);
                    setVideoLoading(false);
                    toggleButton.current?.focus();
                  }
                }}
              />
            ) : (
              <SetPiecePreview
                minAssignmentFontSize={14}
                setPiece={setPiece}
                players={players}
                height={Math.ceil(width * getAspectForView(field.viewMode))}
                kitContext={kitContext}
              />
            )}
          </div>
        </div>
        {videoSrc && (
          <button
            ref={toggleButton}
            type="button"
            className="match-board-video-toggle"
            aria-pressed={showVideo}
            onClick={() => {
              setShowVideo(!showVideo);
              setVideoError(false);
              setVideoLoading(!showVideo);
            }}
          >
            {t(showVideo ? 'matchPresentation.showBoard' : 'matchPresentation.watchVideo')}
          </button>
        )}
        {videoLoading && (
          <p className="match-board-video-loading" role="status">
            {t('matchPresentation.preparingVideo')}
          </p>
        )}
        {videoError && (
          <p className="match-board-video-error" role="alert">
            {t('matchPresentation.videoError')}
          </p>
        )}
      </div>
      {!!assignments.length && (
        <section
          className="match-board-assignments"
          aria-label={t('matchPresentation.assignments')}
        >
          <h3>{t('matchPresentation.assignments')}</h3>
          <ul>
            {assignments.map((assignment) => (
              <li key={assignment.slotId}>
                <span className="match-assignment-number">
                  {assignment.number ? `#${assignment.number}` : t('matchPresentation.player')}
                </span>
                <strong>{assignment.name}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
