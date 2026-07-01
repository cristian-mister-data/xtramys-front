import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  baseStyles,
  COLORS,
  SPACING,
  FONT_SIZE,
  PdfHeader,
  PdfFooter,
  renderPdf,
} from '@/utils/pdfDesign';

const SCORE_GROUPS = [
  {
    key: 'technical',
    label: 'Técnica',
    fields: ['control', 'pase', 'conduccion', 'regate', 'tiro', 'juegoAereo'],
  },
  { key: 'physical', label: 'Física', fields: ['velocidad', 'resistencia', 'fuerza', 'agilidad'] },
  {
    key: 'tactical',
    label: 'Táctica',
    fields: ['posicionamiento', 'tomaDecisiones', 'visionJuego', 'trabajoDefensivo'],
  },
  {
    key: 'mental',
    label: 'Mental',
    fields: ['actitud', 'esfuerzo', 'concentracion', 'comunicacion', 'liderazgo'],
  },
];

const FIELD_LABELS = {
  control: 'Control',
  pase: 'Pase',
  conduccion: 'Conducción',
  regate: 'Regate',
  tiro: 'Tiro',
  juegoAereo: 'Juego aéreo',
  velocidad: 'Velocidad',
  resistencia: 'Resistencia',
  fuerza: 'Fuerza',
  agilidad: 'Agilidad',
  posicionamiento: 'Posicionamiento',
  tomaDecisiones: 'Toma de decisiones',
  visionJuego: 'Visión de juego',
  trabajoDefensivo: 'Trabajo defensivo',
  actitud: 'Actitud',
  esfuerzo: 'Esfuerzo',
  concentracion: 'Concentración',
  comunicacion: 'Comunicación',
  liderazgo: 'Liderazgo',
};

function getRecommendationLabel(val) {
  switch (val) {
    case 'muy_recomendable':
      return 'Muy recomendable';
    case 'seguir_observando':
      return 'Seguir observando';
    case 'no_recomendado':
      return 'No recomendado';
    default:
      return val || '—';
  }
}

function getPotentialLabel(val) {
  switch (val) {
    case 'bajo':
      return 'Bajo';
    case 'medio':
      return 'Medio';
    case 'alto':
      return 'Alto';
    default:
      return val || '—';
  }
}

function getFootLabel(foot) {
  switch (foot?.toLowerCase()) {
    case 'derecho':
      return 'Derecho';
    case 'izquierdo':
      return 'Izquierdo';
    case 'ambos':
      return 'Ambos';
    default:
      return foot || '—';
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
};

const s = StyleSheet.create({
  playerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 10,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  playerInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  playerName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  playerSub: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    marginTop: 3,
  },
  playerMeta: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  ratingValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#a16207',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.base,
  },
  infoCardLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  infoCardValue: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: SPACING.lg,
  },
  tag: {
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
  },
  scoresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  scoreCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
  },
  scoreCardTitle: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 4,
    marginBottom: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  scoreLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    flex: 1,
  },
  scoreBarBg: {
    width: 100,
    height: 16,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  scoreNum: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    width: 24,
    textAlign: 'right',
    marginLeft: 6,
  },
  textCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  textCardTitle: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  textCardContent: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    lineHeight: 1.5,
  },
  obsCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
  },
});

const ScoreBar = ({ score }) => {
  const pct = Math.min(Math.max((score / 10) * 100, 0), 100);
  return (
    <View style={s.scoreBarBg}>
      <View style={[s.scoreBarFill, { width: `${pct}%` }]} />
    </View>
  );
};

