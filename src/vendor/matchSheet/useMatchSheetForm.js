// components/pages/matchSheet/useMatchSheetForm.js
// Hook reutilizable para el formulario de creación/edición de fichas de partido
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { showMissingFieldsToast } from '@/utils/validationToast';

// Alineaciones de fútbol 11 (incluyen portero con prefijo 1-)
export const ALINEACIONES = [
  '1-4-4-2',
  '1-4-3-3',
  '1-4-2-3-1',
  '1-3-5-2',
  '1-3-4-3',
  '1-4-5-1',
  '1-5-3-2',
  '1-5-4-1',
  '1-4-1-4-1',
  '1-3-4-1-2',
  '1-4-3-2-1',
  '1-4-1-2-1-2',
];

// Alineaciones de fútbol 8 (incluyen portero con prefijo 1-)
export const ALINEACIONES_8 = [
  '1-3-3-1',
  '1-2-3-2',
  '1-3-2-2',
  '1-2-4-1',
  '1-3-1-3',
  '1-4-2-1',
];

// Alineaciones de fútbol 7 (incluyen portero con prefijo 1-)
export const ALINEACIONES_7 = [
  '1-3-2-1',
  '1-2-3-1',
  '1-2-2-2',
  '1-3-1-2',
  '1-1-3-2',
  '1-2-1-3',
];

// Mapa de alineaciones por cantidad de jugadores
export const ALINEACIONES_BY_PLAYER_COUNT = {
  7: ALINEACIONES_7,
  8: ALINEACIONES_8,
  11: ALINEACIONES,
};

// Claves de ubicación
export const UBICACIONES_KEYS = ['home', 'away', 'neutral'];

// Normalizar formación
export function normalizeFormation(value) {
  if (!value) return '';
  const v = String(value).trim();
  if (v.startsWith('1-')) return v;
  if (/^\d+-/.test(v)) return `1-${v}`;
  return v;
}

/**
 * Hook para manejar el estado y la lógica del formulario de fichas de partido
 * Reutilizable en matchSheetList, AddEventModal y EditMatchSheetModal
 */
