import React from 'react';
import {
  Document, Page, Text, View,
  baseStyles, COLORS, SPACING, FONT_SIZE,
  PdfHeader, PdfFooter, PdfSection, PdfDivider,
  renderPdf,
} from '@/utils/pdfDesign';

// ── Styles ─────────────────────────────────────────────────────────
const s = {
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  halfColumn: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  mealCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },
  mealTitle: {
    fontSize: FONT_SIZE.lg,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  mealCardTitle: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  bullet: {
    fontSize: FONT_SIZE.base,
    color: COLORS.accent,
    marginRight: 4,
  },
  listText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.textSecondary,
    lineHeight: 1.4,
  },
  // Weekly Table
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerCell: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  headerText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  cellText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
  },
  cellBold: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    fontFamily: 'Helvetica-Bold',
  },
  tag: {
    backgroundColor: COLORS.accentLight,
    color: COLORS.accent,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    alignSelf: 'flex-start',
  },
  // Protocol & Supplements
  protocolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.sm,
    marginBottom: 4,
  },
  protocolTime: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
    backgroundColor: COLORS.accentLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    marginRight: SPACING.base,
  },
  protocolDesc: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    flex: 1,
  },
  supItem: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  supName: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  supDesc: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 1.4,
  },
};

// ── Helpers ────────────────────────────────────────────────────────
const chunkArray = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};
const BulletList = ({ items }) => {
  if (!items || !items.length) {
    return <Text style={[s.listText, { fontStyle: 'italic' }]}>Sin datos</Text>;
  }
  return items.map((item, idx) => (
    <View style={s.listItem} key={idx} wrap={false}>
      <Text style={s.bullet}>•</Text>
      <Text style={s.listText}>{item}</Text>
    </View>
  ));
};

const MealCards = ({ meals }) => {
  if (!meals || !meals.length) {
    return <Text style={[s.listText, { fontStyle: 'italic', marginBottom: 10 }]}>Sin datos</Text>;
  }
  return meals.map((meal, idx) => (
    <View style={s.mealCard} key={idx} wrap={false}>
      <Text style={s.mealCardTitle}>{meal.type || meal.condition}</Text>
      <BulletList items={meal.items || meal.options} />
    </View>
  ));
};

// ── Pages ──────────────────────────────────────────────────────────

const PreseasonPage1 = ({ data, t, title, date }) => (
  <Page size="A4" style={baseStyles.page}>
    <PdfHeader title={title} subtitle={t('nutrition.tabs.preseason')} date={date} />
    <PdfFooter />
    <PdfSection title={`${t('nutrition.tabs.preseason').toUpperCase()} — ${data.title}`}>
      <View style={s.grid}>
        <View style={s.halfColumn}>
          <Text style={s.mealTitle}>{t('nutrition.meals.breakfast')}</Text>
          <MealCards meals={data.meals?.breakfast} />
        </View>
        <View style={s.halfColumn}>
          <Text style={s.mealTitle}>{t('nutrition.meals.midMorning')}</Text>
          <MealCards meals={data.meals?.mid_morning} />
          
          <Text style={[s.mealTitle, { marginTop: SPACING.md }]}>
            {t('nutrition.meals.snacks')}
          </Text>
          <MealCards meals={data.meals?.snacks} />
        </View>
      </View>
    </PdfSection>
  </Page>
);

