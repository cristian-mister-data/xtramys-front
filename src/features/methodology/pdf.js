import React from 'react';
import {
  Document, Page, Text, View,
  baseStyles, COLORS, SPACING, FONT_SIZE,
  PdfHeader, PdfFooter,
  renderPdf,
} from '@/utils/pdfDesign';
import { getDaysLabel } from './methodologyData';

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
    minHeight: 30,
  },
  tableRowLast: {
    flexDirection: 'row',
    minHeight: 30,
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
  labelCellEmpty: {
    width: 120,
    paddingVertical: 8,
    paddingHorizontal: 10,
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
  mainPartInstructionCell: {
    backgroundColor: COLORS.bgSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flex: 1,
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  mainPartInstructionText: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  optionTasks: {
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
  },
  constraintText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  matchDayCell: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
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
  intensityLow: { backgroundColor: '#F0FDF4', color: '#166534', borderWidth: 1, borderColor: '#BBF7D0' },
  intensityMediumLow: { backgroundColor: '#F0FDF4', color: '#166534', borderWidth: 1, borderColor: '#BBF7D0' },
  intensityMedium: { backgroundColor: '#EFF6FF', color: '#1D4ED8', borderWidth: 1, borderColor: '#BFDBFE' },
  intensityMediumHigh: { backgroundColor: '#FEF2F2', color: '#B91C1C', borderWidth: 1, borderColor: '#FECACA' },
  intensityHigh: { backgroundColor: '#FEF2F2', color: '#B91C1C', borderWidth: 1, borderColor: '#FECACA' },
  intensityDefault: { backgroundColor: COLORS.bgSoft, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
};

// ── Helpers ────────────────────────────────────────────────────────
const tt = (tFn, key, fallback, opts) => {
  if (typeof tFn === 'function') {
    const res = tFn(key, opts);
    if (res && res !== key) return res;
  }
  if (typeof fallback === 'function') return fallback(opts || {});
  return fallback;
};

const getIntensityStyle = (value, t) => {
  const text = (value || '').toLowerCase();
  const low = String(tt(t, 'goalkeeperMethodology.data.intensity.low', 'baja')).toLowerCase();
  const mediumLow = String(tt(t, 'goalkeeperMethodology.data.intensity.mediumLow', 'media-baja')).toLowerCase();
  const medium = String(tt(t, 'goalkeeperMethodology.data.intensity.medium', 'media')).toLowerCase();
  const mediumHigh = String(tt(t, 'goalkeeperMethodology.data.intensity.mediumHigh', 'media-alta')).toLowerCase();
  const high = String(tt(t, 'goalkeeperMethodology.data.intensity.high', 'alta')).toLowerCase();

  if (text.includes(low) && !text.includes(mediumLow)) return s.intensityLow;
  if (text.includes(mediumLow)) return s.intensityMediumLow;
  if (text.includes(medium) && !text.includes(mediumHigh)) return s.intensityMedium;
  if (text.includes(mediumHigh)) return s.intensityMediumHigh;
  if (text.includes(high)) return s.intensityHigh;
  return s.intensityDefault;
};

// ── Document Component ─────────────────────────────────────────────
const MethodologyDocument = ({ categoryName, planKey, days, t }) => {
  const daysLabel = getDaysLabel(planKey, t);
  const date = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const maxOptions = Math.max(...days.map((d) => (d.main_part?.options || []).length), 0);

  const DataRow = ({ label, getValue, isIntensity, isLast }) => (
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
              <Text style={[s.intensityBadge, badgeStyle]}>{value || '-'}</Text>
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
        <PdfHeader title={categoryName} subtitle={daysLabel} date={date} />
        <PdfFooter text="Xtramys Performance" />

        <View style={s.tableContainer}>
          {/* Header */}
          <View style={s.tableRow}>
            <View style={s.headerLabelCell} />
            {days.map((day, i) => (
              <View style={s.headerDayCell} key={i}>
                <Text style={s.headerDayText}>
                  {tt(
                    t,
                    'methodology.dayNumber',
                    ({ number }) => `Dia ${number}`,
                    { number: day.day_number || i + 1 },
                  )}
                </Text>
              </View>
            ))}
          </View>

          {/* Standard rows */}
          <DataRow
            label={tt(t, 'methodology.orientation', 'Orientacion')}
            getValue={(d) => d.orientation}
          />
          <DataRow
            label={tt(t, 'methodology.objective', 'Objetivo')}
            getValue={(d) => d.objective}
          />
          <DataRow
            label={tt(t, 'methodology.gameSituation', 'Situacion de juego')}
            getValue={(d) => d.game_situation}
          />
          <DataRow
            label={tt(t, 'methodology.dimensions', 'Dimensiones')}
            getValue={(d) => d.dimensions}
          />

          {/* Main part: instruction row */}
          <View style={s.tableRow}>
            <View style={s.labelCell}>
              <Text style={s.labelText}>
                {tt(t, 'methodology.mainPart', 'Parte principal')}
              </Text>
            </View>
            {days.map((day, i) => (
              <View style={s.mainPartInstructionCell} key={i}>
                <Text style={s.mainPartInstructionText}>
                  {day.main_part?.instruction || '-'}
                </Text>
              </View>
            ))}
          </View>

          {/* Main part: option rows */}
          {Array.from({ length: maxOptions }).map((_, optIdx) => {
            const isLast = optIdx === maxOptions - 1;
            return (
              <View style={isLast ? s.tableRowLast : s.tableRow} key={optIdx}>
                <View style={s.labelCellEmpty} />
                {days.map((day, dIdx) => {
                  const option = (day.main_part?.options || [])[optIdx];
                  if (!option) {
                    return (
                      <View style={s.valueCell} key={dIdx}>
                        <Text style={[s.valueText, { color: COLORS.textSecondary }]}>-</Text>
                      </View>
                    );
                  }
                  const tasksText = option.tasks?.join(' / ') || '';
                  return (
                    <View style={s.valueCell} key={dIdx}>
                      <Text style={s.optionTasks}>{tasksText}</Text>
                      {option.constraint ? (
                        <Text style={s.constraintText}>{option.constraint}</Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
};

// ── Public API ─────────────────────────────────────────────────────
export async function generateMethodologyPdf(categoryName, planKey, days, primaryColor, t) {
  const daysLabel = getDaysLabel(planKey, t);
  const cleanName = String(categoryName || '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, '')
    .trim();
  const cleanDaysLabel = String(daysLabel || '').replace('/', '-');
  const fileName = `${cleanName}_${cleanDaysLabel}`.replace(/\s+/g, '_') || 'metodologia';

  try {
    await renderPdf(
      <MethodologyDocument
        categoryName={categoryName}
        planKey={planKey}
        days={days}
        t={t}
      />,
      `${fileName}.pdf`,
    );
    return true;
  } catch (e) {
    console.error('[methodology pdf] error', e);
    return false;
  }
}
