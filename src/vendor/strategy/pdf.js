// src/vendor/strategy/pdf.js
import React from 'react';
import {
  Document, Page, Text, View, Image, StyleSheet,
  baseStyles, COLORS, SPACING, FONT_SIZE, PdfHeader, PdfFooter, renderPdf
} from '@/utils/pdfDesign';
import { getContentImage } from '@/utils/contentVisual';
import { applySetPiecePlayerOverlays } from '@/utils/kits';
import { loadVideoPlayerPhotos } from '@/utils/videoPlayerPhotos';
import { renderFrameToCanvas } from '@/utils/videoCanvasRenderer';
import { renderVideoFieldImage } from '@/utils/videoFieldImage';
import { normalizeElementsForCanvas } from '@/vendor/tacticalBoard/field/primitives';
import { decomposeFieldId, getAspectForView } from '@/vendor/tacticalBoard/fields';

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
  fullPageDiagramWrap: {
    flex: 1,
    minHeight: 0,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPageDiagram: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  setPieceTitleBar: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  setPieceTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
  },
  setPieceDescription: {
    marginTop: 2,
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  noImageText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    fontFamily: 'Helvetica-Oblique',
  },
});

const StrategyDocument = ({ strategy, folderName, imageBase64, t }) => {
  const fullPage = strategy.kind === 'setPiece';
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={baseStyles.pageLandscape}>
        {fullPage ? (
          <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }} wrap={false}>
            <View style={s.setPieceTitleBar}>
              <Text style={s.setPieceTitle}>{strategy.nombre || t('setPieces.title') || 'ABP'}</Text>
              {strategy.descripcion ? (
                <Text style={s.setPieceDescription}>{strategy.descripcion}</Text>
              ) : null}
            </View>
            <View style={s.fullPageDiagramWrap}>
              {imageBase64 ? (
                <Image src={imageBase64} style={s.fullPageDiagram} />
              ) : (
                <Text style={s.noImageText}>{t('strategy.noImage') || 'Sin Diagrama'}</Text>
              )}
            </View>
          </View>
        ) : (
          <>
            <PdfHeader
              title={strategy.nombre || t('strategy.strategy') || 'ESTRATEGIA'}
              subtitle={folderName ? `${t('folders.folder') || 'Carpeta'}: ${folderName}` : ''}
            />

            <View style={s.mainContainer}>
              <View style={s.leftColumn}>
                {imageBase64 ? (
                  <Image src={imageBase64} style={s.diagram} />
                ) : (
                  <Text style={s.noImageText}>{t('strategy.noImage') || 'Sin Diagrama'}</Text>
                )}
              </View>

              <View style={s.rightColumn}>
                {folderName ? (
                  <View style={s.infoCard}>
                    <Text style={s.infoCardTitle}>{t('folders.folder') || 'Carpeta'}</Text>
                    <View style={{ marginTop: 4 }}>
                      <Text style={s.badge}>{folderName}</Text>
                    </View>
                  </View>
                ) : null}

                {strategy.descripcion ? (
                  <View style={s.infoCard}>
                    <Text style={s.infoCardTitle}>{t('strategy.description') || 'Descripcion'}</Text>
                    <Text style={s.infoCardContent}>{strategy.descripcion}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <PdfFooter text="Xtramys Performance" />
          </>
        )}
      </Page>
    </Document>
  );
};

const SetPiecesDocument = ({ setPieces, t }) => (
  <Document>
    {setPieces.map((setPiece, index) => (
      <Page key={`${setPiece.nombre || 'abp'}-${index}`} size="A4" orientation="landscape" style={baseStyles.pageLandscape}>
        <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }} wrap={false}>
          <View style={s.setPieceTitleBar}>
            <Text style={s.setPieceTitle}>{setPiece.nombre || t('setPieces.title') || 'ABP'}</Text>
            {setPiece.descripcion ? <Text style={s.setPieceDescription}>{setPiece.descripcion}</Text> : null}
          </View>
          <View style={s.fullPageDiagramWrap}>
            {getContentImage(setPiece) ? (
              <Image src={getContentImage(setPiece)} style={s.fullPageDiagram} />
            ) : (
              <Text style={s.noImageText}>{t('strategy.noImage') || 'Sin Diagrama'}</Text>
            )}
          </View>
        </View>
      </Page>
    ))}
  </Document>
);

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

export async function generateSetPiecesPdf(setPieces, t, fileName = 'ABP') {
  const renderedSetPieces = await Promise.all(setPieces.map(async (setPiece) => {
    const overlays = Array.isArray(setPiece.pdfPlayerOverlays) ? setPiece.pdfPlayerOverlays : [];
    const source = setPiece.customElements?.length ? setPiece.customElements : (setPiece.elementosCampo || []);
    if (!overlays.length || !source.length || typeof document === 'undefined') return setPiece;

    const fieldType = setPiece.customFieldType || setPiece.tipoCampo || 'full';
    const { viewMode } = decomposeFieldId(fieldType);
    const aspect = getAspectForView(viewMode);
    const width = 1600;
    const height = Math.round(width * aspect);
    const merged = applySetPiecePlayerOverlays(source, overlays).map((element) => ({
      ...element,
      xRatio: element.xRatio ?? (Number(element.x) / 1280),
      yRatio: element.yRatio ?? (Number(element.y) / (1280 * aspect)),
      pdfNameLabel: element.type === 'player' && Boolean(element.playerData),
    }));
    const elements = normalizeElementsForCanvas(merged);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return setPiece;

    try {
      const fieldImage = await renderVideoFieldImage(fieldType, width, height);
      const loadedPhotos = await loadVideoPlayerPhotos([{ elements }]);
      try {
        renderFrameToCanvas(context, width, height, elements, setPiece.pizarraConfig?.connectors || [], fieldImage, {
          playersWithNumber: setPiece.pizarraConfig?.playersWithNumber ?? true,
          showPhotos: setPiece.pizarraConfig?.showPhotos === true,
          playerPhotos: loadedPhotos.playerPhotos,
          viewMode,
        });
        return { ...setPiece, imagen: canvas.toDataURL('image/png'), pdfPlayerOverlays: [] };
      } finally {
        loadedPhotos.release();
      }
    } catch (error) {
      console.warn('[ABP PDF] No se pudo generar la imagen integrada:', error);
      return setPiece;
    }
  }));
  await renderPdf(<SetPiecesDocument setPieces={renderedSetPieces} t={t} />, fileName.replace(/[/\?%*:|"<>]/g, '-'));
}