const PreseasonPage2 = ({ data, t, title, date }) => (
  <Page size="A4" style={baseStyles.page}>
    <PdfFooter />
    <PdfSection title={`${t('nutrition.tabs.preseason').toUpperCase()} — ${t('nutrition.sections.weeklyMenu')}`}>
      <View style={s.table}>
        <View style={s.row}>
          <View style={[s.headerCell, { width: '15%' }]}>
            <Text style={s.headerText}>{t('nutrition.days.monday').split(' ')[0]}</Text>
          </View>
          <View style={[s.headerCell, { width: '15%' }]}>
            <Text style={s.headerText}>Tipo</Text>
          </View>
          <View style={[s.headerCell, { width: '35%' }]}>
            <Text style={s.headerText}>{t('nutrition.meals.lunch')}</Text>
          </View>
          <View style={[s.headerCell, { width: '35%' }]}>
            <Text style={s.headerText}>{t('nutrition.meals.dinner')}</Text>
          </View>
        </View>
        {(data.weekly_menu || []).map((day, idx) => (
          <View style={s.row} key={idx} wrap={false}>
            <View style={[s.cell, { width: '15%' }]}>
              <Text style={s.cellBold}>{day.day}</Text>
            </View>
            <View style={[s.cell, { width: '15%' }]}>
              <Text style={s.tag}>{day.tag}</Text>
            </View>
            <View style={[s.cell, { width: '35%' }]}>
              <Text style={s.cellText}>{day.lunch}</Text>
            </View>
            <View style={[s.cell, { width: '35%' }]}>
              <Text style={s.cellText}>{day.dinner}</Text>
            </View>
          </View>
        ))}
      </View>
    </PdfSection>
  </Page>
);

