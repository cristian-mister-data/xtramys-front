import { useTranslation } from 'react-i18next';
import {
  getQuestionText,
  resolveOptionLabel,
  translateEnum,
} from '@/features/rivalAnalysis/rivalAnalysisData';
import { getPlayerFullName } from '@/utils/playerHelpers';
import './matchSheetPresentation.css';

const legacyFields = [
  'ladoDebilSalidaBalon',
  'generanPeligroPorDonde',
  'combinativoDirecto',
  'pressingAltura',
  'pressingPuntas',
  'pressingSaltanLineas',
  'ortjDefendiendo',
];
const safeMedia = (value) =>
  typeof value === 'string' && /^(https?:\/\/|data:image\/|\/)/i.test(value) ? value : undefined;

function Answer({ value, question, t }) {
  if (value == null || value === '') return null;
  const answerLabel = (item) => {
    const option = question.options?.find((option) => option.key === item);
    return option
      ? resolveOptionLabel(option, t)
      : typeof item === 'number'
        ? String(item)
        : translateEnum(item, t);
  };
  if (Array.isArray(value))
    return (
      <ul>
        {value
          .filter((item) => item != null)
          .map((item, index) => (
            <li key={index}>
              {typeof item === 'object' ? (
                <>
                  {getPlayerFullName(item) || item.name || item.nombre}
                  {item.observacion ? ` — ${item.observacion}` : ''}
                </>
              ) : (
                answerLabel(item)
              )}
            </li>
          ))}
      </ul>
    );
  if (typeof value === 'object') {
    if (value.imageBase64)
      return (
        <img
          className="match-report-graphic"
          src={safeMedia(value.imageBase64)}
          alt={getQuestionText(question, t) || t('matchPresentation.graphic')}
        />
      );
    if (value.url)
      return (
        <video
          className="match-report-graphic"
          controls
          preload="none"
          playsInline
          src={safeMedia(value.url)}
          aria-label={getQuestionText(question, t)}
        />
      );
    return null;
  }
  return (
    <p>
      {typeof value === 'boolean'
        ? t(value ? 'common.yes' : 'common.no', value ? 'Sí' : 'No')
        : answerLabel(value)}
    </p>
  );
}

export default function MatchRivalReports({ reports = [] }) {
  const { t } = useTranslation();
  if (!reports.length) return <p className="match-empty">{t('matchPresentation.noReports')}</p>;
  return (
    <div className="match-reports">
      {reports.map((report) => {
        const custom = report.customAnswers || {};
        const questions = [
          ...(report.templateId?.questions ||
            legacyFields.map((id, index) => ({
              id,
              questionKey: `rivalAnalysis.questions.q${index + 1}`,
            }))),
        ];
        for (const [id, key] of [
          ['zonaSaquePortero', 'q10'],
          ['cambioSistemaDerrota', 'q11'],
          ['observaciones', 'q12'],
          ['jugadoresDestacados', 'q8'],
          ['jugadoresDebiles', 'q9'],
          ['alineacion', null],
        ]) {
          if (!questions.some((q) => q.id === id))
            questions.push({
              id,
              questionKey: key ? `rivalAnalysis.questions.${key}` : 'matchPresentation.formation',
            });
        }
        Object.keys(custom).forEach((id) => {
          if (!questions.some((q) => q.id === id))
            questions.push({
              id,
              questionText: t(
                custom[id]?.imageBase64
                  ? 'matchPresentation.graphic'
                  : custom[id]?.videoId || custom[id]?.url
                    ? 'matchPresentation.video'
                    : 'matchPresentation.additionalInfo',
              ),
            });
        });
        return (
          <article className="match-report-card" key={report._id}>
            <header>
              <span className="match-eyebrow">{t('matchPresentation.rivalReport')}</span>
              <h2>{report.rival}</h2>
              {report.alineacion && <span className="match-chip">{report.alineacion}</span>}
            </header>
            <div className="match-report-answers">
              {questions
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((question) => {
                  const value = custom[question.id] ?? report[question.id];
                  if (value == null || value === '' || (Array.isArray(value) && !value.length))
                    return null;
                  return (
                    <section key={question.id}>
                      <h3>{getQuestionText(question, t)}</h3>
                      <Answer value={value} question={question} t={t} />
                    </section>
                  );
                })}
            </div>
            {report.videoUrl && (
              <video
                className="match-report-graphic"
                controls
                preload="none"
                playsInline
                src={safeMedia(report.videoUrl)}
                aria-label={t('matchPresentation.video')}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}
