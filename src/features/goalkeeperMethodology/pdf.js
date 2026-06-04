import React from 'react';
import {
  Document, Page, Text, View,
  baseStyles, COLORS, SPACING, FONT_SIZE,
  PdfHeader, PdfFooter, PdfSection,
  renderPdf,
} from '@/utils/pdfDesign';
import {
  getPlanLabel,
  getIntensityColor,
  GK_PRIMARY_COLOR,
  GK_SECONDARY_COLOR,
} from './goalkeeperMethodologyData';

// ── Styles ─────────────────────────────────────────────────────────
const s = {
  tableContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    minHeight: 32,
  },
  tableRowLast: {
    flexDirection: 'row',
    minHeight: 32,
  },
  headerLabelCell: {
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: 120,
    justifyContent: 'center',
  },
  headerDayCell: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.secondary,
  },
  headerDayText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  labelCell: {
    backgroundColor: COLORS.bgSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: 120,
    justifyContent: 'center',
  },
  labelText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  valueCell: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    flex: 1,
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  valueText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    lineHeight: 1.5,
  },
  matchDayCell: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 10,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  matchDayText: {
    fontFamily: 'Helvetica-Bold',
    color: '#1D4ED8',
    fontSize: FONT_SIZE.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Intensity badges
  intensityBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    alignSelf: 'center',
  },
  intensityLow: {
    backgroundColor: '#F0FDF4',
    color: '#166534',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  intensityMedium: {
    backgroundColor: '#EFF6FF',
    color: '#1D4ED8',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  intensityHigh: {
    backgroundColor: '#FEF2F2',
    color: '#B91C1C',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  intensityDefault: {
    backgroundColor: COLORS.bgSoft,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
};

// ── Helper ─────────────────────────────────────────────────────────
const tt = (tFn, key, fallback, opts) => {
  if (typeof tFn === 'function') {
    const res = tFn(key, opts);
    if (res && res !== key) return res;
  }
  if (typeof fallback === 'function') return fallback(opts || {});
  return fallback;
};

const getIntensityStyle = (value, t) => {
  const intensityText = (value || '').toLowerCase();
  const low = String(tt(t, 'goalkeeperMethodology.data.intensity.low', 'baja')).toLowerCase();
  const mediumLow = String(tt(t, 'goalkeeperMethodology.data.intensity.mediumLow', 'media-baja')).toLowerCase();
  const medium = String(tt(t, 'goalkeeperMethodology.data.intensity.medium', 'media')).toLowerCase();
  const mediumHigh = String(tt(t, 'goalkeeperMethodology.data.intensity.mediumHigh', 'media-alta')).toLowerCase();
  const high = String(tt(t, 'goalkeeperMethodology.data.intensity.high', 'alta')).toLowerCase();

  if (intensityText.includes(low)) return s.intensityLow;
  if (intensityText.includes(mediumLow) || intensityText.includes(medium)) return s.intensityMedium;
  if (intensityText.includes(mediumHigh) || intensityText.includes(high)) return s.intensityHigh;
  return s.intensityDefault;
};

// ── Document Component ─────────────────────────────────────────────
const GoalkeeperMethodologyDocument = ({ planKey, days, t }) => {
  const planLabel = getPlanLabel(planKey, t);
  const title = tt(t, 'goalkeeperMethodology.title', 'Metodologia de Porteros');
  const date = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const Row = ({ label, getValue, isIntensity, isLast }) => (
    <View style={isLast ? s.tableRowLast : s.tableRow}>
      <View style={s.labelCell}>
        <Text style={s.labelText}>{label}</Text>
      </View>
      {days.map((day, i) => {
        const value = getValue(day);
        if (isIntensity) {
          const badgeStyle = getIntensityStyle(value, t);
          return (
            <View style={s.valueCell} key={i}>
              <Text style={[s.intensityBadge, badgeStyle]}>
                {value || '-'}
              </Text>
            </View>
          );
        }
        return (
          <View style={s.valueCell} key={i}>
            <Text style={s.valueText}>{value || '-'}</Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={baseStyles.pageLandscape}>
        <PdfHeader title={title} subtitle={planLabel} date={date} />
        <PdfFooter text="Xtramys Performance" />

        <View style={s.tableContainer}>
          {/* Header row */}
          <View style={s.tableRow}>
            <View style={s.headerLabelCell} />
            {days.map((day, i) => (
              <View style={s.headerDayCell} key={i}>
                <Text style={s.headerDayText}>
                  {tt(
                    t,
                    'goalkeeperMethodology.dayLabel',
                    ({ label }) => `Dia ${label}`,
                    { label: day.day_label || day.day_number },
                  )}
                </Text>
              </View>
            ))}
          </View>

          {/* Data rows */}
          <Row
            label={tt(t, 'goalkeeperMethodology.mainObjective', 'Objetivo principal')}
            getValue={(d) => d.main_objective}
          />
          <Row
            label={tt(t, 'goalkeeperMethodology.practicalContent', 'Contenido practico')}
            getValue={(d) => d.practical_content}
          />
          <Row
            label={tt(t, 'goalkeeperMethodology.intensity', 'Intensidad')}
            getValue={(d) => d.intensity}
            isIntensity
          />

          {/* Match day row */}
          <View style={s.tableRowLast}>
            <View style={s.labelCell}>
              <Text style={s.labelText}>
                {tt(t, 'goalkeeperMethodology.day', 'Dia')} 0
              </Text>
            </View>
            <View style={[s.matchDayCell, { borderLeftWidth: 0 }]}>
              <Text style={s.matchDayText}>
                {tt(t, 'goalkeeperMethodology.matchDay', 'Dia de partido')}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// ── Public API ─────────────────────────────────────────────────────
export async function generateGoalkeeperMethodologyPdf(planKey, days, t) {
  const planLabel = getPlanLabel(planKey, t);
  const fileName = `Metodologia_Porteros_${planLabel}`.replace(/[\s/]+/g, '_');

  try {
    await renderPdf(
      <GoalkeeperMethodologyDocument planKey={planKey} days={days} t={t} />,
      `${fileName}.pdf`,
    );
    return true;
  } catch (e) {
    console.error('[gk methodology pdf] error', e);
    return false;
  }
}