const SeasonPage = ({ data, t, title, date }) => (
  <Page size="A4" style={baseStyles.page}>
    <PdfFooter />
    <PdfSection title={`${t('nutrition.tabs.season').toUpperCase()} — ${data.title}`}>
      <Text style={[baseStyles.subsectionTitle, { marginBottom: SPACING.md }]}>
        {t('nutrition.sections.contextMenus')}
      </Text>
      <View>
        {chunkArray(data.menu_options || [], 2).map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
            {row.map((ctx, idx) => (
              <View style={s.halfColumn} key={idx} wrap={false}>
                <View style={[baseStyles.card, { height: '100%' }]}>
                  <Text style={[s.mealTitle, { color: COLORS.accent, borderBottomColor: COLORS.accent }]}>
                    {ctx.context}
                  </Text>
                  <View style={{ marginBottom: SPACING.md }}>
                    <Text style={s.mealCardTitle}>{t('nutrition.meals.lunch')}:</Text>
                    <BulletList items={ctx.lunches} />
                  </View>
                  <View>
                    <Text style={s.mealCardTitle}>{t('nutrition.meals.dinner')}:</Text>
                    <BulletList items={ctx.dinners} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </PdfSection>
  </Page>
);

const ReferencePage = ({ data, t, title, date }) => {
  const carbs = data.quantities_gr?.carbohydrates || [];
  const prots = data.quantities_gr?.proteins || [];

  return (
    <Page size="A4" style={baseStyles.page}>
      <PdfFooter />
      
      {/* Macros Section */}
      <PdfSection title={t('nutrition.tabs.reference').toUpperCase()}>
        <View style={s.grid}>
          <View style={s.halfColumn}>
            <Text style={baseStyles.subsectionTitle}>{t('nutrition.reference.carbohydrates')}</Text>
            <View style={s.table}>
              <View style={s.row}>
                <View style={[s.headerCell, { width: '40%' }]}><Text style={s.headerText}>{t('nutrition.reference.food')}</Text></View>
                <View style={[s.headerCell, { width: '30%' }]}><Text style={s.headerText}>{t('nutrition.meals.lunch')}</Text></View>
                <View style={[s.headerCell, { width: '30%' }]}><Text style={s.headerText}>{t('nutrition.meals.dinner')}</Text></View>
              </View>
              {carbs.map((item, idx) => (
                <View style={s.row} key={idx} wrap={false}>
                  <View style={[s.cell, { width: '40%' }]}>
                    <Text style={s.cellBold}>{item.name}</Text>
                    {item.note && <Text style={{ fontSize: 7, color: COLORS.textSecondary }}>({item.note})</Text>}
                  </View>
                  <View style={[s.cell, { width: '30%' }]}><Text style={s.cellText}>{item.lunch}g</Text></View>
                  <View style={[s.cell, { width: '30%' }]}><Text style={{ ...s.cellText, color: COLORS.textSecondary }}>{item.dinner === 0 ? '-' : `${item.dinner}g`}</Text></View>
                </View>
              ))}
            </View>
          </View>
          <View style={s.halfColumn}>
            <Text style={baseStyles.subsectionTitle}>{t('nutrition.reference.proteins')}</Text>
            <View style={s.table}>
              <View style={s.row}>
                <View style={[s.headerCell, { width: '40%' }]}><Text style={s.headerText}>{t('nutrition.reference.food')}</Text></View>
                <View style={[s.headerCell, { width: '30%' }]}><Text style={s.headerText}>{t('nutrition.meals.lunch')}</Text></View>
                <View style={[s.headerCell, { width: '30%' }]}><Text style={s.headerText}>{t('nutrition.meals.dinner')}</Text></View>
              </View>
              {prots.map((item, idx) => (
                <View style={s.row} key={idx} wrap={false}>
                  <View style={[s.cell, { width: '40%' }]}><Text style={s.cellBold}>{item.name}</Text></View>
                  <View style={[s.cell, { width: '30%' }]}><Text style={s.cellText}>{item.lunch}{item.unit || 'g'}</Text></View>
                  <View style={[s.cell, { width: '30%' }]}><Text style={{ ...s.cellText, color: COLORS.textSecondary }}>{item.dinner}{item.unit || 'g'}</Text></View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </PdfSection>

      {/* Protocols & Supplements */}
      <PdfSection>
        <View style={s.grid}>
          <View style={s.halfColumn}>
            <Text style={baseStyles.subsectionTitle}>{t('nutrition.reference.supplements')}</Text>
            <View style={baseStyles.card}>
              {(data.supplements || []).map((sup, idx) => (
                <View style={s.supItem} key={idx} wrap={false}>
                  <Text style={s.supName}>{sup.name}</Text>
                  <Text style={s.supDesc}>{sup.description}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={s.halfColumn}>
            <Text style={baseStyles.subsectionTitle}>{t('nutrition.reference.matchProtocol')}</Text>
            {(data.match_day_protocol?.steps || []).map((step, idx) => (
              <View style={s.protocolCard} key={idx} wrap={false}>
                <Text style={s.protocolTime}>{step.time}</Text>
                <Text style={s.protocolDesc}>{step.description}</Text>
              </View>
            ))}
            
            <Text style={[baseStyles.subsectionTitle, { marginTop: SPACING.md }]}>
              {t('nutrition.reference.hydration')}
            </Text>
            <View style={baseStyles.card}>
              <BulletList items={data.hydration_tips} />
            </View>
          </View>
        </View>
      </PdfSection>
    </Page>
  );
};

// ── Document Component ─────────────────────────────────────────────
const NutritionDocument = ({ preseasonData, seasonData, referenceData, t, optionLabel }) => {
  const title = optionLabel
    ? `${t('nutrition.pdf.title')} - ${optionLabel}`
    : t('nutrition.pdf.title');
  const date = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Document>
      <PreseasonPage1 data={preseasonData} t={t} title={title} date={date} />
      <PreseasonPage2 data={preseasonData} t={t} title={title} date={date} />
      <SeasonPage data={seasonData} t={t} title={title} date={date} />
      <ReferencePage data={referenceData} t={t} title={title} date={date} />
    </Document>
  );
};

// ── Public API ─────────────────────────────────────────────────────
export async function generateNutritionPdf(preseasonData, seasonData, referenceData, t, optionLabel) {
  await renderPdf(
    <NutritionDocument
      preseasonData={preseasonData}
      seasonData={seasonData}
      referenceData={referenceData}
      t={t}
      optionLabel={optionLabel}
    />,
    `nutrition-${optionLabel || 'report'}`,
  );
}

// Preserve export for compatibility if any other module dynamically called it
export const buildNutritionHTML = () => {
  console.warn('buildNutritionHTML is deprecated. Use generateNutritionPdf.');
  return '';
};
