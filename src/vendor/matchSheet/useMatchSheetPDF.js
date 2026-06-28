// components/pages/matchSheet/useMatchSheetPDF.js
// Hook reutilizable para la generación de PDFs de fichas de partido
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { generateLineupPDF, generateCallUpPDF, generateMatchSheetPDF } from './MatchSheetPDF';

/**
 * Hook para manejar la generación de PDFs de fichas de partido
 * Reutilizable en matchSheetList, MatchSheetDetailModal, calendario, etc.
 */
export default function useMatchSheetPDF({ team, players }) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'es';
  
  // Estado de tipo de PDF en generación: null | 'lineup' | 'callup' | 'matchsheet'
  const [generatingPDFType, setGeneratingPDFType] = useState(null);
  const generatingPDF = generatingPDFType !== null;
  const [showLineupModal, setShowLineupModal] = useState(false);
  const [showConvocatoriaPDFModal, setShowConvocatoriaPDFModal] = useState(false);
  const [selectedMatchSheet, setSelectedMatchSheet] = useState(null);
  
  const [pdfOptions, setPdfOptions] = useState({
    showPhotos: true,
    showNames: true,
  });
  
  const [convocatoriaPDFData, setConvocatoriaPDFData] = useState({
    horaQuedada: '',
    lugarQuedada: '',
    observaciones: '',
    showPhotos: true,
  });

  const getDefaultFormation = useCallback((jugadoresPorEquipo) => {
    if (jugadoresPorEquipo === 7) return '1-3-2-1';
    if (jugadoresPorEquipo === 8) return '1-3-3-1';
    return '1-4-4-2';
  }, []);

  // Traducciones de posiciones
  const getPositionTranslations = useCallback(() => ({
    POR: t('matchSheet.positions.POR'),
    DFC: t('matchSheet.positions.DFC'),
    LI: t('matchSheet.positions.LI'),
    LD: t('matchSheet.positions.LD'),
    CAI: t('matchSheet.positions.CAI'),
    CAD: t('matchSheet.positions.CAD'),
    MC: t('matchSheet.positions.MC'),
    MCO: t('matchSheet.positions.MCO'),
    MCD: t('matchSheet.positions.MCD'),
    MI: t('matchSheet.positions.MI'),
    MD: t('matchSheet.positions.MD'),
    DC: t('matchSheet.positions.DC'),
    EI: t('matchSheet.positions.EI'),
    ED: t('matchSheet.positions.ED'),
    SD: t('matchSheet.positions.SD'),
  }), [t]);

  // Generar PDF de Alineación
  const handleGenerateLineupPDF = useCallback(async (matchSheet, lineup = []) => {
    if (!matchSheet) return;
    
    const titulares = matchSheet.alineacionTitulares?.map(p => typeof p === 'object' ? p._id : p) || [];
    
    if (titulares.length === 0) {
      Alert.alert(t('message.warning'), t('matchSheet.pdf.noStartersWarning'));
      return;
    }
    
    setGeneratingPDFType('lineup');
    try {
      const jugadoresPorEquipo = matchSheet.jugadoresPorEquipo || team?.jugadoresPorEquipo || 11;
      await generateLineupPDF({
        matchSheet,
        team,
        players,
        lineup,
        formation: matchSheet.alineacion || getDefaultFormation(jugadoresPorEquipo),
        showPhotos: pdfOptions.showPhotos,
        showNames: pdfOptions.showNames,
        translations: {
          lang: currentLang,
          noDate: t('matchSheet.fields.noDate'),
          generatedWith: t('matchSheet.pdf.generatedWith'),
          lineupFileName: t('matchSheet.pdf.lineupFileName'),
          shareLineup: t('matchSheet.pdf.shareLineup'),
          team: t('matchSheet.pdf.team'),
          substitutes: t('matchSheet.pdf.substitutes'),
          lineupHeader: t('matchSheet.pdf.lineupHeader'),
          matchdayFileLabel: t('matchSheet.pdf.matchdayFileLabel'),
          positions: getPositionTranslations(),
          // Traducciones para torneo/fase
          roundLabels: {
            final: t('tournaments.roundFinal') || 'Final',
            semifinal: t('tournaments.roundSemifinal') || 'Semifinal',
            cuartos: t('tournaments.roundQuarters') || 'Cuartos de Final',
            octavos: t('tournaments.roundRound16') || 'Octavos de Final',
            dieciseisavos: t('tournaments.roundRound32') || 'Dieciseisavos',
            treintaydosavos: t('tournaments.roundRound64') || 'Treintaidosavos',
          },
          legFirst: t('matchSheet.fields.legFirst') || 'Ida',
          legSecond: t('matchSheet.fields.legSecond') || 'Vuelta',
          group: t('matchSheet.fields.group') || 'Grupo',
        },
      });
      setShowLineupModal(false);
    } catch (error) {
      console.error('Error generating lineup PDF:', error);
      Alert.alert(t('message.error'), t('matchSheet.pdf.lineupError'));
    } finally {
      setGeneratingPDFType(null);
    }
  }, [team, players, pdfOptions, currentLang, t, getPositionTranslations, getDefaultFormation]);

  // Generar PDF de Convocatoria
  const handleGenerateCallUpPDF = useCallback(async (matchSheet) => {
    if (!matchSheet) return;
    
    const matchConvocados = matchSheet.convocados?.map(p => typeof p === 'object' ? p._id : p) || [];
    const matchNoConvocados = matchSheet.noConvocados?.map(p => typeof p === 'object' ? p._id : p) || [];
    
    if (matchConvocados.length === 0 && matchNoConvocados.length === 0) {
      Alert.alert(t('message.warning'), t('matchSheet.pdf.callupWarning'));
      return;
    }
    
    setGeneratingPDFType('callup');
    try {
      await generateCallUpPDF({
        matchSheet,
        team,
        players,
        convocados: matchConvocados,
        noConvocados: matchNoConvocados,
        horaQuedada: convocatoriaPDFData.horaQuedada,
        lugarQuedada: convocatoriaPDFData.lugarQuedada,
        observaciones: convocatoriaPDFData.observaciones,
        showPhotos: convocatoriaPDFData.showPhotos,
        translations: {
          lang: currentLang,
          noDate: t('matchSheet.fields.noDate'),
          generatedWith: t('matchSheet.pdf.generatedWith'),
          callupFileName: t('matchSheet.pdf.callupFileName'),
          shareCallup: t('matchSheet.pdf.shareCallup'),
          callupHeader: t('matchSheet.pdf.callupHeader'),
          team: t('matchSheet.pdf.team'),
          date: t('matchSheet.pdf.date'),
          time: t('matchSheet.pdf.time'),
          meeting: t('matchSheet.pdf.meeting'),
          meetingTime: t('matchSheet.pdf.meetingTime'),
          location: t('matchSheet.pdf.location'),
          called: t('matchSheet.pdf.called'),
          notCalled: t('matchSheet.pdf.notCalled'),
          observations: t('matchSheet.pdf.observations'),
          matchdayFileLabel: t('matchSheet.pdf.matchdayFileLabel'),
        },
      });
      setShowConvocatoriaPDFModal(false);
    } catch (error) {
      console.error('Error generating call-up PDF:', error);
      Alert.alert(t('message.error'), t('matchSheet.pdf.callupError'));
    } finally {
      setGeneratingPDFType(null);
    }
  }, [team, players, convocatoriaPDFData, currentLang, t]);

  // Generar PDF de Ficha de Partido Completa
  const handleGenerateMatchSheetPDF = useCallback(async (matchSheet, lineup = []) => {
    if (!matchSheet) return;
    
    setGeneratingPDFType('matchsheet');
    try {
      await generateMatchSheetPDF({
        matchSheet,
        team,
        players,
        lineup,
        locale: currentLang,
        showPhotos: pdfOptions.showPhotos,
        showNames: pdfOptions.showNames,
        translations: {
          matchSheetTitle: t('matchSheet.pdf.matchSheetHeader'),
          matchSheetFileName: t('matchSheet.pdf.matchSheetFileName'),
          shareMatchSheet: t('matchSheet.pdf.shareMatchSheet'),
          generatedWith: t('matchSheet.pdf.generatedWith'),
          team: t('matchSheet.pdf.team'),
          matchDay: t('matchSheet.pdf.matchDay'),
          matchdayFileLabel: t('matchSheet.pdf.matchdayFileLabel'),
          location: t('matchSheet.pdf.location'),
          lineup: t('matchSheet.lineup.starters'),
          substitutes: t('matchSheet.pdf.substitutes'),
          goals: t('matchSheet.pdf.goals'),
          yellowCards: t('matchSheet.pdf.yellowCards'),
          redCards: t('matchSheet.pdf.redCards'),
          substitutions: t('matchSheet.pdf.substitutions'),
          coachNotes: t('matchSheet.pdf.coachNotes'),
          result: t('matchSheet.pdf.result'),
          rivalFormation: t('matchSheet.pdf.rivalFormation'),
          called: t('matchSheet.pdf.called'),
          local: t('schedule.local'),
          visitor: t('schedule.visitor'),
          neutral: t('schedule.neutral'),
          // Traducciones para resultados de BD
          victoria: t('matchSheet.fields.win'),
          empate: t('matchSheet.fields.draw'),
          derrota: t('matchSheet.fields.loss'),
          // Traducciones para ubicaciones de BD
          casa: t('matchSheet.fields.home'),
          fuera: t('matchSheet.fields.away'),
          // Traducciones para asistencia
          assist: t('matchSheet.pdf.assist') || 'Asist',
          // Traducciones para goles del rival
          rivalGoals: t('matchSheet.pdf.rivalGoals') || 'Goles del Rival',
          rivalGoalMinute: t('matchSheet.pdf.rivalGoalMinute') || 'Min',
          // Traducciones para torneo/fase
          roundLabels: {
            final: t('tournaments.roundFinal') || 'Final',
            semifinal: t('tournaments.roundSemifinal') || 'Semifinal',
            cuartos: t('tournaments.roundQuarters') || 'Cuartos de Final',
            octavos: t('tournaments.roundRound16') || 'Octavos de Final',
            dieciseisavos: t('tournaments.roundRound32') || 'Dieciseisavos',
            treintaydosavos: t('tournaments.roundRound64') || 'Treintaidosavos',
          },
          legFirst: t('matchSheet.fields.legFirst') || 'Ida',
          legSecond: t('matchSheet.fields.legSecond') || 'Vuelta',
          group: t('matchSheet.fields.group') || 'Grupo',
        },
        positionTranslations: getPositionTranslations(),
      });
    } catch (error) {
      console.error('Error generating match sheet PDF:', error);
      Alert.alert(t('message.error'), t('matchSheet.pdf.matchSheetError'));
    } finally {
      setGeneratingPDFType(null);
    }
  }, [team, players, pdfOptions, currentLang, t, getPositionTranslations]);

  // Abrir modal de alineación PDF
  const openLineupPDFModal = useCallback((matchSheet) => {
    setSelectedMatchSheet(matchSheet);
    setPdfOptions({ showPhotos: true, showNames: true });
    setShowLineupModal(true);
  }, []);

  // Abrir modal de convocatoria PDF
  const openConvocatoriaPDFModal = useCallback((matchSheet) => {
    setSelectedMatchSheet(matchSheet);
    setConvocatoriaPDFData({
      horaQuedada: matchSheet?.convocatoriaHoraQuedada || '',
      lugarQuedada: matchSheet?.convocatoriaLugar || '',
      observaciones: matchSheet?.convocatoriaObservaciones || '',
      showPhotos: matchSheet?.convocatoriaMostrarFotos !== false,
    });
    setShowConvocatoriaPDFModal(true);
  }, []);

  // Cerrar modales
  const closeLineupModal = useCallback(() => {
    setShowLineupModal(false);
    setSelectedMatchSheet(null);
  }, []);

  const closeConvocatoriaModal = useCallback(() => {
    setShowConvocatoriaPDFModal(false);
    setSelectedMatchSheet(null);
  }, []);

  return {
    // Estados
    generatingPDF,
    generatingPDFType,
    showLineupModal,
    showConvocatoriaPDFModal,
    selectedMatchSheet,
    pdfOptions,
    convocatoriaPDFData,
    
    // Setters
    setPdfOptions,
    setConvocatoriaPDFData,
    setSelectedMatchSheet,
    
    // Funciones de generación
    handleGenerateLineupPDF,
    handleGenerateCallUpPDF,
    handleGenerateMatchSheetPDF,
    
    // Funciones para abrir/cerrar modales
    openLineupPDFModal,
    openConvocatoriaPDFModal,
    closeLineupModal,
    closeConvocatoriaModal,
  };
}
