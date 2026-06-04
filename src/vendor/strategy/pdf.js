// src/vendor/strategy/pdf.js
import React from 'react';
import {
  Document, Page, Text, View, Image, StyleSheet,
  baseStyles, COLORS, SPACING, FONT_SIZE, PdfHeader, PdfFooter, renderPdf
} from '@/utils/pdfDesign';

const s = StyleSheet.create({
  mainContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    flex: 1,
    marginBottom: 10,
  },
  leftColumn: {
    flex: 2,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  rightColumn: {
    flex: 1,
    flexDirection: 'column',
    gap: SPACING.sm,
    maxWidth: 240,
    height: '100%',
  },
  infoCard: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: SPACING.base,
  },
  infoCardTitle: {
    fontSize: FONT_SIZE.xs,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoCardContent: {
    fontSize: FONT_SIZE.base,
    color: COLORS.text,
    lineHeight: 1.4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    color: '#f57c00',
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  diagram: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  noImageText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    fontFamily: 'Helvetica-Oblique',
  },
});

const StrategyDocument = ({ strategy, folderName, imageBase64, t }) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={baseStyles.pageLandscape}>
        <PdfHeader
          title={strategy.nombre || t('strategy.strategy') || 'ESTRATEGIA'}
          subtitle={folderName ? `${t('folders.folder') || 'Carpeta'}: ${folderName}` : ''}
        />

        <View style={s.mainContainer}>
          {/* Left Side: Large Diagram */}
          <View style={s.leftColumn}>
            {imageBase64 ? (
              <Image src={imageBase64} style={s.diagram} />
            ) : (
              <Text style={s.noImageText}>{t('strategy.noImage') || 'Sin Diagrama'}</Text>
            )}
          </View>

          {/* Right Side: Metadata Panel */}
          <View style={s.rightColumn}>
            {folderName ? (
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>📁 {t('folders.folder') || 'Carpeta'}</Text>
                <View style={{ marginTop: 4 }}>
                  <Text style={s.badge}>{folderName}</Text>
                </View>
              </View>
            ) : null}

            {strategy.descripcion ? (
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>📝 {t('strategy.description') || 'Descripción'}</Text>
                <Text style={s.infoCardContent}>{strategy.descripcion}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <PdfFooter text="Xtramys Performance" />
      </Page>
    </Document>
  );
};

export async function generateStrategyPdf(strategy, folderName, imageBase64, t) {
  const fileName = `${(strategy.nombre || 'Estrategia').replace(/[/\?%*:|"<>]/g, '-')}`;
  await renderPdf(
    <StrategyDocument
      strategy={strategy}
      folderName={folderName}
      imageBase64={imageBase64}
      t={t}
    />,
    fileName
  );
}