export default function useMatchSheetForm({ 
  initialMatchSheet = null, 
  selectedTeam,
  players = [],
  onSave,
  onCancel,
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language?.split('-')[0] || 'es';
  
  // Ubicaciones traducidas dinámicamente
  const ubicaciones = useMemo(() => 
    UBICACIONES_KEYS.map(key => t(`matchSheet.fields.${key}`))
  , [t]);
  
  // Opciones de jornada (1-100)
  const jornadaOptions = useMemo(() => 
    Array.from({ length: 100 }, (_, i) => String(i + 1))
  , []);

  // Estado para competición/torneo
  const [competicion, setCompeticion] = useState('liga');
  const [torneoId, setTorneoId] = useState(null);
  const [showCompeticionModal, setShowCompeticionModal] = useState(false);
  const [showTorneoModal, setShowTorneoModal] = useState(false);

  // Estados para datos básicos del partido
  const [rival, setRival] = useState('');
  const [rivalId, setRivalId] = useState(null);
  const [rivalEscudo, setRivalEscudo] = useState(null);
  const [ubicacion, setUbicacion] = useState('');
  const [jornada, setJornada] = useState('');
  const [golesFavor, setGolesFavor] = useState('0');
  const [golesContra, setGolesContra] = useState('0');
  const [alineacion, setAlineacion] = useState('');
  const [alineacionRival, setAlineacionRival] = useState('');
  const [notasEntrenador, setNotasEntrenador] = useState('');
  const [fechaHora, setFechaHora] = useState(new Date());
  
  // Estados para jugadores seleccionados
  const [convocados, setConvocados] = useState([]);
  const [noConvocados, setNoConvocados] = useState([]);
  const [alineacionTitulares, setAlineacionTitulares] = useState([]);
  const [alineacionSuplentes, setAlineacionSuplentes] = useState([]);
  
  // Estados para goles, tarjetas y cambios
  const [goles, setGoles] = useState([]);
  const [tarjetasAmarillas, setTarjetasAmarillas] = useState([]);
  const [tarjetasRojas, setTarjetasRojas] = useState([]);
  const [cambios, setCambios] = useState([]);
  const [golesRival, setGolesRival] = useState([]);
  
  // Estados para tracking de jugadores en campo y expulsados
  const [jugadoresEnCampo, setJugadoresEnCampo] = useState([]);
  const [jugadoresExpulsados, setJugadoresExpulsados] = useState([]);
  
  // Estados para estadísticas
  const [posesion, setPosesion] = useState('');
  const [tiros, setTiros] = useState('');
  const [tirosAPuerta, setTirosAPuerta] = useState('');
  const [corners, setCorners] = useState('');
  const [faltas, setFaltas] = useState('');
  const [fueras, setFueras] = useState('');
  
  // Estados para tiempo de descuento
  const [descuentoPrimerTiempo, setDescuentoPrimerTiempo] = useState('0');
  const [descuentoSegundoTiempo, setDescuentoSegundoTiempo] = useState('0');
  
  // Estado para mostrar alineación visual en el formulario
  const [showVisualLineup, setShowVisualLineup] = useState(false);
  const [lineupPositions, setLineupPositions] = useState([]);

  // Estados para modales de selección
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [showJornadaModal, setShowJornadaModal] = useState(false);
  const [showAlineacionModal, setShowAlineacionModal] = useState(false);
  const [showAlineacionRivalModal, setShowAlineacionRivalModal] = useState(false);
  const [showConvocadosModal, setShowConvocadosModal] = useState(false);
  const [showTitularesModal, setShowTitularesModal] = useState(false);
  const [showSuplentesModal, setShowSuplentesModal] = useState(false);
  const [showNoConvocadosModal, setShowNoConvocadosModal] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  
  // Estados para modales de eventos
  const [showGolesModal, setShowGolesModal] = useState(false);
  const [showTarjetasModal, setShowTarjetasModal] = useState(false);
  const [showCambiosModal, setShowCambiosModal] = useState(false);

  // Verificar si la fecha del partido es pasada
  const isMatchPast = useMemo(() => {
    if (!fechaHora) return false;
    const matchDate = new Date(fechaHora);
    const now = new Date();
    return matchDate < now;
  }, [fechaHora]);

  // Calcular resultado automáticamente (valores internos en español para BD)
  const resultado = useMemo(() => {
    const gf = parseInt(golesFavor) || 0;
    const gc = parseInt(golesContra) || 0;
    
    // Solo calcular si el partido ya pasó
    if (!isMatchPast) return '';
    
    // Si no hay goles definidos, no mostrar resultado
    if (golesFavor === '' && golesContra === '') return '';
    
    if (gf > gc) return 'Victoria';
    if (gf < gc) return 'Derrota';
    return 'Empate';
  }, [golesFavor, golesContra, isMatchPast]);

  // Cargar datos de una ficha existente
  const loadMatchSheet = useCallback((matchSheet) => {
    if (!matchSheet) return;
    
    const isPast = matchSheet.fechaHora ? new Date(matchSheet.fechaHora) < new Date() : false;
    
    setRival(matchSheet.rival || '');
    setRivalId(matchSheet.rivalId || null);
    setRivalEscudo(matchSheet.rivalEscudo || null);
    setUbicacion(matchSheet.ubicacion || '');
    setJornada(matchSheet.jornada ? String(matchSheet.jornada) : '');
    setGolesFavor(matchSheet.golesFavor != null ? String(matchSheet.golesFavor) : (isPast ? '0' : ''));
    setGolesContra(matchSheet.golesContra != null ? String(matchSheet.golesContra) : (isPast ? '0' : ''));
    setAlineacion(normalizeFormation(matchSheet.alineacion));
    setAlineacionRival(normalizeFormation(matchSheet.alineacionRival));
    setNotasEntrenador(matchSheet.notasEntrenador || '');
    setFechaHora(matchSheet.fechaHora ? new Date(matchSheet.fechaHora) : new Date());
    
    // Cargar jugadores
    const extractIds = (arr) => (arr || []).map(p => typeof p === 'object' ? p._id : p);
    setConvocados(extractIds(matchSheet.convocados));
    setNoConvocados(extractIds(matchSheet.noConvocados));
    setAlineacionTitulares(extractIds(matchSheet.alineacionTitulares));
    setAlineacionSuplentes(extractIds(matchSheet.alineacionSuplentes));
    
    // Cargar eventos
    setGoles(matchSheet.goles || []);
    setTarjetasAmarillas(matchSheet.tarjetasAmarillas || []);
    setTarjetasRojas(matchSheet.tarjetasRojas || []);
    setCambios(matchSheet.cambios || []);
    setGolesRival(matchSheet.golesRival || []);
    
    // Reconstruir jugadores en campo desde titulares y cambios
    // (el useEffect abajo se encargará de esto automáticamente)
    
    // Cargar estadísticas
    setPosesion(matchSheet.posesion ? String(matchSheet.posesion) : '');
    setTiros(matchSheet.tiros ? String(matchSheet.tiros) : '');
    setTirosAPuerta(matchSheet.tirosAPuerta ? String(matchSheet.tirosAPuerta) : '');
    setCorners(matchSheet.corners ? String(matchSheet.corners) : '');
    setFaltas(matchSheet.faltas ? String(matchSheet.faltas) : '');
    setFueras(matchSheet.fueras ? String(matchSheet.fueras) : '');
    
    // Tiempo de descuento
    setDescuentoPrimerTiempo(matchSheet.descuentoPrimerTiempo ? String(matchSheet.descuentoPrimerTiempo) : '0');
    setDescuentoSegundoTiempo(matchSheet.descuentoSegundoTiempo ? String(matchSheet.descuentoSegundoTiempo) : '0');
    
    // Competición/torneo
    setCompeticion(matchSheet.competicion || 'liga');
    setTorneoId(matchSheet.torneoId?._id || matchSheet.torneoId || null);
  }, []);

  // Resetear el formulario
  const resetForm = useCallback(() => {
    setRival('');
    setRivalId(null);
    setRivalEscudo(null);
    setUbicacion('');
    setJornada('');
    setGolesFavor('0');
    setGolesContra('0');
    setAlineacion('');
    setAlineacionRival('');
    setNotasEntrenador('');
    setFechaHora(new Date());
    setConvocados([]);
    setNoConvocados([]);
    setAlineacionTitulares([]);
    setAlineacionSuplentes([]);
    setGoles([]);
    setTarjetasAmarillas([]);
    setTarjetasRojas([]);
    setCambios([]);
    setGolesRival([]);
    setJugadoresEnCampo([]);
    setJugadoresExpulsados([]);
    setPosesion('');
    setTiros('');
    setTirosAPuerta('');
    setCorners('');
    setFaltas('');
    setFueras('');
    setDescuentoPrimerTiempo('0');
    setDescuentoSegundoTiempo('0');
    setShowVisualLineup(false);
    setLineupPositions([]);
    setCompeticion('liga');
    setTorneoId(null);
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (initialMatchSheet) {
      loadMatchSheet(initialMatchSheet);
    } else {
      resetForm();
    }
  }, [initialMatchSheet, loadMatchSheet, resetForm]);

  // Recalcular jugadores en campo siempre que cambien titulares, cambios o tarjetas rojas
  useEffect(() => {
    let enCampo = [...alineacionTitulares];
    (cambios || []).forEach(cambio => {
      const saleId = typeof cambio.sale === 'object' ? cambio.sale._id : cambio.sale;
      const entraId = typeof cambio.entra === 'object' ? cambio.entra._id : cambio.entra;
      enCampo = enCampo.filter(id => id !== saleId);
      if (entraId) enCampo.push(entraId);
    });
    setJugadoresEnCampo(enCampo);
    // Recalcular expulsados
    const rojasIds = (tarjetasRojas || []).map(t => typeof t.jugador === 'object' ? t.jugador._id : t.jugador).filter(Boolean);
    setJugadoresExpulsados(rojasIds);
  }, [alineacionTitulares, cambios, tarjetasRojas]);

  // Obtener jugadores disponibles para selección
  const getAvailablePlayers = useCallback((excludeLists = [], onlyInclude = null) => {
    const excludeIds = excludeLists.flat();
    let available = players;
    
    if (onlyInclude) {
      available = players.filter(p => onlyInclude.includes(p._id));
    }
    
    return available.filter(p => !excludeIds.includes(p._id));
  }, [players]);

  // Construir datos de la ficha para guardar
  const buildMatchSheetData = useCallback(() => {
    return {
      rival,
      rivalId,
      rivalEscudo,
      ubicacion,
      jornada: jornada ? Number(jornada) : null,
      golesFavor: isMatchPast ? Number(golesFavor || 0) : (golesFavor !== '' ? Number(golesFavor) : null),
      golesContra: isMatchPast ? Number(golesContra || 0) : (golesContra !== '' ? Number(golesContra) : null),
      alineacion: normalizeFormation(alineacion),
      alineacionRival: normalizeFormation(alineacionRival),
      notasEntrenador,
      fechaHora: fechaHora.toISOString(),
      resultado: isMatchPast ? resultado : '',
      convocados,
      noConvocados,
      alineacionTitulares,
      alineacionSuplentes,
      goles: goles.map(g => ({
        jugador: typeof g.jugador === 'object' ? g.jugador._id : g.jugador,
        asistente: g.asistente ? (typeof g.asistente === 'object' ? g.asistente._id : g.asistente) : undefined,
        minuto: g.minuto,
        tipo: g.tipo,
      })),
      tarjetasAmarillas: tarjetasAmarillas.map(t => ({
        jugador: typeof t.jugador === 'object' ? t.jugador._id : t.jugador,
        minuto: t.minuto,
        motivo: t.motivo,
      })),
      tarjetasRojas: tarjetasRojas.map(t => ({
        jugador: typeof t.jugador === 'object' ? t.jugador._id : t.jugador,
        minuto: t.minuto,
        motivo: t.motivo,
        partidosSancion: (t.motivo === 'Doble amarilla') ? (t.partidosSancion || 1) : Math.max(1, t.partidosSancion || 1),
      })),
      cambios: cambios.map(c => ({
        minuto: c.minuto,
        sale: typeof c.sale === 'object' ? c.sale._id : c.sale,
        entra: typeof c.entra === 'object' ? c.entra._id : c.entra,
      })),
      golesRival,
      posesion: posesion ? Number(posesion) : null,
      tiros: tiros ? Number(tiros) : null,
      tirosAPuerta: tirosAPuerta ? Number(tirosAPuerta) : null,
      corners: corners ? Number(corners) : null,
      faltas: faltas ? Number(faltas) : null,
      fueras: fueras ? Number(fueras) : null,
      descuentoPrimerTiempo: descuentoPrimerTiempo ? Number(descuentoPrimerTiempo) : 0,
      descuentoSegundoTiempo: descuentoSegundoTiempo ? Number(descuentoSegundoTiempo) : 0,
      competicion,
      ...(competicion === 'torneo' && torneoId ? { torneoId } : {}),
    };
  }, [
    rival, rivalId, rivalEscudo, ubicacion, jornada, competicion, torneoId,
    golesFavor, golesContra, alineacion, alineacionRival,
    notasEntrenador, fechaHora, resultado, isMatchPast,
    convocados, noConvocados, alineacionTitulares, alineacionSuplentes,
    goles, tarjetasAmarillas, tarjetasRojas, cambios, golesRival,
    posesion, tiros, tirosAPuerta, corners, faltas, fueras,
    descuentoPrimerTiempo, descuentoSegundoTiempo
  ]);

  // Validar formulario
  const validateForm = useCallback(() => {
    if (!rival.trim()) {
      showMissingFieldsToast(t, [t('matchSheet.rival', 'Rival')]);
      return false;
    }
    return true;
  }, [rival, t]);

  // Manejador de guardar
  const handleSave = useCallback(async () => {
    if (!validateForm()) return;
    
    const data = buildMatchSheetData();
    if (onSave) {
      await onSave(data);
    }
  }, [validateForm, buildMatchSheetData, onSave]);

  // Manejador de cancelar
  const handleCancel = useCallback(() => {
    resetForm();
    if (onCancel) {
      onCancel();
    }
  }, [resetForm, onCancel]);

  // Helpers para incrementar/decrementar goles
  const incrementGolesFavor = useCallback(() => {
    setGolesFavor(prev => String(Math.min(99, Number(prev || 0) + 1)));
  }, []);

  const decrementGolesFavor = useCallback(() => {
    setGolesFavor(prev => String(Math.max(0, Number(prev || 0) - 1)));
  }, []);

  const incrementGolesContra = useCallback(() => {
    setGolesContra(prev => String(Math.min(99, Number(prev || 0) + 1)));
  }, []);

  const decrementGolesContra = useCallback(() => {
    setGolesContra(prev => String(Math.max(0, Number(prev || 0) - 1)));
  }, []);

  // Seleccionar rival
  const selectRival = useCallback((id, nombre, escudo) => {
    setRivalId(id);
    setRival(nombre);
    setRivalEscudo(escudo);
  }, []);

  return {
    // Constantes
    alineaciones: ALINEACIONES_BY_PLAYER_COUNT[selectedTeam?.jugadoresPorEquipo] || ALINEACIONES,
    jugadoresPorEquipo: selectedTeam?.jugadoresPorEquipo || 11,
    ubicaciones,
    jornadaOptions,
    currentLang,
    
    // Competición/torneo
    competicion,
    setCompeticion,
    torneoId,
    setTorneoId,
    showCompeticionModal,
    setShowCompeticionModal,
    showTorneoModal,
    setShowTorneoModal,
    
    // Datos básicos
    rival,
    setRival,
    rivalId,
    setRivalId,
    rivalEscudo,
    setRivalEscudo,
    selectRival,
    ubicacion,
    setUbicacion,
    jornada,
    setJornada,
    golesFavor,
    setGolesFavor,
    golesContra,
    setGolesContra,
    alineacion,
    setAlineacion,
    alineacionRival,
    setAlineacionRival,
    notasEntrenador,
    setNotasEntrenador,
    fechaHora,
    setFechaHora,
    resultado,
    isMatchPast,
    
    // Jugadores
    convocados,
    setConvocados,
    noConvocados,
    setNoConvocados,
    alineacionTitulares,
    setAlineacionTitulares,
    alineacionSuplentes,
    setAlineacionSuplentes,
    jugadoresEnCampo,
    setJugadoresEnCampo,
    jugadoresExpulsados,
    setJugadoresExpulsados,
    getAvailablePlayers,
    
    // Eventos del partido
    goles,
    setGoles,
    tarjetasAmarillas,
    setTarjetasAmarillas,
    tarjetasRojas,
    setTarjetasRojas,
    cambios,
    setCambios,
    golesRival,
    setGolesRival,
    
    // Estadísticas
    posesion,
    setPosesion,
    tiros,
    setTiros,
    tirosAPuerta,
    setTirosAPuerta,
    corners,
    setCorners,
    faltas,
    setFaltas,
    fueras,
    setFueras,
    descuentoPrimerTiempo,
    setDescuentoPrimerTiempo,
    descuentoSegundoTiempo,
    setDescuentoSegundoTiempo,
    
    // Alineación visual
    showVisualLineup,
    setShowVisualLineup,
    lineupPositions,
    setLineupPositions,
    
    // Estados de modales
    showUbicacionModal,
    setShowUbicacionModal,
    showJornadaModal,
    setShowJornadaModal,
    showAlineacionModal,
    setShowAlineacionModal,
    showAlineacionRivalModal,
    setShowAlineacionRivalModal,
    showConvocadosModal,
    setShowConvocadosModal,
    showTitularesModal,
    setShowTitularesModal,
    showSuplentesModal,
    setShowSuplentesModal,
    showNoConvocadosModal,
    setShowNoConvocadosModal,
    showDateTimePicker,
    setShowDateTimePicker,
    showGolesModal,
    setShowGolesModal,
    showTarjetasModal,
    setShowTarjetasModal,
    showCambiosModal,
    setShowCambiosModal,
    
    // Helpers de goles
    incrementGolesFavor,
    decrementGolesFavor,
    incrementGolesContra,
    decrementGolesContra,
    
    // Métodos
    loadMatchSheet,
    resetForm,
    buildMatchSheetData,
    validateForm,
    handleSave,
    handleCancel,
  };
}