const ScoutingDocument = ({ report, t }) => {
  const dateStr = formatDate(report.observationDate);
  const playerTeam = report.playerTeam || '';
  const position = report.position || '';

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={baseStyles.page}>
        <PdfHeader
          title="INFORME DE SCOUTING"
          subtitle={
            report.rival
              ? `${report.rival} ${report.competition ? `· ${report.competition}` : ''}`
              : ''
          }
          date={dateStr}
          transparent
        />

        {/* Player Card */}
        <View style={s.playerCard}>
          <View style={s.playerInfo}>
            <Text style={s.playerName}>{report.playerName}</Text>
            <Text style={s.playerSub}>
              {[position, playerTeam].filter(Boolean).join(' - ') || 'Sin posición/equipo'}
            </Text>
            <Text style={s.playerMeta}>
              {[
                report.age ? `${report.age} años` : null,
                `Pie: ${getFootLabel(report.dominantFoot)}`,
              ]
                .filter(Boolean)
                .join(' | ')}
            </Text>
          </View>
          {report.rating ? (
            <View style={s.ratingBadge}>
              <Text style={s.ratingValue}>{report.rating}/10</Text>
            </View>
          ) : null}
        </View>

        {/* Info Cards */}
        <View style={s.infoGrid}>
          <View style={s.infoCard}>
            <Text style={s.infoCardLabel}>Recomendación</Text>
            <Text style={s.infoCardValue}>{getRecommendationLabel(report.recommendation)}</Text>
          </View>
          <View style={s.infoCard}>
            <Text style={s.infoCardLabel}>Potencial</Text>
            <Text style={s.infoCardValue}>{getPotentialLabel(report.potential)}</Text>
          </View>
          {report.rival ? (
            <View style={s.infoCard}>
              <Text style={s.infoCardLabel}>Rival</Text>
              <Text style={s.infoCardValue}>{report.rival}</Text>
            </View>
          ) : null}
        </View>

        {/* Tags */}
        {report.tags && report.tags.length > 0 ? (
          <View style={s.tagList}>
            {report.tags.map((tag) => (
              <Text key={tag} style={s.tag}>
                {tag}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Score Groups */}
        <View style={s.scoresGrid}>
          {SCORE_GROUPS.map((group) => {
            const scores = report[group.key];
            if (!scores) return null;
            const entries = Object.entries(scores).filter(([_, v]) => v !== null && v !== '');
            if (entries.length === 0) return null;

            return (
              <View key={group.key} style={s.scoreCard}>
                <Text style={s.scoreCardTitle}>{group.label}</Text>
                {entries.map(([field, score]) => (
                  <View key={field} style={s.scoreRow}>
                    <Text style={s.scoreLabel}>{FIELD_LABELS[field] || field}</Text>
                    <ScoreBar score={Number(score)} />
                    <Text style={s.scoreNum}>{score}</Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>

        {/* Strengths */}
        {report.strengths ? (
          <View style={[s.textCard, { borderLeftWidth: 3, borderLeftColor: COLORS.success }]}>
            <Text style={[s.textCardTitle, { color: COLORS.success }]}>Fortalezas</Text>
            <Text style={s.textCardContent}>{report.strengths}</Text>
          </View>
        ) : null}

        {/* Improvements */}
        {report.improvements ? (
          <View style={[s.textCard, { borderLeftWidth: 3, borderLeftColor: COLORS.danger }]}>
            <Text style={[s.textCardTitle, { color: COLORS.danger }]}>Aspectos a mejorar</Text>
            <Text style={s.textCardContent}>{report.improvements}</Text>
          </View>
        ) : null}

        {/* Observations */}
        {report.observations ? (
          <View style={s.obsCard}>
            <Text style={s.textCardTitle}>Observaciones</Text>
            <Text style={s.textCardContent}>{report.observations}</Text>
          </View>
        ) : null}

        <PdfFooter text="Xtramys Performance" />
      </Page>
    </Document>
  );
};

export async function generateScoutingPdf(report, t) {
  const safeName = (report.playerName || 'scouting').replace(/[/\?%*:|"<>]/g, '-');
  const fileName = `scouting_${safeName}_${Date.now()}`;
  await renderPdf(<ScoutingDocument report={report} t={t} />, fileName);
}
