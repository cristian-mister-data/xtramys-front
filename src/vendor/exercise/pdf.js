// src/vendor/exercise/pdf.js
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
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.success,
  },
  statLabel: {
    fontSize: 7,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginTop: 2,
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

const ExerciseDocument = ({ exercise, imageBase64, t }) => {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={baseStyles.pageLandscape}>
        <PdfHeader
          title={exercise.nombre || t('exercise.exercise') || 'EJERCICIO'}
          subtitle={exercise.tiempo ? `${exercise.tiempo} min` : ''}
        />

        <View style={s.mainContainer}>
          {/* Left Side: Large Diagram */}
          <View style={s.leftColumn}>
            {imageBase64 ? (
              <Image src={imageBase64} style={s.diagram} />
            ) : (
              <Text style={s.noImageText}>{t('exercise.noImage') || 'Sin Diagrama'}</Text>
            )}
          </View>

          {/* Right Side: Info Panel */}
          <View style={s.rightColumn}>
            {/* Stats Row */}
            {exercise.numeroJugadores || exercise.equipos ? (
              <View style={s.statsRow}>
                {exercise.numeroJugadores ? (
                  <View style={s.statCard}>
                    <Text style={s.statValue}>{exercise.numeroJugadores}</Text>
                    <Text style={s.statLabel}>{t('exercise.players') || 'Jugadores'}</Text>
                  </View>
                ) : null}

                {exercise.equipos ? (
                  <View style={s.statCard}>
                    <Text style={s.statValue}>{exercise.equipos}</Text>
                    <Text style={s.statLabel}>{t('exercise.teams') || 'Equipos'}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {exercise.dimensiones ? (
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>{t('exercise.fieldDimensions') || 'Dimensiones'}</Text>
                <Text style={s.infoCardContent}>{exercise.dimensiones}</Text>
              </View>
            ) : null}

            {exercise.objetivo ? (
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>{t('exercise.objective') || 'Objetivo'}</Text>
                <Text style={s.infoCardContent}>{exercise.objetivo}</Text>
              </View>
            ) : null}

            {exercise.descripcion ? (
              <View style={s.infoCard}>
                <Text style={s.infoCardTitle}>{t('exercise.description') || 'Descripción'}</Text>
                <Text style={s.infoCardContent}>{exercise.descripcion}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <PdfFooter text="Xtramys Performance" />
      </Page>
    </Document>
  );
};

export async function generateExercisePdf(exercise, imageBase64, t) {
  const fileName = `${(exercise.nombre || t('exercise.exercise') || 'Ejercicio').replace(/[/\?%*:|"<>]/g, '-')}`;
  await renderPdf(
    <ExerciseDocument
      exercise={exercise}
      imageBase64={imageBase64}
      t={t}
    />,
    fileName
  );
}
