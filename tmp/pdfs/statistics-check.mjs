// src/vendor/statistics/pdf.js
import React2 from "react";

// src/utils/pdfFilename.js
function normalizePdfText(value) {
  return String(value || "").normalize("NFC").replace(/[ÃÂ][\u0080-\u00bf]+/g, (text) => {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(text, (char) => char.charCodeAt(0)));
    } catch {
      return text;
    }
  });
}

// src/utils/pdfDesign.js
import React from "react";
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
  Link
} from "@react-pdf/renderer";
import { jsx, jsxs } from "react/jsx-runtime";
var COLORS = {
  primary: "#111827",
  secondary: "#374151",
  accent: "#2563eb",
  bgMain: "#eef2f7",
  bgCard: "#ffffff",
  bgSoft: "#f8fafc",
  text: "#1f2937",
  textSecondary: "#4b5563",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  borderDark: "#cbd5e1",
  white: "#ffffff",
  warning: "#b45309",
  success: "#166534",
  danger: "#b91c1c",
  accentLight: "#eff6ff",
  accentBorder: "#bfdbfe"
};
var SPACING = {
  xs: 4,
  sm: 6,
  base: 10,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 30
};
var FONT_SIZE = {
  xs: 7,
  sm: 8,
  base: 9,
  md: 10,
  lg: 11,
  xl: 12,
  xxl: 14,
  title: 16,
  header: 18
};
var baseStyles = StyleSheet.create({
  page: {
    paddingTop: SPACING.xxl,
    paddingBottom: 50,
    paddingHorizontal: 34,
    backgroundColor: COLORS.bgMain,
    fontFamily: "Helvetica",
    fontSize: FONT_SIZE.base,
    color: COLORS.text
  },
  pageLandscape: {
    paddingTop: SPACING.xl,
    paddingBottom: 45,
    paddingHorizontal: 30,
    backgroundColor: COLORS.bgMain,
    fontFamily: "Helvetica",
    fontSize: FONT_SIZE.base,
    color: COLORS.text
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: SPACING.xl,
    borderBottomWidth: 4,
    borderBottomColor: COLORS.accent
  },
  headerLeft: {
    flexDirection: "column",
    flex: 1
  },
  headerTitle: {
    fontSize: FONT_SIZE.title,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 3,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2
  },
  headerRight: {
    fontSize: FONT_SIZE.lg,
    color: "#60a5fa",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1
  },
  headerDate: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2
  },
  // Footer (fixed at bottom)
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  footerText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    letterSpacing: 0.3
  },
  // Section
  section: {
    marginBottom: SPACING.lg
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: SPACING.sm,
    backgroundColor: "#e8eef7",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  sectionTitle: {
    fontSize: FONT_SIZE.xl,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  subsectionTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Helvetica-Bold",
    color: COLORS.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.sm
  },
  // Cards
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#d8e0eb",
    borderRadius: 9,
    padding: SPACING.md,
    marginBottom: SPACING.sm
  },
  cardAccent: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    borderRadius: 6,
    padding: SPACING.base,
    marginBottom: SPACING.sm
  },
  // Stat cards (for summary grids)
  statCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: "#d8e0eb",
    borderRadius: 9,
    padding: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    flex: 1
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    fontFamily: "Helvetica-Bold",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3
  },
  statValue: {
    fontSize: FONT_SIZE.xxl,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary
  },
  statSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  // Table styles
  tableContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: "hidden"
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  tableRowLast: {
    flexDirection: "row"
  },
  tableHeaderCell: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flex: 1
  },
  tableHeaderText: {
    fontSize: FONT_SIZE.sm,
    fontFamily: "Helvetica-Bold",
    color: COLORS.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center"
  },
  tableLabelCell: {
    backgroundColor: COLORS.bgSoft,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: 120,
    justifyContent: "center"
  },
  tableLabelText: {
    fontSize: FONT_SIZE.base,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary
  },
  tableCell: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    flex: 1,
    justifyContent: "center"
  },
  tableCellText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    lineHeight: 1.4
  },
  // Question row (key-value)
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: SPACING.sm
  },
  questionLabel: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    flex: 1
  },
  questionValue: {
    fontSize: FONT_SIZE.base,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textAlign: "right",
    maxWidth: "60%",
    marginLeft: SPACING.md
  },
  noValue: {
    color: COLORS.textSecondary,
    fontFamily: "Helvetica-Oblique"
  },
  // Tags / badges
  tag: {
    backgroundColor: COLORS.accentLight,
    color: COLORS.accent,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    fontSize: FONT_SIZE.sm,
    fontFamily: "Helvetica-Bold",
    borderWidth: 1,
    borderColor: COLORS.accentBorder
  },
  tagPrimary: {
    backgroundColor: COLORS.accent,
    color: COLORS.white,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    fontSize: FONT_SIZE.xl,
    fontFamily: "Helvetica-Bold"
  },
  // Observations
  obsBox: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.base,
    marginTop: SPACING.sm
  },
  obsText: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    lineHeight: 1.5
  },
  // Player items
  playerItem: {
    width: "48%",
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    borderRadius: 6,
    padding: 8,
    marginBottom: SPACING.sm
  },
  playerName: {
    fontSize: FONT_SIZE.base,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textTransform: "uppercase"
  },
  playerNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 1.3
  },
  // Utilities
  row: {
    flexDirection: "row"
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center"
  },
  col: {
    flexDirection: "column"
  },
  flex1: {
    flex: 1
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
  bold: { fontFamily: "Helvetica-Bold" },
  italic: { fontFamily: "Helvetica-Oblique" },
  uppercase: { textTransform: "uppercase" },
  textCenter: { textAlign: "center" },
  textRight: { textAlign: "right" }
});
var PdfHeader = ({ title, subtitle, date, right, transparent = false }) => {
  const headerStyle = [
    baseStyles.header,
    transparent && {
      backgroundColor: "transparent",
      paddingVertical: 10,
      paddingHorizontal: 0,
      borderRadius: 0,
      borderBottomWidth: 1.5,
      borderBottomColor: "#cbd5e1",
      marginBottom: 16
    }
  ];
  const titleStyle = [
    baseStyles.headerTitle,
    transparent && {
      color: "#0f172a"
    }
  ];
  const subtitleStyle = [
    baseStyles.headerSubtitle,
    transparent && {
      color: "#4b5563"
    }
  ];
  const dateStyle = [
    baseStyles.headerDate,
    transparent && {
      color: "#6b7280"
    }
  ];
  const rightStyle = [
    baseStyles.headerRight,
    transparent && {
      color: "#2563eb"
    }
  ];
  return /* @__PURE__ */ jsxs(View, { style: headerStyle, children: [
    /* @__PURE__ */ jsxs(View, { style: baseStyles.headerLeft, children: [
      /* @__PURE__ */ jsx(Text, { style: titleStyle, children: title || "" }),
      subtitle ? /* @__PURE__ */ jsx(Text, { style: subtitleStyle, children: subtitle }) : null,
      date ? /* @__PURE__ */ jsx(Text, { style: dateStyle, children: date }) : null
    ] }),
    right ? /* @__PURE__ */ jsx(Text, { style: rightStyle, children: right }) : null
  ] });
};
var PdfFooter = ({ text = "Xtramys" }) => /* @__PURE__ */ jsxs(View, { style: baseStyles.footer, fixed: true, children: [
  /* @__PURE__ */ jsx(Text, { style: baseStyles.footerText, children: text }),
  /* @__PURE__ */ jsx(
    Text,
    {
      style: baseStyles.footerText,
      render: ({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`
    }
  )
] });
var PdfSection = ({ title, children, style, keepTogether = false }) => /* @__PURE__ */ jsxs(View, { style: [baseStyles.section, style], wrap: !keepTogether, children: [
  title ? /* @__PURE__ */ jsx(View, { style: baseStyles.sectionHeader, minPresenceAhead: 96, children: /* @__PURE__ */ jsx(Text, { style: baseStyles.sectionTitle, children: title }) }) : null,
  children
] });
var pdfBaseCSS = `
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
async function renderPdf(documentElement, fileName) {
  globalThis.__statisticsDocument = documentElement;
  globalThis.__statisticsFilename = fileName;
}

// src/vendor/statistics/pdf.js
import { Fragment, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var s = {
  grid2: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.md },
  grid3: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.base },
  grid4: { flexDirection: "row", justifyContent: "space-between", gap: SPACING.sm },
  halfColumn: { width: "48%", marginBottom: SPACING.md },
  col3: { width: "31%", marginBottom: SPACING.sm },
  col4: { width: "23%", marginBottom: SPACING.sm },
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.base,
    marginBottom: SPACING.sm
  },
  cardTitle: {
    fontSize: FONT_SIZE.md,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    textTransform: "uppercase"
  },
  // Bar List
  barListItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4
  },
  barListLabel: {
    width: 60,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontFamily: "Helvetica-Bold"
  },
  barListTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.bgSoft,
    borderRadius: 4,
    overflow: "hidden",
    marginHorizontal: SPACING.sm
  },
  barListFill: {
    height: "100%",
    borderRadius: 4
  },
  barListVal: {
    width: 20,
    fontSize: FONT_SIZE.sm,
    fontFamily: "Helvetica-Bold",
    color: COLORS.primary,
    textAlign: "right"
  },
  // Metric Box
  metricBox: {
    alignItems: "center",
    padding: SPACING.base,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1
  },
  metricVal: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2
  },
  metricLbl: {
    fontSize: FONT_SIZE.xs,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: COLORS.textSecondary,
    textAlign: "center"
  },
  // Table
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: "hidden",
    marginTop: SPACING.sm
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight
  },
  headerCell: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  headerText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    textAlign: "center"
  },
  cell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: "center"
  },
  cellText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text,
    textAlign: "center"
  },
  cellBold: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.primary,
    fontFamily: "Helvetica-Bold",
    textAlign: "center"
  },
  badge: {
    paddingVertical: 1,
    paddingHorizontal: 3,
    borderRadius: 4,
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    alignSelf: "center"
  }
};
var getPlayerFullName = (player, t) => {
  if (!player) return t ? t("common.unknown", "Desconocido") : "Desconocido";
  const name = player.nombre || "";
  const surname = player.apellidos || player.apellido || "";
  const fullName = `${name} ${surname}`.trim();
  return (player.apodo || "").trim() || fullName || (t ? t("common.unknown", "Desconocido") : "Desconocido");
};
var mapZoneKey = (zoneValue) => {
  if (!zoneValue) return "other";
  const val = zoneValue.trim().toLowerCase();
  const map = {
    "cabeza": "head",
    "head": "head",
    "hombro": "shoulder",
    "shoulder": "shoulder",
    "brazo": "arm",
    "arm": "arm",
    "espalda": "back",
    "back": "back",
    "cadera": "hip",
    "hip": "hip",
    "muslo": "thigh",
    "thigh": "thigh",
    "rodilla": "knee",
    "knee": "knee",
    "tobillo": "ankle",
    "ankle": "ankle",
    "pie": "foot",
    "foot": "foot",
    "otro": "other",
    "otra": "other",
    "other": "other"
  };
  return map[val] || val;
};
var translateZone = (zona, t) => {
  if (!zona) return t ? t("common.unknown", "Desconocido") : "Desconocido";
  const val = zona.value || (typeof zona === "string" ? zona : "");
  const label = zona.label || (typeof zona === "string" ? zona : "");
  if (!val) return t ? t("common.unknown", "Desconocido") : "Desconocido";
  const key = mapZoneKey(val);
  const trans = t ? t(`injuryStats.zones.${key}`) : null;
  if (trans && !trans.startsWith("injuryStats.zones.")) {
    return trans;
  }
  return label || val;
};
var mapTypeKey = (typeValue) => {
  if (!typeValue) return "other";
  const val = typeValue.trim().toLowerCase();
  const map = {
    "muscular": "muscular",
    "ligamentosa": "ligament",
    "ligamento": "ligament",
    "ligament": "ligament",
    "\xF3sea": "bone",
    "osea": "bone",
    "bone": "bone",
    "contusi\xF3n": "contusion",
    "contusion": "contusion",
    "otra": "other",
    "otro": "other",
    "other": "other"
  };
  return map[val] || val;
};
var translateType = (tipo, t) => {
  if (!tipo) return t ? t("common.unknown", "Desconocido") : "Desconocido";
  const val = tipo.value || (typeof tipo === "string" ? tipo : "");
  const label = tipo.label || (typeof tipo === "string" ? tipo : "");
  if (!val) return t ? t("common.unknown", "Desconocido") : "Desconocido";
  const key = mapTypeKey(val);
  const trans = t ? t(`injuryStats.types.${key}`) : null;
  if (trans && !trans.startsWith("injuryStats.types.")) {
    return trans;
  }
  return label || val;
};
var translatePosition = (position, t) => {
  if (!position) return "-";
  const posUpper = position.trim().toUpperCase();
  const mapping = {
    "GK": "GK",
    "GOALKEEPER": "GK",
    "LB": "LB",
    "LEFT BACK": "LB",
    "CB": "CB",
    "CENTER BACK": "CB",
    "CENTRAL": "CB",
    "RB": "RB",
    "RIGHT BACK": "RB",
    "CDM": "CDM",
    "DEFENSIVE MIDFIELDER": "CDM",
    "DEFENSIVE MID.": "CDM",
    "DEFENSIVE MID": "CDM",
    "CM": "CM",
    "CENTER MIDFIELDER": "CM",
    "CENTER MID.": "CM",
    "CENTER MID": "CM",
    "CAM": "CAM",
    "ATTACKING MIDFIELDER": "CAM",
    "ATTACKING MID.": "CAM",
    "ATTACKING MID": "CAM",
    "LM": "LM",
    "LEFT MIDFIELDER": "LM",
    "LEFT MID.": "LM",
    "LEFT MID": "LM",
    "RM": "RM",
    "RIGHT MIDFIELDER": "RM",
    "RIGHT MID.": "RM",
    "RIGHT MID": "RM",
    "LW": "LW",
    "LEFT WINGER": "LW",
    "RW": "RW",
    "RIGHT WINGER": "RW",
    "ST": "ST",
    "STRIKER": "ST",
    "FORWARD": "ST",
    "PORTERO": "GK",
    "ARQUERO": "GK",
    "LATERAL": "LB",
    "LATERAL IZQUIERDO": "LB",
    "LATERAL IZQ.": "LB",
    "LATERAL IZQ": "LB",
    "DEFENSA CENTRAL": "CB",
    "CENTRAL CENTRAL": "CB",
    "LATERAL DERECHO": "RB",
    "LATERAL DER.": "RB",
    "LATERAL DER": "RB",
    "MEDIOCENTRO DEFENSIVO": "CDM",
    "MEDIOCENTRO DEF.": "CDM",
    "CENTROCAMPISTA": "CM",
    "MEDIO": "CM",
    "VOLANTE": "CM",
    "MEDIAPUNTA": "CAM",
    "MEDIO IZQUIERDO": "LM",
    "MEDIOCAMPO IZQ.": "LM",
    "MEDIOCAMPO IZQ": "LM",
    "MEDIO DERECHO": "RM",
    "MEDIOCAMPO DER.": "RM",
    "MEDIOCAMPO DER": "RM",
    "EXTREMO": "winger",
    "WINGER": "winger",
    "EXTREMO IZQUIERDO": "LW",
    "EXTREMO IZQ.": "LW",
    "EXTREMO IZQ": "LW",
    "EXTREMO DERECHO": "RW",
    "EXTREMO DER.": "RW",
    "EXTREMO DER": "RW",
    "DELANTERO CENTRO": "ST",
    "DELANTERO": "ST",
    "PUNTA": "ST"
  };
  const key = mapping[posUpper] || posUpper;
  let trans = t ? t(`formations.positions.${key}`) : null;
  if (trans && !trans.startsWith("formations.positions.")) {
    return trans;
  }
  const playerPosKeyMap = {
    "winger": "winger",
    "extremo": "winger",
    "portero": "goalkeeper",
    "gk": "goalkeeper",
    "lateral": "lateral",
    "central": "central",
    "cb": "central",
    "centrocampista": "midfielder",
    "cm": "midfielder",
    "delantero": "forward",
    "st": "forward"
  };
  const pk = playerPosKeyMap[key.toLowerCase()];
  if (pk) {
    trans = t ? t(`player.positions.${pk}`) : null;
    if (trans && !trans.startsWith("player.positions.")) {
      return trans;
    }
  }
  return position;
};
var GoalStatsCard = ({ goalStats = {}, own = false, t }) => {
  const buckets = goalStats.buckets || {};
  const maxBucketCount = Math.max(...Object.values(buckets), 1);
  return /* @__PURE__ */ jsxs2(View, { wrap: false, style: [s.halfColumn, s.card], children: [
    /* @__PURE__ */ jsx2(Text, { style: s.cardTitle, children: own ? t("statistics.team.ownGoalStats", "Estad\xEDsticas de goles a favor") : t("statistics.team.rivalGoalStats", "Estad\xEDsticas de goles rivales") }),
    goalStats.hasData ? /* @__PURE__ */ jsxs2(Fragment, { children: [
      /* @__PURE__ */ jsxs2(View, { style: [s.grid3, { marginBottom: SPACING.md }], children: [
        /* @__PURE__ */ jsxs2(View, { style: [s.col3, s.metricBox, { backgroundColor: own ? "#f0fdf4" : "#fef2f2", borderColor: own ? "#bbf7d0" : "#fecaca", padding: 4 }], children: [
          /* @__PURE__ */ jsxs2(Text, { style: [s.metricVal, { color: own ? "#15803d" : "#dc2626", fontSize: 16 }], children: [
            goalStats.avgFirstGoal,
            "'"
          ] }),
          /* @__PURE__ */ jsx2(Text, { style: [s.metricLbl, { color: own ? "#166534" : "#991b1b", fontSize: 6 }], children: own ? t("statistics.minFirstGoalScored", "Min. 1\xBA gol a favor") : t("statistics.minFirstGoalConceded", "Min. 1\xBA gol") })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.col3, s.metricBox, { backgroundColor: COLORS.bgSoft, borderColor: COLORS.border, padding: 4 }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: COLORS.primary, fontSize: 16 }], children: goalStats.avgPerMatch }),
          /* @__PURE__ */ jsx2(Text, { style: [s.metricLbl, { fontSize: 6 }], children: t("statistics.goalsPerMatch", "Goles / P") })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.col3, s.metricBox, { backgroundColor: "#fffbeb", borderColor: "#fde68a", padding: 4 }], children: [
          /* @__PURE__ */ jsxs2(Text, { style: [s.metricVal, { color: "#d97706", fontSize: 16 }], children: [
            goalStats.mostDangerousPeriod,
            "'"
          ] }),
          /* @__PURE__ */ jsx2(Text, { style: [s.metricLbl, { color: "#b45309", fontSize: 6 }], children: own ? t("statistics.bestScoringPeriod", "M\xE1s efectivo") : t("statistics.criticalPeriod", "Cr\xEDtico") })
        ] })
      ] }),
      Object.entries(buckets).map(([period, count], i) => /* @__PURE__ */ jsxs2(View, { style: s.barListItem, children: [
        /* @__PURE__ */ jsxs2(Text, { style: s.barListLabel, children: [
          period,
          "'"
        ] }),
        /* @__PURE__ */ jsx2(View, { style: s.barListTrack, children: /* @__PURE__ */ jsx2(View, { style: [s.barListFill, { width: `${Math.max(count / maxBucketCount * 100, count > 0 ? 5 : 0)}%`, backgroundColor: period === goalStats.mostDangerousPeriod ? own ? COLORS.success : COLORS.danger : COLORS.textMuted }] }) }),
        /* @__PURE__ */ jsx2(Text, { style: s.barListVal, children: count })
      ] }, i)),
      /* @__PURE__ */ jsxs2(View, { style: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 8, paddingTop: 6 }, children: [
        /* @__PURE__ */ jsxs2(Text, { style: { fontSize: 8, color: COLORS.textSecondary }, children: [
          t("statistics.firstHalfAbbr", "1\xAA"),
          ": ",
          /* @__PURE__ */ jsx2(Text, { style: { color: COLORS.primary, fontFamily: "Helvetica-Bold" }, children: goalStats.firstHalfGoals })
        ] }),
        /* @__PURE__ */ jsxs2(Text, { style: { fontSize: 8, color: COLORS.textSecondary }, children: [
          t("statistics.secondHalfAbbr", "2\xAA"),
          ": ",
          /* @__PURE__ */ jsx2(Text, { style: { color: COLORS.primary, fontFamily: "Helvetica-Bold" }, children: goalStats.secondHalfGoals })
        ] }),
        /* @__PURE__ */ jsxs2(Text, { style: { fontSize: 8, color: COLORS.textSecondary }, children: [
          t("statistics.minAbbr", "Min"),
          ": ",
          /* @__PURE__ */ jsxs2(Text, { style: { color: COLORS.primary, fontFamily: "Helvetica-Bold" }, children: [
            goalStats.earliest,
            "'"
          ] })
        ] }),
        /* @__PURE__ */ jsxs2(Text, { style: { fontSize: 8, color: COLORS.textSecondary }, children: [
          t("statistics.maxAbbr", "Max"),
          ": ",
          /* @__PURE__ */ jsxs2(Text, { style: { color: COLORS.primary, fontFamily: "Helvetica-Bold" }, children: [
            goalStats.latest,
            "'"
          ] })
        ] })
      ] })
    ] }) : /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontStyle: "italic" }, children: t("statistics.noGoalMinutes", "No hay minutos de gol registrados en las fichas de partido.") }),
    goalStats.totalTimedGoals < goalStats.totalGoals && /* @__PURE__ */ jsx2(Text, { style: { fontSize: 7, color: COLORS.textSecondary, marginTop: 8 }, children: t("statistics.recordedGoalMinutes", { defaultValue: "Minutos registrados: {{recorded}} de {{total}} goles.", recorded: goalStats.totalTimedGoals, total: goalStats.totalGoals }) })
  ] });
};
var TeamStatsPage = ({ stats, t, title, date, hideHeader = false }) => {
  if (!stats) return null;
  const team = stats.team;
  const formationsList = Object.entries(team.formations || {}).sort((a, b) => b[1] - a[1]);
  const maxFormationCount = formationsList.length > 0 ? Math.max(...formationsList.map((f) => f[1]), 1) : 1;
  return /* @__PURE__ */ jsxs2(Page, { size: "A4", style: baseStyles.page, children: [
    !hideHeader && /* @__PURE__ */ jsx2(PdfHeader, { title, subtitle: t("statistics.tabs.team"), date }),
    /* @__PURE__ */ jsx2(PdfFooter, {}),
    /* @__PURE__ */ jsxs2(PdfSection, { title: t("statistics.teamPerformance", "Rendimiento del Equipo"), children: [
      /* @__PURE__ */ jsxs2(View, { style: s.grid2, children: [
        /* @__PURE__ */ jsxs2(View, { style: [s.halfColumn, s.card, { flexDirection: "row", alignItems: "center" }], children: [
          /* @__PURE__ */ jsxs2(View, { style: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginRight: SPACING.base }, children: [
            /* @__PURE__ */ jsxs2(Text, { style: { color: COLORS.white, fontSize: 16, fontFamily: "Helvetica-Bold" }, children: [
              team.winRate,
              "%"
            ] }),
            /* @__PURE__ */ jsx2(Text, { style: { color: COLORS.textMuted, fontSize: 7 }, children: t("statistics.wins") })
          ] }),
          /* @__PURE__ */ jsxs2(View, { style: { flex: 1 }, children: [
            /* @__PURE__ */ jsxs2(View, { style: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 4, marginBottom: 4 }, children: [
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary }, children: t("statistics.matchesPlayed", "Partidos Jugados") }),
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.md, fontFamily: "Helvetica-Bold", color: COLORS.primary }, children: team.matches })
            ] }),
            /* @__PURE__ */ jsxs2(View, { style: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }, children: [
              /* @__PURE__ */ jsxs2(Text, { style: { fontSize: FONT_SIZE.sm, color: COLORS.success, fontFamily: "Helvetica-Bold" }, children: [
                "\u2022 ",
                t("statistics.wins", "Victorias")
              ] }),
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.sm, fontFamily: "Helvetica-Bold" }, children: team.wins })
            ] }),
            /* @__PURE__ */ jsxs2(View, { style: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }, children: [
              /* @__PURE__ */ jsxs2(Text, { style: { fontSize: FONT_SIZE.sm, color: COLORS.warning, fontFamily: "Helvetica-Bold" }, children: [
                "\u2022 ",
                t("statistics.draws", "Empates")
              ] }),
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.sm, fontFamily: "Helvetica-Bold" }, children: team.draws })
            ] }),
            /* @__PURE__ */ jsxs2(View, { style: { flexDirection: "row", justifyContent: "space-between" }, children: [
              /* @__PURE__ */ jsxs2(Text, { style: { fontSize: FONT_SIZE.sm, color: COLORS.danger, fontFamily: "Helvetica-Bold" }, children: [
                "\u2022 ",
                t("statistics.losses", "Derrotas")
              ] }),
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.sm, fontFamily: "Helvetica-Bold" }, children: team.losses })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.halfColumn, s.card], children: [
          /* @__PURE__ */ jsx2(Text, { style: s.cardTitle, children: t("statistics.goalsBalance", "Balance de Goles") }),
          /* @__PURE__ */ jsxs2(View, { style: s.grid2, children: [
            /* @__PURE__ */ jsxs2(View, { style: [s.halfColumn, s.metricBox, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }], children: [
              /* @__PURE__ */ jsx2(Text, { style: [s.metricLbl, { color: "#166534" }], children: t("statistics.goalsFor") }),
              /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: "#15803d" }], children: team.goalsFor }),
              /* @__PURE__ */ jsxs2(Text, { style: { fontSize: 7, color: "#166534" }, children: [
                t("statistics.avg", "Avg"),
                ": ",
                (team.matches > 0 ? team.goalsFor / team.matches : 0).toFixed(1),
                " / ",
                t("statistics.matchAbbr", "p")
              ] })
            ] }),
            /* @__PURE__ */ jsxs2(View, { style: [s.halfColumn, s.metricBox, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }], children: [
              /* @__PURE__ */ jsx2(Text, { style: [s.metricLbl, { color: "#991b1b" }], children: t("statistics.goalsAgainst") }),
              /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: "#b91c1c" }], children: team.goalsAgainst }),
              /* @__PURE__ */ jsxs2(Text, { style: { fontSize: 7, color: "#991b1b" }, children: [
                t("statistics.avg", "Avg"),
                ": ",
                (team.matches > 0 ? team.goalsAgainst / team.matches : 0).toFixed(1),
                " / ",
                t("statistics.matchAbbr", "p")
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs2(View, { style: { flexDirection: "row", justifyContent: "space-between", backgroundColor: COLORS.bgSoft, padding: 6, borderRadius: 4, marginTop: 4 }, children: [
            /* @__PURE__ */ jsxs2(Text, { style: { fontSize: FONT_SIZE.xs, fontFamily: "Helvetica-Bold" }, children: [
              t("statistics.diff", "Dif"),
              ": ",
              /* @__PURE__ */ jsxs2(Text, { style: { color: team.goalsFor >= team.goalsAgainst ? COLORS.success : COLORS.danger }, children: [
                team.goalsFor - team.goalsAgainst > 0 ? "+" : "",
                team.goalsFor - team.goalsAgainst
              ] })
            ] }),
            /* @__PURE__ */ jsxs2(Text, { style: { fontSize: FONT_SIZE.xs, fontFamily: "Helvetica-Bold" }, children: [
              t("statistics.cleanSheets", "Porter\xEDas a 0"),
              ": ",
              /* @__PURE__ */ jsx2(Text, { style: { color: COLORS.accent }, children: team.cleanSheets })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx2(View, { style: s.grid2, children: /* @__PURE__ */ jsxs2(View, { style: [s.card, { width: "100%" }], children: [
        /* @__PURE__ */ jsx2(Text, { style: s.cardTitle, children: t("statistics.preferredFormation", "Formaciones Utilizadas") }),
        /* @__PURE__ */ jsxs2(View, { style: { flexDirection: "row", justifyContent: "space-between", backgroundColor: COLORS.bgSoft, padding: 8, borderRadius: 6, marginBottom: 12 }, children: [
          /* @__PURE__ */ jsxs2(View, { children: [
            /* @__PURE__ */ jsx2(Text, { style: { fontSize: 7, color: COLORS.textSecondary, fontFamily: "Helvetica-Bold", textTransform: "uppercase" }, children: t("statistics.mostUsed", "M\xE1s Usada") }),
            /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.lg, color: COLORS.accent, fontFamily: "Helvetica-Bold" }, children: team.mostUsedFormation || "-" })
          ] }),
          /* @__PURE__ */ jsxs2(View, { children: [
            /* @__PURE__ */ jsx2(Text, { style: { fontSize: 7, color: COLORS.textSecondary, fontFamily: "Helvetica-Bold", textTransform: "uppercase" }, children: t("statistics.avgSubsPerMatch", "Avg Cambios / P.") }),
            /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.lg, color: "#7c3aed", fontFamily: "Helvetica-Bold" }, children: team.avgSubs || "-" })
          ] })
        ] }),
        formationsList.length > 0 ? formationsList.map(([formation, count], i) => /* @__PURE__ */ jsxs2(View, { style: s.barListItem, children: [
          /* @__PURE__ */ jsx2(Text, { style: s.barListLabel, children: formation }),
          /* @__PURE__ */ jsx2(View, { style: s.barListTrack, children: /* @__PURE__ */ jsx2(View, { style: [s.barListFill, { width: `${count / maxFormationCount * 100}%`, backgroundColor: COLORS.accent }] }) }),
          /* @__PURE__ */ jsx2(Text, { style: s.barListVal, children: count })
        ] }, i)) : /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontStyle: "italic" }, children: t("statistics.noData") })
      ] }) }),
      /* @__PURE__ */ jsxs2(View, { style: s.grid2, wrap: false, children: [
        /* @__PURE__ */ jsx2(GoalStatsCard, { goalStats: team.ownGoalStats, own: true, t }),
        /* @__PURE__ */ jsx2(GoalStatsCard, { goalStats: team.rivalGoalStats, t })
      ] })
    ] })
  ] });
};
var PlayersStatsPage = ({ stats, t, title, date, hideHeader = false }) => {
  if (!stats || !stats.players) return null;
  const sortedPlayers = [...stats.players].sort((a, b) => b.minutes - a.minutes);
  const totalGoals = stats.players.reduce((acc, p) => acc + p.goals, 0);
  const totalAssists = stats.players.reduce((acc, p) => acc + p.assists, 0);
  const totalPlayers = stats.players.length;
  return /* @__PURE__ */ jsxs2(Page, { size: "A4", style: baseStyles.page, children: [
    !hideHeader && /* @__PURE__ */ jsx2(PdfHeader, { title, subtitle: t("statistics.tabs.players"), date }),
    /* @__PURE__ */ jsx2(PdfFooter, {}),
    /* @__PURE__ */ jsxs2(PdfSection, { title: t("statistics.playersPerformance", "Estad\xEDsticas Individuales"), children: [
      /* @__PURE__ */ jsxs2(View, { style: s.grid3, children: [
        /* @__PURE__ */ jsxs2(View, { style: [s.col3, s.metricBox, { backgroundColor: COLORS.bgSoft, borderColor: COLORS.border }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: COLORS.primary }], children: totalPlayers }),
          /* @__PURE__ */ jsx2(Text, { style: s.metricLbl, children: t("statistics.playersCount", "Plantilla") })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.col3, s.metricBox, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: "#15803d" }], children: totalGoals }),
          /* @__PURE__ */ jsx2(Text, { style: s.metricLbl, children: t("statistics.goals", "Goles Totales") })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.col3, s.metricBox, { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: "#7c3aed" }], children: totalAssists }),
          /* @__PURE__ */ jsx2(Text, { style: s.metricLbl, children: t("statistics.assists", "Asistencias Totales") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2(View, { style: s.table, children: [
        /* @__PURE__ */ jsxs2(View, { style: s.row, children: [
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "4%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: "#" }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "26%", alignItems: "flex-start", paddingLeft: 6 }], children: /* @__PURE__ */ jsx2(Text, { style: [s.headerText, { textAlign: "left" }], children: t("statistics.weeklyAttendance.player", "Jugador") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "18%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("statistics.sortLabels.position", "Posici\xF3n") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "7%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("statistics.matchesPlayedAbbr", "PJ") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "10%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("statistics.sortLabels.minutes", "Min") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "6%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("statistics.goalsAbbr", "G") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "6%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("statistics.assistsAbbr", "A") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "6%", alignItems: "center", justifyContent: "center" }], children: /* @__PURE__ */ jsx2(View, { style: { width: 8, height: 11, backgroundColor: "#fbbf24", borderRadius: 1.5, borderWidth: 0.5, borderColor: "#d97706" } }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "6%", alignItems: "center", justifyContent: "center" }], children: /* @__PURE__ */ jsx2(View, { style: { width: 8, height: 11, backgroundColor: "#ef4444", borderRadius: 1.5, borderWidth: 0.5, borderColor: "#b91c1c" } }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "11%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("statistics.attendancePercentageAbbr", "% Asis.") }) })
        ] }),
        sortedPlayers.map((player, idx) => {
          const attendanceColor = player.attendancePercentage >= 80 ? COLORS.success : player.attendancePercentage >= 60 ? COLORS.warning : COLORS.danger;
          return /* @__PURE__ */ jsxs2(View, { style: s.row, wrap: false, children: [
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "4%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.cellText, { color: COLORS.textSecondary }], children: player.number }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "26%", alignItems: "flex-start", paddingLeft: 6 }], children: /* @__PURE__ */ jsx2(Text, { style: [s.cellBold, { textAlign: "left" }], children: player.name }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "18%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.cellText, { fontSize: 7, textTransform: "uppercase" }], children: translatePosition(player.position, t) }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "7%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.cellText, children: player.matches }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "10%" }], children: /* @__PURE__ */ jsxs2(Text, { style: [s.cellBold, { color: COLORS.accent }], children: [
              player.minutes,
              "'"
            ] }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "6%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.cellBold, { color: player.goals > 0 ? COLORS.success : COLORS.textMuted }], children: player.goals }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "6%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.cellBold, { color: player.assists > 0 ? "#7c3aed" : COLORS.textMuted }], children: player.assists }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "6%", alignItems: "center", justifyContent: "center" }], children: player.yellowCards > 0 ? /* @__PURE__ */ jsx2(Text, { style: [s.cellText, { color: "#b45309", fontFamily: "Helvetica-Bold" }], children: player.yellowCards }) : /* @__PURE__ */ jsx2(Text, { style: [s.cellText, { color: COLORS.textMuted }], children: "0" }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "6%", alignItems: "center", justifyContent: "center" }], children: player.redCards > 0 ? /* @__PURE__ */ jsx2(Text, { style: [s.cellText, { color: "#b91c1c", fontFamily: "Helvetica-Bold" }], children: player.redCards }) : /* @__PURE__ */ jsx2(Text, { style: [s.cellText, { color: COLORS.textMuted }], children: "0" }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "11%" }], children: /* @__PURE__ */ jsxs2(Text, { style: [s.cellBold, { color: attendanceColor }], children: [
              player.attendancePercentage,
              "%"
            ] }) })
          ] }, idx);
        })
      ] })
    ] })
  ] });
};
var InjuriesStatsPage = ({ injuries = [], players = [], t, title, date, hideHeader = false }) => {
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  const activas = injuries.filter((inj) => !inj.fechaFin).length;
  const enRecuperacion = injuries.filter((inj) => inj.fechaFin && new Date(inj.fechaFin) > today).length;
  const recuperadas = injuries.filter((inj) => inj.fechaFin && new Date(inj.fechaFin) <= today).length;
  const total = injuries.length;
  const withRelapse = injuries.filter((inj) => inj.recaida).length;
  const withoutRelapse = total - withRelapse;
  const zoneCounts = {};
  injuries.forEach((injury) => {
    const zone = translateZone(injury.zona, t);
    zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
  });
  const zoneList = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1]);
  const maxZoneCount = zoneList.length > 0 ? Math.max(...zoneList.map((z) => z[1]), 1) : 1;
  const typeCounts = {};
  injuries.forEach((injury) => {
    const type = translateType(injury.tipo, t);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  const typeList = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
  const maxTypeCount = typeList.length > 0 ? Math.max(...typeList.map((t2) => t2[1]), 1) : 1;
  const durationCounts = { corta: 0, media: 0, larga: 0 };
  injuries.forEach((injury) => {
    if (!injury.fechaInicio || !injury.fechaFin) return;
    const startDate = new Date(injury.fechaInicio);
    const endDate = new Date(injury.fechaFin);
    const diffMonths = Math.ceil(Math.abs(endDate - startDate) / (1e3 * 60 * 60 * 24)) / 30;
    if (diffMonths < 1) durationCounts.corta++;
    else if (diffMonths <= 3) durationCounts.media++;
    else durationCounts.larga++;
  });
  const totalWithDuration = durationCounts.corta + durationCounts.media + durationCounts.larga || 1;
  const injuryHistory = injuries;
  const getLocale = () => "es-ES";
  return /* @__PURE__ */ jsxs2(Page, { size: "A4", style: baseStyles.page, children: [
    !hideHeader && /* @__PURE__ */ jsx2(PdfHeader, { title, subtitle: t("statistics.tabs.injuries"), date }),
    /* @__PURE__ */ jsx2(PdfFooter, {}),
    /* @__PURE__ */ jsxs2(PdfSection, { title: t("statistics.injuriesSummary", "Resumen y Distribuci\xF3n de Lesiones"), children: [
      /* @__PURE__ */ jsxs2(View, { style: s.grid4, children: [
        /* @__PURE__ */ jsxs2(View, { style: [s.col4, s.metricBox, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: "#b91c1c" }], children: activas }),
          /* @__PURE__ */ jsx2(Text, { style: [s.metricLbl, { color: "#991b1b" }], children: t("injuryStats.summary.active", "Activas") })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.col4, s.metricBox, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: "#d97706" }], children: enRecuperacion }),
          /* @__PURE__ */ jsx2(Text, { style: [s.metricLbl, { color: "#b45309" }], children: t("injuryStats.status.recovered", "En Recuperaci\xF3n") })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.col4, s.metricBox, { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0" }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: "#15803d" }], children: recuperadas }),
          /* @__PURE__ */ jsx2(Text, { style: [s.metricLbl, { color: "#166534" }], children: t("injuryStats.summary.recovered", "Recuperadas") })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.col4, s.metricBox, { backgroundColor: COLORS.bgSoft, borderColor: COLORS.border }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: COLORS.primary }], children: total }),
          /* @__PURE__ */ jsx2(Text, { style: s.metricLbl, children: t("statistics.historicalTotal", "Total Hist\xF3rico") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2(View, { style: s.grid2, children: [
        /* @__PURE__ */ jsxs2(View, { style: [s.halfColumn, s.card], children: [
          /* @__PURE__ */ jsx2(Text, { style: s.cardTitle, children: t("injuryStats.zones.label", "Zonas Afectadas") }),
          zoneList.length > 0 ? zoneList.map(([name, count], i) => /* @__PURE__ */ jsxs2(View, { style: s.barListItem, children: [
            /* @__PURE__ */ jsx2(Text, { style: s.barListLabel, children: name }),
            /* @__PURE__ */ jsx2(View, { style: s.barListTrack, children: /* @__PURE__ */ jsx2(View, { style: [s.barListFill, { width: `${count / maxZoneCount * 100}%`, backgroundColor: "#ef4444" }] }) }),
            /* @__PURE__ */ jsx2(Text, { style: s.barListVal, children: count })
          ] }, i)) : /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontStyle: "italic" }, children: t("common.noData", "No hay datos") })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.halfColumn, s.card], children: [
          /* @__PURE__ */ jsx2(Text, { style: s.cardTitle, children: t("injuryStats.types.label", "Tipos de Lesiones") }),
          typeList.length > 0 ? typeList.map(([name, count], i) => /* @__PURE__ */ jsxs2(View, { style: s.barListItem, children: [
            /* @__PURE__ */ jsx2(Text, { style: s.barListLabel, children: name }),
            /* @__PURE__ */ jsx2(View, { style: s.barListTrack, children: /* @__PURE__ */ jsx2(View, { style: [s.barListFill, { width: `${count / maxTypeCount * 100}%`, backgroundColor: COLORS.accent }] }) }),
            /* @__PURE__ */ jsx2(Text, { style: s.barListVal, children: count })
          ] }, i)) : /* @__PURE__ */ jsx2(Text, { style: { fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontStyle: "italic" }, children: t("common.noData", "No hay datos") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2(View, { style: s.grid2, children: [
        /* @__PURE__ */ jsxs2(View, { style: [s.halfColumn, s.card], children: [
          /* @__PURE__ */ jsx2(Text, { style: s.cardTitle, children: t("injuryStats.duration.label", "Duraci\xF3n de Lesiones") }),
          /* @__PURE__ */ jsxs2(View, { style: s.barListItem, children: [
            /* @__PURE__ */ jsx2(Text, { style: s.barListLabel, children: t("injuryStats.duration.short_pdf", "Corta (< 1 mes)") }),
            /* @__PURE__ */ jsx2(View, { style: s.barListTrack, children: /* @__PURE__ */ jsx2(View, { style: [s.barListFill, { width: `${durationCounts.corta / totalWithDuration * 100}%`, backgroundColor: "#10b981" }] }) }),
            /* @__PURE__ */ jsx2(Text, { style: s.barListVal, children: durationCounts.corta })
          ] }),
          /* @__PURE__ */ jsxs2(View, { style: s.barListItem, children: [
            /* @__PURE__ */ jsx2(Text, { style: s.barListLabel, children: t("injuryStats.duration.medium_pdf", "Media (1-3 meses)") }),
            /* @__PURE__ */ jsx2(View, { style: s.barListTrack, children: /* @__PURE__ */ jsx2(View, { style: [s.barListFill, { width: `${durationCounts.media / totalWithDuration * 100}%`, backgroundColor: "#f59e0b" }] }) }),
            /* @__PURE__ */ jsx2(Text, { style: s.barListVal, children: durationCounts.media })
          ] }),
          /* @__PURE__ */ jsxs2(View, { style: s.barListItem, children: [
            /* @__PURE__ */ jsx2(Text, { style: s.barListLabel, children: t("injuryStats.duration.long_pdf", "Larga (> 3 meses)") }),
            /* @__PURE__ */ jsx2(View, { style: s.barListTrack, children: /* @__PURE__ */ jsx2(View, { style: [s.barListFill, { width: `${durationCounts.larga / totalWithDuration * 100}%`, backgroundColor: "#ef4444" }] }) }),
            /* @__PURE__ */ jsx2(Text, { style: s.barListVal, children: durationCounts.larga })
          ] })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.halfColumn, s.card, { justifyContent: "center" }], children: [
          /* @__PURE__ */ jsx2(Text, { style: s.cardTitle, children: t("injuryStats.relapseRatio", "Relaci\xF3n de Reca\xEDdas") }),
          /* @__PURE__ */ jsxs2(View, { style: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", backgroundColor: COLORS.bgSoft, padding: SPACING.lg, borderRadius: 6 }, children: [
            /* @__PURE__ */ jsxs2(View, { style: { alignItems: "center" }, children: [
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: 7, color: COLORS.textSecondary, fontFamily: "Helvetica-Bold", textTransform: "uppercase" }, children: t("injuryStats.relapse.new", "Nuevas") }),
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: 24, color: COLORS.success, fontFamily: "Helvetica-Bold" }, children: withoutRelapse })
            ] }),
            /* @__PURE__ */ jsx2(View, { style: { width: 1, height: 30, backgroundColor: COLORS.border } }),
            /* @__PURE__ */ jsxs2(View, { style: { alignItems: "center" }, children: [
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: 7, color: COLORS.textSecondary, fontFamily: "Helvetica-Bold", textTransform: "uppercase" }, children: t("injuryStats.relapse.relapse", "Reca\xEDdas") }),
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: 24, color: COLORS.warning, fontFamily: "Helvetica-Bold" }, children: withRelapse })
            ] }),
            /* @__PURE__ */ jsx2(View, { style: { width: 1, height: 30, backgroundColor: COLORS.border } }),
            /* @__PURE__ */ jsxs2(View, { style: { alignItems: "center" }, children: [
              /* @__PURE__ */ jsx2(Text, { style: { fontSize: 7, color: COLORS.textSecondary, fontFamily: "Helvetica-Bold", textTransform: "uppercase" }, children: t("injuryStats.rate", "Tasa") }),
              /* @__PURE__ */ jsxs2(Text, { style: { fontSize: 24, color: COLORS.danger, fontFamily: "Helvetica-Bold" }, children: [
                total > 0 ? Math.round(withRelapse / total * 100) : 0,
                "%"
              ] })
            ] })
          ] })
        ] })
      ] }),
      injuryHistory.length > 0 ? /* @__PURE__ */ jsxs2(View, { style: s.table, children: [
        /* @__PURE__ */ jsxs2(View, { style: s.row, children: [
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "23%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.headerText, { textAlign: "left" }], children: t("statistics.weeklyAttendance.player", "Jugador") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "20%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("injury.type", "Tipo") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "15%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("injury.zone", "Zona") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "10%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("injury.startDateShort", "Inicio") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "10%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("injury.forecast", "Pronost.") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "12%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("injury.status", "Estado") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "10%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("injury.relapse", "Reca\xEDda") }) })
        ] }),
        injuryHistory.map((inj, idx) => {
          const playerId = inj.jugador?._id || inj.jugador;
          const player = players.find((p) => p._id === playerId);
          const playerName = getPlayerFullName(player || inj.jugador, t);
          const type = translateType(inj.tipo, t);
          const zone = translateZone(inj.zona, t);
          const startDateStr = inj.fechaInicio ? new Date(inj.fechaInicio).toLocaleDateString(getLocale()) : "-";
          const endDateStr = inj.fechaFin ? new Date(inj.fechaFin).toLocaleDateString(getLocale()) : inj.fechaFinPrevista ? new Date(inj.fechaFinPrevista).toLocaleDateString(getLocale()) : "-";
          const statusLabel = inj.fechaFin ? t("injury.recovered", "Recup.") : t("injury.active", "Activa");
          const relapseLabel = inj.recaida ? t("injuryStats.relapse.relapse", "Reca\xEDda") : t("injuryStats.relapse.new", "Nueva");
          return /* @__PURE__ */ jsxs2(View, { style: s.row, wrap: false, children: [
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "23%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.cellBold, { textAlign: "left" }], children: playerName }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "20%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.cellText, { fontSize: 7 }], children: type }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "15%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.cellText, { color: COLORS.textSecondary, fontSize: 7 }], children: zone }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "10%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.cellBold, children: startDateStr }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "10%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.cellBold, children: endDateStr }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "12%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.badge, { backgroundColor: inj.fechaFin ? "#fef3c7" : "#fee2e2", color: inj.fechaFin ? "#b45309" : "#b91c1c" }], children: statusLabel }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "10%" }], children: /* @__PURE__ */ jsx2(Text, { style: [s.badge, { backgroundColor: inj.recaida ? "#fef3c7" : "#dcfce3", color: inj.recaida ? "#b45309" : "#166534" }], children: relapseLabel }) })
          ] }, idx);
        })
      ] }) : /* @__PURE__ */ jsx2(View, { style: { backgroundColor: "#f0fdf4", borderColor: "#bbf7d0", borderWidth: 1, borderRadius: 6, padding: SPACING.md, marginTop: SPACING.sm }, children: /* @__PURE__ */ jsxs2(Text, { style: { textAlign: "center", color: "#15803d", fontFamily: "Helvetica-Bold", fontSize: FONT_SIZE.sm }, children: [
        "\u2713 ",
        t("injuryStats.noInjuries", "No hay lesiones registradas en la plantilla.")
      ] }) })
    ] })
  ] });
};
var CombinedStatsDocument = ({ stats, injuries, players, t, title, date }) => {
  return /* @__PURE__ */ jsxs2(Document, { children: [
    /* @__PURE__ */ jsx2(TeamStatsPage, { stats, t, title, date, hideHeader: false }),
    /* @__PURE__ */ jsx2(PlayersStatsPage, { stats, t, title, date, hideHeader: true }),
    /* @__PURE__ */ jsx2(InjuriesStatsPage, { injuries, players, t, title, date, hideHeader: true })
  ] });
};
async function generateTeamStatsPdf(stats, teamName, dateStr, t) {
  const prefix = t("statistics.pdfPrefixTeam", "Estad\xEDsticas_Equipo");
  const title = normalizePdfText(`${prefix.replace(/_/g, " ")} - ${teamName}`);
  await renderPdf(
    /* @__PURE__ */ jsx2(Document, { children: /* @__PURE__ */ jsx2(TeamStatsPage, { stats, t, title, date: dateStr, hideHeader: false }) }),
    `${prefix.replace(/\s+/g, "_")}_${teamName.replace(/\s+/g, "_")}`
  );
}
async function generatePlayersStatsPdf(stats, teamName, dateStr, t) {
  const prefix = t("statistics.pdfPrefixPlayers", "Estad\xEDsticas_Jugadores");
  const title = normalizePdfText(`${prefix.replace(/_/g, " ")} - ${teamName}`);
  await renderPdf(
    /* @__PURE__ */ jsx2(Document, { children: /* @__PURE__ */ jsx2(PlayersStatsPage, { stats, t, title, date: dateStr, hideHeader: false }) }),
    `${prefix.replace(/\s+/g, "_")}_${teamName.replace(/\s+/g, "_")}`
  );
}
async function generateInjuriesStatsPdf(injuries, players, teamName, dateStr, t) {
  const prefix = t("statistics.pdfPrefixInjuries", "Estad\xEDsticas_Lesiones");
  const title = normalizePdfText(`${prefix.replace(/_/g, " ")} - ${teamName}`);
  await renderPdf(
    /* @__PURE__ */ jsx2(Document, { children: /* @__PURE__ */ jsx2(InjuriesStatsPage, { injuries, players, t, title, date: dateStr, hideHeader: false }) }),
    `${prefix.replace(/\s+/g, "_")}_${teamName.replace(/\s+/g, "_")}`
  );
}
async function generateCombinedStatsPdf(stats, injuries, players, teamName, dateStr, t) {
  const prefix = t("statistics.pdfPrefixCombined", "Reporte_Estad\xEDsticas_Completo");
  const title = normalizePdfText(`${prefix.replace(/_/g, " ")} - ${teamName}`);
  await renderPdf(
    /* @__PURE__ */ jsx2(CombinedStatsDocument, { stats, injuries, players, t, title, date: dateStr }),
    `${prefix.replace(/\s+/g, "_")}_${teamName.replace(/\s+/g, "_")}`
  );
}
var WeeklyAttendancePage = ({ week, teamName, weekLabel, t, title }) => {
  const sortedPlayers = [...week.playerAttendance || []].sort((a, b) => b.percentage - a.percentage);
  const avgAttendance = sortedPlayers.length ? Math.round(sortedPlayers.reduce((acc, p) => acc + (p.percentage || 0), 0) / sortedPlayers.length) : 0;
  const noAbsences = t("statistics.weeklyAttendance.noDays", "Ninguna");
  return /* @__PURE__ */ jsxs2(Page, { size: "A4", style: baseStyles.page, children: [
    /* @__PURE__ */ jsx2(
      PdfHeader,
      {
        title,
        subtitle: `${t("statistics.weeklyAttendance.weekOf") || "Semana del"}: ${weekLabel}`,
        right: teamName
      }
    ),
    /* @__PURE__ */ jsxs2(View, { style: baseStyles.content, children: [
      /* @__PURE__ */ jsxs2(View, { style: [s.grid3, { marginBottom: SPACING.lg }], wrap: false, children: [
        /* @__PURE__ */ jsxs2(View, { style: [s.metricBox, { backgroundColor: COLORS.bgCard }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: COLORS.primary }], children: week.totalSessions }),
          /* @__PURE__ */ jsx2(Text, { style: s.metricLbl, children: week.totalSessions === 1 ? t("statistics.weeklyAttendance.training") : t("statistics.weeklyAttendance.trainings") })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.metricBox, { backgroundColor: COLORS.bgCard }], children: [
          /* @__PURE__ */ jsx2(Text, { style: [s.metricVal, { color: COLORS.primary }], children: sortedPlayers.length }),
          /* @__PURE__ */ jsx2(Text, { style: s.metricLbl, children: t("statistics.playersCount") || "Jugadores" })
        ] }),
        /* @__PURE__ */ jsxs2(View, { style: [s.metricBox, { backgroundColor: COLORS.bgCard }], children: [
          /* @__PURE__ */ jsxs2(Text, { style: [s.metricVal, { color: COLORS.accent }], children: [
            avgAttendance,
            "%"
          ] }),
          /* @__PURE__ */ jsx2(Text, { style: s.metricLbl, children: t("statistics.weeklyAttendance.avgAttendance") || "Media Asistencia" })
        ] })
      ] }),
      /* @__PURE__ */ jsx2(PdfSection, { title: t("statistics.weeklyAttendance.pdfTitle") || "Asistencia Semanal", children: /* @__PURE__ */ jsxs2(View, { style: s.table, children: [
        /* @__PURE__ */ jsxs2(View, { style: s.row, children: [
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "34%", alignItems: "flex-start", paddingLeft: 8 }], children: /* @__PURE__ */ jsx2(Text, { style: [s.headerText, { textAlign: "left" }], children: t("statistics.weeklyAttendance.player", "Jugador") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "14%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("statistics.weeklyAttendance.attended", "Asistidos") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "16%" }], children: /* @__PURE__ */ jsx2(Text, { style: s.headerText, children: t("statistics.weeklyAttendance.percentage", "Porcentaje") }) }),
          /* @__PURE__ */ jsx2(View, { style: [s.headerCell, { width: "36%", alignItems: "flex-start", paddingLeft: 8 }], children: /* @__PURE__ */ jsx2(Text, { style: [s.headerText, { textAlign: "left" }], children: t("statistics.weeklyAttendance.missedDays", "Ausencias") }) })
        ] }),
        sortedPlayers.map((pa, idx) => {
          const pctColor = pa.percentage >= 80 ? "#166534" : pa.percentage >= 60 ? "#b45309" : "#991b1b";
          const badgeStyle = pa.missedDates.length > 0 ? { color: COLORS.danger, backgroundColor: "#fee2e2", borderColor: "#fecaca" } : { color: COLORS.success, backgroundColor: "#dcfce7", borderColor: "#bbf7d0" };
          return /* @__PURE__ */ jsxs2(View, { style: s.row, wrap: false, children: [
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "34%", alignItems: "flex-start", paddingLeft: 8 }], children: /* @__PURE__ */ jsx2(Text, { style: [s.cellBold, { textAlign: "left", fontSize: FONT_SIZE.sm }], children: pa.playerName }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "14%" }], children: /* @__PURE__ */ jsxs2(Text, { style: s.cellText, children: [
              pa.attended,
              "/",
              week.totalSessions
            ] }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "16%" }], children: /* @__PURE__ */ jsxs2(Text, { style: [s.cellBold, { color: pctColor, fontSize: FONT_SIZE.sm }], children: [
              pa.percentage,
              "%"
            ] }) }),
            /* @__PURE__ */ jsx2(View, { style: [s.cell, { width: "36%", alignItems: "flex-start", paddingLeft: 8 }], children: /* @__PURE__ */ jsx2(Text, { style: [s.badge, badgeStyle, { borderWidth: 1, textTransform: "none", alignSelf: "flex-start", lineHeight: 1.25 }], children: pa.missedDates.length > 0 ? pa.missedDates.join(", ") : noAbsences }) })
          ] }, idx);
        })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx2(PdfFooter, { text: "Xtramys Performance" })
  ] });
};
async function generateWeeklyAttendancePdf(week, teamName, weekLabel, t) {
  const title = t("statistics.weeklyAttendance.pdfTitle") || "Asistencia Semanal";
  const prefix = t("statistics.weeklyAttendance.pdfPrefix", "Asistencia_Semanal");
  const fileName = `${prefix}_${week.weekStart}`;
  await renderPdf(
    /* @__PURE__ */ jsx2(Document, { children: /* @__PURE__ */ jsx2(
      WeeklyAttendancePage,
      {
        week,
        teamName,
        weekLabel,
        t,
        title
      }
    ) }),
    fileName
  );
}
export {
  generateCombinedStatsPdf,
  generateInjuriesStatsPdf,
  generatePlayersStatsPdf,
  generateTeamStatsPdf,
  generateWeeklyAttendancePdf
};
