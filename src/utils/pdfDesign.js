// src/utils/pdfDesign.js
// Shared PDF design system using @react-pdf/renderer.
// All PDF files import from this module.
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
  Svg,
  Line as SvgLine,
} from '@react-pdf/renderer';

// ── Design Tokens ──────────────────────────────────────────────────
export const COLORS = {
  primary: '#0f172a',
  secondary: '#1e293b',
  accent: '#2563eb',
  bgMain: '#f8fafc',
  bgCard: '#ffffff',
  bgSoft: '#f1f5f9',
  text: '#334155',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  borderDark: '#cbd5e1',
  white: '#ffffff',
  warning: '#b45309',
  success: '#166534',
  danger: '#b91c1c',
  accentLight: '#eff6ff',
  accentBorder: '#bfdbfe',
};

export const SPACING = {
  xs: 4,
  sm: 6,
  base: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 30,
};

export const FONT_SIZE = {
  xs: 7,
  sm: 8,
  base: 9,
  md: 10,
  lg: 11,
  xl: 12,
  xxl: 14,
  title: 16,
  header: 18,
};

// ── Base Styles ────────────────────────────────────────────────────
export const baseStyles = StyleSheet.create({
  page: {
    paddingTop: SPACING.xxl,
    paddingBottom: 50,
    paddingHorizontal: 36,
    backgroundColor: COLORS.bgMain,
    fontFamily: 'Helvetica',
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
  },
  pageLandscape: {
    paddingTop: SPACING.xl,
    paddingBottom: 45,
    paddingHorizontal: 30,
    backgroundColor: COLORS.bgMain,
    fontFamily: 'Helvetica',
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flexDirection: 'column',
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZE.title,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 3,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  headerRight: {
    fontSize: FONT_SIZE.lg,
    color: '#60a5fa',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Footer (fixed at bottom)
  footer: {
    position: 'absolute',
    bottom: 22,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },

  // Section
  section: {
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingBottom: 4,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subsectionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },

  // Cards
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },
  cardAccent: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    borderRadius: 6,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },

  // Stat cards (for summary grids)
  statCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  statValue: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  statSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Table styles
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
  },
  tableRowLast: {
    flexDirection: 'row',
  },
  tableHeaderCell: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flex: 1,
  },
  tableHeaderText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tableLabelCell: {
    backgroundColor: COLORS.bgSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: 120,
    justifyContent: 'center',
  },
  tableLabelText: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    flex: 1,
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    lineHeight: 1.4,
  },

  // Question row (key-value)
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: SPACING.sm,
  },
  questionLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    flex: 1,
  },
  questionValue: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textAlign: 'right',
    maxWidth: '60%',
    marginLeft: SPACING.md,
  },
  noValue: {
    color: COLORS.textSecondary,
    fontFamily: 'Helvetica-Oblique',
  },

  // Tags / badges
  tag: {
    backgroundColor: COLORS.accentLight,
    color: COLORS.accent,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: FONT_SIZE.sm,
    fontFamily: 'Helvetica-Bold',
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },
  tagPrimary: {
    backgroundColor: COLORS.accent,
    color: COLORS.white,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    fontSize: FONT_SIZE.xl,
    fontFamily: 'Helvetica-Bold',
  },

  // Observations
  obsBox: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.base,
    marginTop: SPACING.sm,
  },
  obsText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    lineHeight: 1.5,
  },

  // Player items
  playerItem: {
    width: '48%',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    borderRadius: 6,
    padding: 8,
    marginBottom: SPACING.sm,
  },
  playerName: {
    fontSize: FONT_SIZE.base,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
  },
  playerNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 1.3,
  },

  // Utilities
  row: {
    flexDirection: 'row',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    flexDirection: 'column',
  },
  flex1: {
    flex: 1,
  },
  gap4: { gap: 4 },
  gap6: { gap: 6 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mb4: { marginBottom: 4 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  uppercase: { textTransform: 'uppercase' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
});

// ── Reusable Components ────────────────────────────────────────────

/**
 * Standard PDF Header (fixed on each page).
 * @param {{ title: string, subtitle?: string, date?: string, right?: string }} props
 */
export const PdfHeader = ({ title, subtitle, date, right }) => (
  <View style={baseStyles.header}>
    <View style={baseStyles.headerLeft}>
      <Text style={baseStyles.headerTitle}>{title || ''}</Text>
      {subtitle ? <Text style={baseStyles.headerSubtitle}>{subtitle}</Text> : null}
      {date ? <Text style={baseStyles.headerDate}>{date}</Text> : null}
    </View>
    {right ? <Text style={baseStyles.headerRight}>{right}</Text> : null}
  </View>
);

/**
 * Standard PDF Footer with page numbering (fixed at bottom).
 * @param {{ text?: string }} props
 */
export const PdfFooter = ({ text = 'Xtramys' }) => (
  <View style={baseStyles.footer} fixed>
    <Text style={baseStyles.footerText}>{text}</Text>
    <Text
      style={baseStyles.footerText}
      render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
    />
  </View>
);

/**
 * Section with a title bar.
 */
export const PdfSection = ({ title, children, style }) => (
  <View style={[baseStyles.section, style]}>
    {title ? (
      <View style={baseStyles.sectionHeader}>
        <Text style={baseStyles.sectionTitle}>{title}</Text>
      </View>
    ) : null}
    {children}
  </View>
);

/**
 * Stat card for summary grids.
 */
export const PdfStatCard = ({ label, value, sub, style }) => (
  <View style={[baseStyles.statCard, style]}>
    <Text style={baseStyles.statLabel}>{label}</Text>
    <Text style={baseStyles.statValue}>{value}</Text>
    {sub ? <Text style={baseStyles.statSub}>{sub}</Text> : null}
  </View>
);

/**
 * Key-value question row.
 */
export const PdfQuestionRow = ({ label, value, noValue: isEmpty }) => (
  <View style={baseStyles.questionRow} wrap={false}>
    <Text style={baseStyles.questionLabel}>{label}</Text>
    <Text style={[baseStyles.questionValue, isEmpty && baseStyles.noValue]}>
      {value}
    </Text>
  </View>
);

/**
 * Horizontal divider line.
 */
export const PdfDivider = ({ color, style }) => (
  <View
    style={[
      {
        borderBottomWidth: 1,
        borderBottomColor: color || COLORS.border,
        marginVertical: SPACING.sm,
      },
      style,
    ]}
  />
);

// ── Helper: escape HTML entities (for legacy compatibility) ────────
export function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Legacy compatibility shims ─────────────────────────────────────
// These exist so existing imports don't break during incremental migration.
// Files that still use the old HTML approach can import them.
// As files are migrated to react-pdf components, these become unused.

export const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800;900&display=swap';

export const pdfBaseCSS = `
  :root {
    --color-primary: ${COLORS.primary};
    --color-secondary: ${COLORS.secondary};
    --color-accent: ${COLORS.accent};
    --color-bg-main: ${COLORS.bgMain};
    --color-bg-card: ${COLORS.bgCard};
    --color-bg-soft: ${COLORS.bgSoft};
    --color-text: ${COLORS.text};
    --color-text-secondary: ${COLORS.textSecondary};
    --color-text-muted: ${COLORS.textMuted};
    --color-border: ${COLORS.border};
    --color-border-light: ${COLORS.borderLight};
    --color-border-dark: ${COLORS.borderDark};
    --color-white: ${COLORS.white};
    --color-warning: ${COLORS.warning};
    --sp-xs: 4px; --sp-sm: 6px; --sp-base: 10px; --sp-md: 12px; --sp-lg: 16px; --sp-xl: 20px;
  }
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 10px;
    line-height: 1.5;
    color: var(--color-text);
    background: var(--color-bg-main);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    letter-spacing: 0.2px;
  }
  .pdf-page {
    width: 210mm; min-height: 297mm; padding: 15mm 16mm;
    box-sizing: border-box; position: relative;
    display: flex; flex-direction: column;
    background: var(--color-bg-main);
    page-break-after: always;
  }
  .pdf-page:last-child { page-break-after: avoid; }
  .pdf-page.landscape { width: 297mm; min-height: 210mm; padding: 12mm 14mm; }
  .pdf-header {
    background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%);
    color: white; border-radius: 12px;
    padding: 20px 24px; margin-bottom: 16px;
    display: flex; justify-content: space-between; align-items: center;
    box-shadow: 0 4px 15px rgba(15,23,42,0.05);
  }
  .pdf-header-left { display: flex; flex-direction: column; text-align: left; }
  .pdf-header h1 {
    font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 900;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .pdf-header .pdf-header-sub {
    font-family: 'Outfit', sans-serif; font-size: 8.5px;
    color: #94a3b8; font-weight: 800; text-transform: uppercase;
    letter-spacing: 1.5px; margin-top: 3px;
  }
  .pdf-header-right {
    font-family: 'Outfit', sans-serif; font-size: 11px;
    font-weight: 800; color: #60a5fa; text-transform: uppercase; letter-spacing: 1.2px;
  }
  .pdf-footer {
    margin-top: auto; padding-top: 10px;
    border-top: 1px solid var(--color-border);
    display: flex; justify-content: space-between;
    font-size: 8.5px; color: var(--color-text-secondary);
    font-weight: 500; letter-spacing: 0.5px; flex-shrink: 0;
  }
  .pdf-section { margin-bottom: 16px; }
  .pdf-section-title {
    font-family: 'Outfit', sans-serif; font-size: 12px; font-weight: 900;
    color: var(--color-primary); text-transform: uppercase; letter-spacing: 1px;
    border-bottom: 2px solid var(--color-primary); padding-bottom: 5px; margin-bottom: 12px;
  }
  .pdf-subsection-title {
    font-size: 10px; font-weight: 800; color: var(--color-secondary);
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
  }
  .pdf-card {
    background: var(--color-bg-card); border: 1px solid var(--color-border-light);
    border-radius: 8px; padding: var(--sp-base); margin-bottom: var(--sp-sm);
    page-break-inside: avoid;
  }
  .pdf-card-accent {
    background: var(--color-bg-card); border: 1px solid var(--color-border-light);
    border-left: 4px solid var(--color-accent);
    border-radius: 8px; margin-bottom: var(--sp-sm); page-break-inside: avoid;
  }
  .pdf-stat-card {
    background: var(--color-bg-card); border: 1px solid var(--color-border-light);
    border-radius: 8px; padding: var(--sp-base); text-align: center;
  }
  .pdf-stat-label {
    font-size: 7.5px; font-weight: 800; text-transform: uppercase;
    letter-spacing: 1px; color: var(--color-text-secondary); margin-bottom: 4px;
  }
  .pdf-stat-value {
    font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 900;
    color: var(--color-primary); letter-spacing: -0.5px;
  }
  .pdf-stat-sub {
    font-size: 7.5px; color: var(--color-text-secondary);
    font-weight: 700; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .pdf-observation {
    font-size: 9px; color: var(--color-text); line-height: 1.5;
    white-space: pre-wrap; letter-spacing: 0.2px;
  }
  .pdf-player-name {
    text-transform: uppercase; letter-spacing: 0.2px;
  }
  .pdf-table {
    width: 100%; border-collapse: collapse;
    border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;
    page-break-inside: auto;
  }
  .pdf-table th {
    background: var(--color-primary); color: white;
    padding: 8px 10px; font-size: 9px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.5px; text-align: center;
  }
  .pdf-table td {
    padding: 8px 10px; font-size: 9px;
    border-bottom: 1px solid var(--color-border-light);
    color: var(--color-text); line-height: 1.4;
  }
  .pdf-table tr:last-child td { border-bottom: none; }
  .pdf-tag {
    display: inline-block; padding: 2px 7px; border-radius: 4px;
    font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;
  }
  .pdf-tag-primary { background: #eff6ff; color: var(--color-accent); border: 1px solid #bfdbfe; }
`;

/**
 * Legacy string-based pdfHeader.
 */
export function pdfHeader(title, subtitle, pageNum = 1, totalPages = 1) {
  return `
    <div class="pdf-header">
      <div class="pdf-header-left">
        <h1>${esc(title || '')}</h1>
        ${subtitle ? `<div class="pdf-header-sub">${esc(subtitle)}</div>` : ''}
      </div>
      ${totalPages > 1 ? `<div class="pdf-header-right">${pageNum}/${totalPages}</div>` : ''}
    </div>
  `;
}

/**
 * Legacy string-based pdfFooter.
 */
export function pdfFooter(date, pageNum = 1, totalPages = 1) {
  return `
    <div class="pdf-footer">
      <span>Xtramys Performance ${date ? `· ${esc(date)}` : ''}</span>
      ${totalPages > 1 ? `<span>${pageNum} / ${totalPages}</span>` : ''}
    </div>
  `;
}

/**
 * Wrap HTML content in a styled page (legacy HTML approach).
 * @param {string} content - inner HTML
 * @param {object} opts - { pageNum, totalPages, title, subtitle, date, landscape }
 */
export function pdfPageWrap(content, opts = {}) {
  const { pageNum, totalPages, title, subtitle, date, landscape } = opts;
  return `
    <div class="pdf-page${landscape ? ' landscape' : ''}">
      ${pdfHeader(title, subtitle, pageNum, totalPages)}
      <div style="flex: 1;">${content}</div>
      ${pdfFooter(date, pageNum, totalPages)}
    </div>
  `;
}

/**
 * Wrap page(s) in a full HTML document (legacy HTML approach).
 * @param {string} pages - concatenated page HTML
 * @param {object} opts - { title, landscape, extraCSS }
 */
export function pdfDocument(pages, opts = {}) {
  const { title = 'Xtramys PDF', landscape, extraCSS = '' } = opts;
  const orientationCSS = landscape
    ? '@page { size: A4 landscape; margin: 0; }'
    : '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <link href="${FONT_LINK}" rel="stylesheet">
  <style>
    ${pdfBaseCSS}
    ${orientationCSS}
    ${extraCSS}
  </style>
</head>
<body>
  ${pages}
</body>
</html>`;
}

// ── Render helper ──────────────────────────────────────────────────

/**
 * Render a react-pdf Document component to a blob, create an object URL,
 * and pass it to savePdfToDownloads.
 * @param {React.ReactElement} documentElement - <Document>...</Document> JSX
 * @param {string} fileName - name for the downloaded file (without .pdf)
 */
export async function renderPdf(documentElement, fileName) {
  const blob = await pdf(documentElement).toBlob();
  const uri = URL.createObjectURL(blob);
  const { savePdfToDownloads } = await import('@/utils/pdfDownload');
  await savePdfToDownloads(uri, fileName);
}

// Re-export react-pdf primitives for convenience
export { Document, Page, Text, View, Image, StyleSheet, pdf, Svg, SvgLine };
