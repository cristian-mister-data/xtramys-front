// components/pages/season/SeasonCalendar.js
// Calendario profesional para visualizar fichas de partido y sesiones de entrenamiento
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Image,
  FlatList,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Tema consistente con el resto de la aplicación
const THEME = {
  primary: '#3578e5',
  primaryLight: '#5b93ea',
  primaryDark: '#2856a2',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  inputBg: '#f8fafc',
  gradient: ['#3578e5', '#2856a2'],
};

// Función para detectar si es móvil (más estricto para mejor experiencia)
const isMobileDevice = () => {
  const { width } = Dimensions.get('window');
  return width < 600;
};

// Obtener el lunes de la semana de una fecha
const getMonday = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Obtener los 7 días de la semana a partir del lunes
const getWeekDays = (monday) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
};

// Nombres de los días de la semana - se moverán a traducciones
const WEEKDAYS_SHORT_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEKDAYS_FULL_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Nombres de los meses - se moverán a traducciones
const MONTHS_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

// Helper para obtener días del mes
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper para obtener el día de la semana del primer día del mes (0 = Lunes, 6 = Domingo)
const getFirstDayOfMonth = (year, month) => {
  const day = new Date(year, month, 1).getDay();
  // Convertir de Domingo=0 a Lunes=0
  return day === 0 ? 6 : day - 1;
};

// Helper para formatear fecha como YYYY-MM-DD
const formatDateKey = (year, month, day) => {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

// Helper para comparar fechas (solo día)
const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

// Helper para verificar si una fecha es hoy
const isToday = (year, month, day) => {
  const today = new Date();
  return today.getFullYear() === year &&
         today.getMonth() === month &&
         today.getDate() === day;
};

export default function SeasonCalendar({
  matchSheets = [],
  trainingSessions = [],
  team = null,
  onDayPress,
  onAddEvent,
  onMatchPress,
  onSessionPress,
  loading = false,
}) {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const isMobile = isMobileDevice();
  
  // Estado para vista de semana en móvil
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [selectedMobileDate, setSelectedMobileDate] = useState(new Date());
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Arrays traducidos para meses y días de la semana
  const WEEKDAYS_SHORT = useMemo(() => [
    t('season.weekdaysShort.monday'),
    t('season.weekdaysShort.tuesday'),
    t('season.weekdaysShort.wednesday'),
    t('season.weekdaysShort.thursday'),
    t('season.weekdaysShort.friday'),
    t('season.weekdaysShort.saturday'),
    t('season.weekdaysShort.sunday'),
  ], [t]);
  
  // Días de la semana completos para móvil
  const WEEKDAYS_FULL = useMemo(() => [
    t('season.weekdays.monday'),
    t('season.weekdays.tuesday'),
    t('season.weekdays.wednesday'),
    t('season.weekdays.thursday'),
    t('season.weekdays.friday'),
    t('season.weekdays.saturday'),
    t('season.weekdays.sunday'),
  ], [t]);
  
  const MONTHS = useMemo(() => [
    t('season.months.january'),
    t('season.months.february'),
    t('season.months.march'),
    t('season.months.april'),
    t('season.months.may'),
    t('season.months.june'),
    t('season.months.july'),
    t('season.months.august'),
    t('season.months.september'),
    t('season.months.october'),
    t('season.months.november'),
    t('season.months.december'),
  ], [t]);
  
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Calcular días del mes actual
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  
  // Días del mes anterior para completar la primera semana
  const prevMonthDays = firstDayOfMonth;
  const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);
  
  // Días del mes siguiente para completar la última semana
  const totalCells = Math.ceil((daysInMonth + firstDayOfMonth) / 7) * 7;
  const nextMonthDays = totalCells - daysInMonth - prevMonthDays;
  
  // Crear mapa de eventos por fecha
  const eventsByDate = useMemo(() => {
    const map = {};
    
    // Agregar fichas de partido
    matchSheets.forEach(match => {
      if (match.fechaHora) {
        const date = new Date(match.fechaHora);
        const key = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
        if (!map[key]) {
          map[key] = { matches: [], sessions: [] };
        }
        map[key].matches.push(match);
      }
    });
    
    // Agregar sesiones de entrenamiento
    trainingSessions.forEach(session => {
      if (session.fecha) {
        const date = new Date(session.fecha);
        const key = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
        if (!map[key]) {
          map[key] = { matches: [], sessions: [] };
        }
        map[key].sessions.push(session);
      }
    });
    
    return map;
  }, [matchSheets, trainingSessions]);
  
  // Navegar al mes anterior
  const goToPreviousMonth = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  }, []);
  
  // Navegar al mes siguiente
  const goToNextMonth = useCallback(() => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  }, []);
  
  // Ir al mes actual
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  }, []);
  
  // ============ FUNCIONES PARA VISTA MÓVIL DE SEMANA ============
  
  // Navegar a la semana anterior
  const goToPreviousWeek = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 100,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentWeekStart(prev => {
        const newDate = new Date(prev);
        newDate.setDate(prev.getDate() - 7);
        return newDate;
      });
      slideAnim.setValue(-100);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [slideAnim]);
  
  // Navegar a la semana siguiente
  const goToNextWeek = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentWeekStart(prev => {
        const newDate = new Date(prev);
        newDate.setDate(prev.getDate() + 7);
        return newDate;
      });
      slideAnim.setValue(100);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [slideAnim]);
  
  // Ir a esta semana
  const goToThisWeek = useCallback(() => {
    const today = new Date();
    setCurrentWeekStart(getMonday(today));
    setSelectedMobileDate(today);
  }, []);
  
  // Manejar selección de día en móvil
  const handleMobileDayPress = useCallback((date) => {
    setSelectedMobileDate(date);
    const dateKey = formatDateKey(date.getFullYear(), date.getMonth(), date.getDate());
    const events = eventsByDate[dateKey];
    
    if (onDayPress) {
      onDayPress({
        date,
        dateKey,
        events,
        hasEvents: events && (events.matches.length > 0 || events.sessions.length > 0),
      });
    }
  }, [eventsByDate, onDayPress]);
  
  // Días de la semana actual para móvil
  const currentWeekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);
  
  // Eventos del día seleccionado en móvil
  const selectedMobileDayEvents = useMemo(() => {
    if (!selectedMobileDate) return null;
    const dateKey = formatDateKey(
      selectedMobileDate.getFullYear(),
      selectedMobileDate.getMonth(),
      selectedMobileDate.getDate()
    );
    return eventsByDate[dateKey] || { matches: [], sessions: [] };
  }, [selectedMobileDate, eventsByDate]);
  
  // ============ FIN FUNCIONES MÓVIL ============
  
  // Manejar selección de día
  const handleDayPress = useCallback((day, isCurrentMonth) => {
    if (!isCurrentMonth) return;
    
    const dateKey = formatDateKey(currentYear, currentMonth, day);
    const events = eventsByDate[dateKey];
    
    setSelectedDate({ year: currentYear, month: currentMonth, day });
    
    if (onDayPress) {
      onDayPress({
        date: new Date(currentYear, currentMonth, day),
        dateKey,
        events,
        hasEvents: events && (events.matches.length > 0 || events.sessions.length > 0),
      });
    }
  }, [currentYear, currentMonth, eventsByDate, onDayPress]);
  
  // Helper para verificar si un partido ya se jugó
  const isMatchPlayed = useCallback((match) => {
    // Si no tiene fecha/hora, no está jugado
    if (!match.fechaHora) return false;
    
    const matchDate = new Date(match.fechaHora);
    const now = new Date();
    
    // Se considera jugado si la fecha/hora ya pasó
    return matchDate < now;
  }, []);

  // Helper para obtener el escudo del rival (puede venir de rivalId populado o de rivalEscudo)
  const getRivalEscudo = useCallback((match) => {
    // Primero intenta obtenerlo del rival populado
    if (match.rivalId && match.rivalId.escudo) {
      return match.rivalId.escudo;
    }
    // Si no, del campo rivalEscudo directo
    return match.rivalEscudo || null;
  }, []);

  // Helper para formatear el resultado
  const formatMatchResult = useCallback((match) => {
    if (!isMatchPlayed(match)) return null;
    return `${match.golesFavor || 0} - ${match.golesContra || 0}`;
  }, [isMatchPlayed]);
  
  // Helper para determinar si es partido fuera de casa
  const isAwayMatch = useCallback((match) => {
    return match.ubicacion === 'Fuera' || match.ubicacion === 'visitante';
  }, []);
  
  // Renderizar vista previa de partido
  const renderMatchPreview = (match) => {
    const played = isMatchPlayed(match);
    const result = formatMatchResult(match);
    const rivalEscudo = getRivalEscudo(match);
    const isAway = isAwayMatch(match);
    
    // Determinar el orden de los equipos según la ubicación
    const firstTeamEscudo = isAway ? rivalEscudo : team?.escudo;
    const firstTeamName = isAway ? (match.rival || t('season.rival')) : (team?.nombre || t('season.myTeam'));
    const firstTeamIsHome = !isAway;
    
    const secondTeamEscudo = isAway ? team?.escudo : rivalEscudo;
    const secondTeamName = isAway ? (team?.nombre || t('season.myTeam')) : (match.rival || t('season.rival'));
    const secondTeamIsHome = isAway;
    
    // Formatear resultado según ubicación
    const formattedResult = played 
      ? (isAway 
          ? `${match.golesContra || 0} - ${match.golesFavor || 0}` 
          : `${match.golesFavor || 0} - ${match.golesContra || 0}`)
      : null;
    
    return (
      <TouchableOpacity 
        key={`match-preview-${match._id}`} 
        style={styles.eventPreviewCard}
        onPress={() => onMatchPress && onMatchPress(match)}
        activeOpacity={0.7}
      >
        <View style={styles.matchPreviewHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: (match.torneoId && typeof match.torneoId === 'object' && match.torneoId.color ? match.torneoId.color : THEME.primary) + '20' }]}>
            <Ionicons name="football" size={10} color={match.torneoId && typeof match.torneoId === 'object' && match.torneoId.color ? match.torneoId.color : THEME.primary} />
            <Text style={[styles.eventTypeBadgeText, { color: match.torneoId && typeof match.torneoId === 'object' && match.torneoId.color ? match.torneoId.color : THEME.primary }]} numberOfLines={1}>
              {match.torneoId && typeof match.torneoId === 'object' && match.torneoId.nombre
                ? match.torneoId.nombre
                : match.competicion === 'amistoso' ? t('matchSheet.friendly') : t('season.match')}
            </Text>
          </View>
          {(match.jornada || match.fase === 'eliminatoria' || match.fase === 'grupos') && (
            <Text style={styles.jornadaText}>
              {match.fase === 'eliminatoria' && match.ronda
                ? t(`tournaments.round${({final:'Final',semifinal:'Semifinal',cuartos:'Quarters',octavos:'Round16',dieciseisavos:'Round32',treintaydosavos:'Round64'})[match.ronda] || 'Final'}`)
                : match.fase === 'grupos' && match.grupo
                  ? `G${match.grupo}${match.jornada ? ` J${match.jornada}` : ''}`
                  : `J${match.jornada}`}
            </Text>
          )}
        </View>
        
        <View style={styles.matchTeamsContainer}>
          {/* Primer equipo (local o rival si fuera) */}
          <View style={styles.teamInfoPreview}>
            {firstTeamEscudo ? (
              <Image 
                source={{ uri: firstTeamEscudo }} 
                style={styles.teamBadgePreview} 
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.teamBadgePlaceholder, { backgroundColor: firstTeamIsHome ? THEME.primary + '20' : THEME.danger + '20' }]}>
                <Ionicons name="shield" size={14} color={firstTeamIsHome ? THEME.primary : THEME.danger} />
              </View>
            )}
            <Text style={styles.teamNamePreview} numberOfLines={1}>
              {firstTeamName}
            </Text>
          </View>
          
          {/* Resultado si jugado, o hora/por definir si no */}
          <View style={styles.matchResultContainer}>
            {played ? (
              <Text style={styles.matchResultText}>{formattedResult}</Text>
            ) : (
              <Text style={styles.matchTimePreviewText}>
                {match.fechaHora 
                  ? new Date(match.fechaHora).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  : t('season.toBeDefined')}
              </Text>
            )}
          </View>
          
          {/* Segundo equipo (rival o mi equipo si fuera) */}
          <View style={styles.teamInfoPreview}>
            {secondTeamEscudo ? (
              <Image 
                source={{ uri: secondTeamEscudo }} 
                style={styles.teamBadgePreview} 
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.teamBadgePlaceholder, { backgroundColor: secondTeamIsHome ? THEME.primary + '20' : THEME.danger + '20' }]}>
                <Ionicons name="shield" size={14} color={secondTeamIsHome ? THEME.primary : THEME.danger} />
              </View>
            )}
            <Text style={styles.teamNamePreview} numberOfLines={1}>
              {secondTeamName}
            </Text>
          </View>
        </View>
        
        {/* Ubicación y hora */}
        <View style={styles.matchDetailsRow}>
          {match.ubicacion && (
            <View style={styles.matchDetailItem}>
              <Ionicons 
                name={match.ubicacion === 'Casa' ? 'home' : 'airplane'} 
                size={10} 
                color={THEME.textSecondary} 
              />
              <Text style={styles.matchDetailText}>{match.ubicacion}</Text>
            </View>
          )}
          {!played && (
            <View style={styles.matchDetailItem}>
              <Ionicons name="time" size={10} color={THEME.textSecondary} />
              <Text style={styles.matchDetailText}>
                {match.fechaHora 
                  ? new Date(match.fechaHora).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                  : t('season.toBeDefined')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Renderizar vista previa de sesión de entrenamiento
  const renderSessionPreview = (session) => {
    return (
      <TouchableOpacity 
        key={`session-preview-${session._id}`} 
        style={styles.eventPreviewCard}
        onPress={() => onSessionPress && onSessionPress(session)}
        activeOpacity={0.7}
      >
        <View style={styles.sessionPreviewHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: THEME.success + '20' }]}>
            <Ionicons name="fitness" size={12} color={THEME.success} />
            <Text style={[styles.eventTypeBadgeText, { color: THEME.success }]}>{t('season.training')}</Text>
          </View>
        </View>
        
        <View style={styles.sessionInfoContainer}>
          {/* Equipo */}
          <View style={styles.sessionTeamRow}>
            {team?.escudo ? (
              <Image 
                source={{ uri: team.escudo }} 
                style={styles.sessionTeamBadge} 
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.teamBadgePlaceholder, { backgroundColor: THEME.success + '20' }]}>
                <Ionicons name="shield" size={12} color={THEME.success} />
              </View>
            )}
            <Text style={styles.sessionTeamName} numberOfLines={1}>
              {team?.nombre || 'Mi Equipo'}
            </Text>
          </View>
          
          {/* Detalles */}
          <View style={styles.sessionDetailsRow}>
            {session.lugar && (
              <View style={styles.sessionDetailItem}>
                <Ionicons name="location" size={12} color={THEME.textSecondary} />
                <Text style={styles.sessionDetailText} numberOfLines={1}>{session.lugar}</Text>
              </View>
            )}
            {/* Mostrar hora de inicio y fin si están disponibles */}
            {(session.horaInicio || session.horaFin) ? (
              <View style={styles.sessionDetailItem}>
                <Ionicons name="time" size={12} color={THEME.success} />
                <Text style={[styles.sessionDetailText, styles.sessionTimeText]}>
                  {session.horaInicio || '--:--'} - {session.horaFin || '--:--'}
                </Text>
              </View>
            ) : session.fechaHora && (
              <View style={styles.sessionDetailItem}>
                <Ionicons name="time" size={12} color={THEME.textSecondary} />
                <Text style={styles.sessionDetailText}>
                  {new Date(session.fechaHora).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
            {session.duracion && (
              <View style={styles.sessionDetailItem}>
                <Ionicons name="timer" size={12} color={THEME.textSecondary} />
                <Text style={styles.sessionDetailText}>{session.duracion} min</Text>
              </View>
            )}
          </View>
          
          {/* Ejercicios */}
          {session.ejercicios && session.ejercicios.length > 0 && (
            <View style={styles.sessionExercisesCount}>
              <Ionicons name="barbell" size={10} color={THEME.success} />
              <Text style={styles.sessionExercisesText}>
                {t('season.exerciseCount', { count: session.ejercicios.length })}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  // Renderizar celda del día
  const renderDayCell = (day, isCurrentMonth, index) => {
    const dateKey = isCurrentMonth 
      ? formatDateKey(currentYear, currentMonth, day)
      : null;
    
    const events = dateKey ? eventsByDate[dateKey] : null;
    const hasMatches = events?.matches?.length > 0;
    const hasSessions = events?.sessions?.length > 0;
    const hasEvents = hasMatches || hasSessions;
    
    const isTodayDate = isCurrentMonth && isToday(currentYear, currentMonth, day);
    const isSelected = isCurrentMonth && selectedDate && 
                       selectedDate.year === currentYear && 
                       selectedDate.month === currentMonth && 
                       selectedDate.day === day;
    
    // Handler para añadir evento en este día específico
    const handleAddEventOnDay = (e) => {
      e.stopPropagation();
      if (onAddEvent && isCurrentMonth) {
        const dateToAdd = new Date(currentYear, currentMonth, day);
        onAddEvent(dateToAdd);
      }
    };
    
    // Renderizar mini-tarjeta de partido en la celda
    const renderMiniMatchCard = (match) => {
      const played = isMatchPlayed(match);
      const matchTime = match.fechaHora 
        ? new Date(match.fechaHora).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : null;
      const rivalEscudo = getRivalEscudo(match);
      
      return (
        <View key={`mini-match-${match._id}`} style={styles.miniEventCard}>
          <View style={styles.miniMatchRow}>
            {/* Escudo mi equipo */}
            {team?.escudo ? (
              <Image source={{ uri: team.escudo }} style={styles.miniBadge} resizeMode="contain" />
            ) : (
              <View style={[styles.miniBadgePlaceholder, { backgroundColor: THEME.primary + '30' }]}>
                <Ionicons name="shield" size={8} color={THEME.primary} />
              </View>
            )}
            
            {/* Resultado si ya jugado, o Hora/Por definir si no */}
            {played ? (
              <Text style={styles.miniResultText}>{match.golesFavor || 0}-{match.golesContra || 0}</Text>
            ) : (
              <Text style={styles.miniTimeText}>{matchTime || t('season.toBeDefined')}</Text>
            )}
            
            {/* Escudo rival */}
            {rivalEscudo ? (
              <Image 
                source={{ uri: rivalEscudo }} 
                style={styles.miniBadge} 
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.miniBadgePlaceholder, { backgroundColor: THEME.danger + '30' }]}>
                <Ionicons name="shield" size={8} color={THEME.danger} />
              </View>
            )}
          </View>
        </View>
      );
    };
    
    // Renderizar mini-tarjeta de sesión en la celda
    const renderMiniSessionCard = (session) => {
      return (
        <View key={`mini-session-${session._id}`} style={styles.miniSessionCard}>
          <View style={styles.miniSessionRow}>
            {team?.escudo ? (
              <Image source={{ uri: team.escudo }} style={styles.miniBadgeSmall} resizeMode="contain" />
            ) : (
              <Ionicons name="fitness" size={12} color={THEME.success} />
            )}
            <View style={styles.miniSessionInfo}>
              <Text style={styles.miniSessionText} numberOfLines={1}>
                {session.lugar || t('season.training')}
              </Text>
              {/* Mostrar hora de inicio y fin */}
              {(session.horaInicio || session.horaFin) && (
                <Text style={styles.miniSessionTime} numberOfLines={1}>
                  {session.horaInicio || '--:--'} - {session.horaFin || '--:--'}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    };
    
    // Renderizar tarjeta grande de partido que ocupa todo el día
    const renderFullMatchCard = (match) => {
      const played = isMatchPlayed(match);
      const rivalEscudo = getRivalEscudo(match);
      const teamEscudo = team?.escudo || null;
      const rivalName = match.rival || 'Rival';
      const isAway = isAwayMatch(match);
      
      // Determinar escudos según ubicación
      const firstEscudo = isAway ? rivalEscudo : teamEscudo;
      const secondEscudo = isAway ? teamEscudo : rivalEscudo;
      const firstIsTeam = !isAway;
      
      // Determinar color de fondo según resultado
      let bgColors = [THEME.primary + '15', THEME.primary + '05'];
      if (played) {
        const golesFavor = match.golesFavor || 0;
        const golesContra = match.golesContra || 0;
        if (golesFavor > golesContra) {
          bgColors = ['#10b98120', '#10b98108'];
        } else if (golesFavor < golesContra) {
          bgColors = ['#ef444420', '#ef444408'];
        } else {
          bgColors = ['#f59e0b20', '#f59e0b08'];
        }
      }
      
      // Formatear resultado según ubicación
      const formattedResult = isAway 
        ? `${match.golesContra || 0}-${match.golesFavor || 0}`
        : `${match.golesFavor || 0}-${match.golesContra || 0}`;
      
      return (
        <LinearGradient
          colors={bgColors}
          style={styles.fullMatchCard}
        >
          {/* Fila de escudos: según ubicación */}
          <View style={styles.fullMatchEscudosRow}>
            {/* Primer escudo (mi equipo si local, rival si visitante) */}
            <View style={styles.fullMatchEscudoContainer}>
              {firstEscudo ? (
                <Image 
                  source={{ uri: firstEscudo }} 
                  style={styles.fullMatchEscudo} 
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.fullMatchEscudoPlaceholder}>
                  <Ionicons name="shield" size={14} color={firstIsTeam ? THEME.primary : THEME.textMuted} />
                </View>
              )}
            </View>
            
            {/* Resultado o VS */}
            <View style={styles.fullMatchVsContainer}>
              {played ? (
                <Text style={styles.fullMatchResult}>
                  {formattedResult}
                </Text>
              ) : (
                <Text style={styles.fullMatchVs}>vs</Text>
              )}
            </View>
            
            {/* Segundo escudo (rival si local, mi equipo si visitante) */}
            <View style={styles.fullMatchEscudoContainer}>
              {secondEscudo ? (
                <Image 
                  source={{ uri: secondEscudo }} 
                  style={styles.fullMatchEscudo} 
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.fullMatchEscudoPlaceholder}>
                  <Ionicons name="shield" size={14} color={!firstIsTeam ? THEME.primary : THEME.textMuted} />
                </View>
              )}
            </View>
          </View>
          
          {/* Nombre del rival */}
          <Text style={styles.fullMatchRivalName} numberOfLines={1}>
            {rivalName}
          </Text>
          
          {/* Torneo */}
          {match.torneoId && typeof match.torneoId === 'object' && match.torneoId.nombre && (
            <Text style={[styles.fullMatchTime, { color: match.torneoId.color || THEME.primary }]} numberOfLines={1}>
              {match.torneoId.nombre}
            </Text>
          )}
          
          {/* Hora si no se ha jugado */}
          {!played && (
            <Text style={styles.fullMatchTime}>
              {match.fechaHora 
                ? new Date(match.fechaHora).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                : t('season.toBeDefined')}
            </Text>
          )}
          
          {/* Indicador de ubicación */}
          {match.ubicacion && (
            <View style={styles.fullMatchUbicacion}>
              <Ionicons 
                name={match.ubicacion === 'Casa' ? 'home' : 'airplane'} 
                size={8} 
                color={THEME.textSecondary} 
              />
            </View>
          )}
        </LinearGradient>
      );
    };
    
    return (
      <TouchableOpacity
        key={`day-${index}-${day}`}
        style={[
          styles.dayCell,
          !isCurrentMonth && styles.dayCellOtherMonth,
          isTodayDate && styles.dayCellToday,
          isSelected && styles.dayCellSelected,
          hasEvents && styles.dayCellWithEvents,
          hasMatches && styles.dayCellWithMatch,
        ]}
        onPress={() => handleDayPress(day, isCurrentMonth)}
        disabled={!isCurrentMonth}
        activeOpacity={0.7}
      >
        {/* Si hay partido, mostrar tarjeta grande */}
        {hasMatches && isCurrentMonth ? (
          <>
            {/* Número del día superpuesto */}
            <View style={styles.dayNumberOverlay}>
              <Text style={[
                styles.dayTextOverlay,
                isTodayDate && styles.dayTextTodayOverlay,
              ]}>
                {day}
              </Text>
            </View>
            {renderFullMatchCard(events.matches[0])}
          </>
        ) : (
          <>
            {/* Header con número del día y botón añadir */}
            <View style={styles.dayCellHeader}>
              <Text style={[
                styles.dayText,
                !isCurrentMonth && styles.dayTextOtherMonth,
                isTodayDate && styles.dayTextToday,
                isSelected && styles.dayTextSelected,
              ]}>
                {day}
              </Text>
              
              {/* Botón de añadir evento en el día */}
              {isCurrentMonth && onAddEvent && !hasEvents && (
                <TouchableOpacity
                  style={styles.addDayEventButton}
                  onPress={handleAddEventOnDay}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Ionicons name="add" size={10} color={THEME.primary} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Mini-tarjetas de sesiones (solo si NO hay partidos) */}
            {hasSessions && isCurrentMonth && (
              <View style={styles.miniEventsContainer}>
                {events?.sessions?.slice(0, 2).map(session => renderMiniSessionCard(session))}
                
                {/* Indicador de más sesiones */}
                {events?.sessions?.length > 2 && (
                  <Text style={styles.moreEventsText}>
                    +{events.sessions.length - 2}
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };
  
  // Obtener eventos del día seleccionado para mostrar vista previa
  const selectedDayEventsPreview = useMemo(() => {
    if (!selectedDate) return null;
    const dateKey = formatDateKey(selectedDate.year, selectedDate.month, selectedDate.day);
    return eventsByDate[dateKey] || null;
  }, [selectedDate, eventsByDate]);
  
  // Generar celdas del calendario
  const renderCalendarGrid = () => {
    const cells = [];
    
    // Días del mes anterior
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      cells.push(renderDayCell(day, false, `prev-${i}`));
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(renderDayCell(day, true, `current-${day}`));
    }
    
    // Días del mes siguiente
    for (let day = 1; day <= nextMonthDays; day++) {
      cells.push(renderDayCell(day, false, `next-${day}`));
    }
    
    // Agrupar en semanas
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(
        <View key={`week-${i}`} style={styles.weekRow}>
          {cells.slice(i, i + 7)}
        </View>
      );
    }
    
    return weeks;
  };
  
  // ============ RENDERIZAR VISTA MÓVIL DE SEMANA ============
  const renderMobileWeekView = () => {
    const today = new Date();
    const weekEndDate = new Date(currentWeekStart);
    weekEndDate.setDate(currentWeekStart.getDate() + 6);
    
    const isTodayInThisWeek = currentWeekDays.some(d => 
      d.getDate() === today.getDate() && 
      d.getMonth() === today.getMonth() && 
      d.getFullYear() === today.getFullYear()
    );
    
    return (
      <View style={mobileStyles.container}>
        {/* Header con navegación de semana */}
        <LinearGradient
          colors={THEME.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={mobileStyles.headerGradient}
        >
          <View style={mobileStyles.headerRow}>
            <TouchableOpacity
              style={mobileStyles.navBtn}
              onPress={goToPreviousWeek}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            
            <View style={mobileStyles.headerCenter}>
              <Text style={mobileStyles.weekRangeText}>
                {currentWeekStart.getDate()} - {weekEndDate.getDate()} {MONTHS[weekEndDate.getMonth()]}
              </Text>
              {!isTodayInThisWeek && (
                <TouchableOpacity 
                  style={mobileStyles.todayChip}
                  onPress={goToThisWeek}
                >
                  <Ionicons name="today" size={12} color={THEME.primary} />
                  <Text style={mobileStyles.todayChipText}>{t('season.today')}</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={mobileStyles.navBtn}
              onPress={goToNextWeek}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        
        {/* Selector de días de la semana */}
        <Animated.View 
          style={[
            mobileStyles.weekDaysRow,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          {currentWeekDays.map((day, index) => {
            const isSelected = selectedMobileDate && 
              day.getDate() === selectedMobileDate.getDate() &&
              day.getMonth() === selectedMobileDate.getMonth();
            const isTodayDate = day.getDate() === today.getDate() && 
              day.getMonth() === today.getMonth() &&
              day.getFullYear() === today.getFullYear();
            const dateKey = formatDateKey(day.getFullYear(), day.getMonth(), day.getDate());
            const dayEvents = eventsByDate[dateKey];
            const hasMatch = dayEvents?.matches?.length > 0;
            const hasSession = dayEvents?.sessions?.length > 0;
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  mobileStyles.dayBtn,
                  isSelected && mobileStyles.dayBtnSelected,
                  isTodayDate && !isSelected && mobileStyles.dayBtnToday,
                ]}
                onPress={() => handleMobileDayPress(day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  mobileStyles.dayName,
                  isSelected && mobileStyles.dayNameSelected,
                ]}>
                  {WEEKDAYS_SHORT[index].slice(0, 3)}
                </Text>
                <Text style={[
                  mobileStyles.dayNum,
                  isSelected && mobileStyles.dayNumSelected,
                  isTodayDate && mobileStyles.dayNumToday,
                ]}>
                  {day.getDate()}
                </Text>
                {/* Indicadores de eventos */}
                <View style={mobileStyles.eventDots}>
                  {hasMatch && <View style={[mobileStyles.eventDot, { backgroundColor: THEME.primary }]} />}
                  {hasSession && <View style={[mobileStyles.eventDot, { backgroundColor: THEME.success }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
        
        {/* Contenido del día seleccionado */}
        <ScrollView 
          style={mobileStyles.dayContent}
          contentContainerStyle={mobileStyles.dayContentInner}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={mobileStyles.loadingBox}>
              <ActivityIndicator size="large" color={THEME.primary} />
            </View>
          ) : (
            <>
              {/* Título del día */}
              <View style={mobileStyles.dayHeader}>
                <Text style={mobileStyles.dayTitle}>
                  {selectedMobileDate && WEEKDAYS_FULL[(selectedMobileDate.getDay() + 6) % 7]}
                  {', '}
                  {selectedMobileDate?.getDate()} {MONTHS[selectedMobileDate?.getMonth()]}
                </Text>
                {onAddEvent && (
                  <TouchableOpacity
                    style={mobileStyles.addBtn}
                    onPress={() => onAddEvent(selectedMobileDate)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Lista de eventos */}
              {(!selectedMobileDayEvents || 
                (selectedMobileDayEvents.matches?.length === 0 && 
                 selectedMobileDayEvents.sessions?.length === 0)) ? (
                <View style={mobileStyles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color={THEME.textMuted} />
                  <Text style={mobileStyles.emptyText}>{t('season.noEvents') || 'Sin eventos'}</Text>
                  {onAddEvent && (
                    <TouchableOpacity
                      style={mobileStyles.emptyAddBtn}
                      onPress={() => onAddEvent(selectedMobileDate)}
                    >
                      <Ionicons name="add-circle" size={18} color={THEME.primary} />
                      <Text style={mobileStyles.emptyAddText}>{t('season.add')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {/* Partidos */}
                  {selectedMobileDayEvents?.matches?.map((match) => (
                    <TouchableOpacity 
                      key={`mob-match-${match._id}`} 
                      style={mobileStyles.eventCard}
                      onPress={() => onMatchPress && onMatchPress(match)}
                      activeOpacity={0.7}
                    >
                      <View style={[mobileStyles.eventBadge, { backgroundColor: THEME.primary + '20' }]}>
                        <Ionicons name="football" size={14} color={THEME.primary} />
                        <Text style={[mobileStyles.eventBadgeText, { color: THEME.primary }]}>
                          {t('season.match')} {match.fase === 'eliminatoria' && match.ronda
                            ? `- ${t(`tournaments.round${({final:'Final',semifinal:'Semifinal',cuartos:'Quarters',octavos:'Round16',dieciseisavos:'Round32',treintaydosavos:'Round64'})[match.ronda] || 'Final'}`)}`
                            : match.fase === 'grupos' && match.grupo
                              ? `- G${match.grupo}${match.jornada ? ` J${match.jornada}` : ''}`
                              : match.jornada ? `- J${match.jornada}` : ''}
                        </Text>
                      </View>
                      
                      <View style={mobileStyles.matchTeams}>
                        {/* Equipo local */}
                        <View style={mobileStyles.teamCol}>
                          {(isAwayMatch(match) ? getRivalEscudo(match) : team?.escudo) ? (
                            <Image 
                              source={{ uri: isAwayMatch(match) ? getRivalEscudo(match) : team?.escudo }} 
                              style={mobileStyles.teamBadge} 
                            />
                          ) : (
                            <View style={mobileStyles.teamBadgePlaceholder}>
                              <Ionicons name="shield" size={20} color={THEME.primary} />
                            </View>
                          )}
                          <Text style={mobileStyles.teamName} numberOfLines={1}>
                            {isAwayMatch(match) ? (match.rival || t('season.rival')) : (team?.nombre || t('season.myTeam'))}
                          </Text>
                        </View>
                        
                        {/* Resultado o VS */}
                        <View style={mobileStyles.resultCol}>
                          {isMatchPlayed(match) ? (
                            <Text style={mobileStyles.resultText}>
                              {isAwayMatch(match) 
                                ? `${match.golesContra || 0} - ${match.golesFavor || 0}`
                                : `${match.golesFavor || 0} - ${match.golesContra || 0}`}
                            </Text>
                          ) : (
                            <Text style={mobileStyles.vsText}>vs</Text>
                          )}
                        </View>
                        
                        {/* Equipo visitante */}
                        <View style={mobileStyles.teamCol}>
                          {(isAwayMatch(match) ? team?.escudo : getRivalEscudo(match)) ? (
                            <Image 
                              source={{ uri: isAwayMatch(match) ? team?.escudo : getRivalEscudo(match) }} 
                              style={mobileStyles.teamBadge} 
                            />
                          ) : (
                            <View style={mobileStyles.teamBadgePlaceholder}>
                              <Ionicons name="shield" size={20} color={THEME.danger} />
                            </View>
                          )}
                          <Text style={mobileStyles.teamName} numberOfLines={1}>
                            {isAwayMatch(match) ? (team?.nombre || t('season.myTeam')) : (match.rival || t('season.rival'))}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Info adicional */}
                      <View style={mobileStyles.matchInfo}>
                        {match.fechaHora && (
                          <View style={mobileStyles.infoChip}>
                            <Ionicons name="time" size={12} color={THEME.textSecondary} />
                            <Text style={mobileStyles.infoText}>
                              {new Date(match.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        )}
                        {match.ubicacion && (
                          <View style={mobileStyles.infoChip}>
                            <Ionicons 
                              name={match.ubicacion === 'Casa' ? 'home' : 'airplane'} 
                              size={12} 
                              color={THEME.textSecondary} 
                            />
                            <Text style={mobileStyles.infoText}>{match.ubicacion}</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  
                  {/* Sesiones de entrenamiento */}
                  {selectedMobileDayEvents?.sessions?.map((session) => (
                    <TouchableOpacity 
                      key={`mob-session-${session._id}`} 
                      style={mobileStyles.eventCard}
                      onPress={() => onSessionPress && onSessionPress(session)}
                      activeOpacity={0.7}
                    >
                      <View style={[mobileStyles.eventBadge, { backgroundColor: THEME.success + '20' }]}>
                        <Ionicons name="fitness" size={14} color={THEME.success} />
                        <Text style={[mobileStyles.eventBadgeText, { color: THEME.success }]}>
                          {t('season.training')}
                        </Text>
                      </View>
                      
                      <View style={mobileStyles.sessionContent}>
                        {team?.escudo && (
                          <Image source={{ uri: team.escudo }} style={mobileStyles.sessionBadge} />
                        )}
                        <View style={mobileStyles.sessionInfo}>
                          <Text style={mobileStyles.sessionTitle}>
                            {session.lugar || t('season.training')}
                          </Text>
                          <View style={mobileStyles.sessionMeta}>
                            {(session.horaInicio || session.horaFin) && (
                              <View style={mobileStyles.infoChip}>
                                <Ionicons name="time" size={12} color={THEME.success} />
                                <Text style={[mobileStyles.infoText, { color: THEME.success }]}>
                                  {session.horaInicio || '--:--'} - {session.horaFin || '--:--'}
                                </Text>
                              </View>
                            )}
                            {session.ejercicios?.length > 0 && (
                              <View style={mobileStyles.infoChip}>
                                <Ionicons name="barbell" size={12} color={THEME.success} />
                                <Text style={[mobileStyles.infoText, { color: THEME.success }]}>
                                  {session.ejercicios.length} {t('exercises.title') || 'ejercicios'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  };
  
  // ============ RENDERIZAR VISTA DE ESCRITORIO (ORIGINAL) ============
  if (isMobile) {
    return renderMobileWeekView();
  }
  
  return (
    <View style={styles.container}>
      {/* Header del calendario */}
      <View style={styles.calendarHeader}>
        <LinearGradient
          colors={THEME.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={goToPreviousMonth}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.monthYearContainer}
              onPress={goToToday}
              activeOpacity={0.8}
            >
              <Text style={styles.monthYearText}>
                {MONTHS[currentMonth]} {currentYear}
              </Text>
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>{t('season.today')}</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.navButton}
              onPress={goToNextMonth}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
      
      {/* Leyenda de eventos */}
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: THEME.primary }]} />
          <Text style={styles.legendText}>{t('season.match')}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: THEME.success }]} />
          <Text style={styles.legendText}>{t('season.training')}</Text>
        </View>
        {onAddEvent && (
          <TouchableOpacity
            style={styles.addEventButton}
            onPress={() => {
              // Pasar la fecha seleccionada o el día actual
              const dateToAdd = selectedDate 
                ? new Date(selectedDate.year, selectedDate.month, selectedDate.day)
                : new Date();
              onAddEvent(dateToAdd);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle" size={20} color={THEME.primary} />
            <Text style={styles.addEventText}>{t('season.add')}</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Días de la semana */}
      <View style={styles.weekdaysRow}>
        {WEEKDAYS_SHORT.map((day, index) => (
          <View key={`weekday-${index}`} style={styles.weekdayCell}>
            <Text style={[
              styles.weekdayText,
              (index === 5 || index === 6) && styles.weekdayTextWeekend
            ]}>
              {day}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Grid del calendario */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loadingText}>{t('season.loadingEvents')}</Text>
        </View>
      ) : (
        <View style={styles.calendarGrid}>
          {renderCalendarGrid()}
        </View>
      )}
      
      {/* Vista previa de eventos del día seleccionado */}
      {selectedDayEventsPreview && (selectedDayEventsPreview.matches?.length > 0 || selectedDayEventsPreview.sessions?.length > 0) && (
        <View style={styles.eventsPreviewContainer}>
          <View style={styles.eventsPreviewHeader}>
            <Text style={styles.eventsPreviewTitle}>
              {selectedDate && new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'es-ES', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsPreviewScroll}
          >
            {/* Partidos */}
            {selectedDayEventsPreview.matches?.map(match => renderMatchPreview(match))}
            
            {/* Sesiones */}
            {selectedDayEventsPreview.sessions?.map(session => renderSessionPreview(session))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    marginHorizontal: isMobileDevice() ? 12 : 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  
  // Header
  calendarHeader: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthYearText: {
    fontSize: isMobileDevice() ? 18 : 22,
    fontWeight: '700',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  
  // Leyenda
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: THEME.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: THEME.textSecondary,
    fontWeight: '500',
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: THEME.primary + '15',
    borderRadius: 16,
  },
  addEventText: {
    fontSize: 12,
    color: THEME.primary,
    fontWeight: '600',
  },
  
  // Días de la semana
  weekdaysRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  weekdayTextWeekend: {
    color: THEME.primary,
  },
  
  // Grid del calendario
  calendarGrid: {
    padding: 4,
  },
  weekRow: {
    flexDirection: 'row',
  },
  
  // Celdas de días - más altas para mostrar eventos
  dayCell: {
    flex: 1,
    minHeight: isMobileDevice() ? 70 : 85,
    margin: 2,
    borderRadius: 8,
    backgroundColor: THEME.surface,
    position: 'relative',
    padding: 4,
  },
  dayCellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  addDayEventButton: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: THEME.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellOtherMonth: {
    opacity: 0.3,
  },
  dayCellToday: {
    backgroundColor: THEME.primary + '10',
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  dayCellSelected: {
    backgroundColor: THEME.primary + '20',
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  dayCellWithEvents: {
    borderWidth: 1,
    borderColor: THEME.border,
  },
  dayCellWithMatch: {
    padding: 0,
    overflow: 'hidden',
  },
  
  // Tarjeta grande de partido que ocupa todo el día
  fullMatchCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
    borderRadius: 6,
  },
  fullMatchEscudosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  fullMatchEscudoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMatchEscudo: {
    width: isMobileDevice() ? 18 : 24,
    height: isMobileDevice() ? 18 : 24,
  },
  fullMatchEscudoPlaceholder: {
    width: isMobileDevice() ? 18 : 24,
    height: isMobileDevice() ? 18 : 24,
    borderRadius: 3,
    backgroundColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullMatchVsContainer: {
    paddingHorizontal: 4,
  },
  fullMatchVs: {
    fontSize: isMobileDevice() ? 8 : 10,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  fullMatchResult: {
    fontSize: isMobileDevice() ? 10 : 12,
    fontWeight: '800',
    color: THEME.text,
  },
  fullMatchRivalName: {
    fontSize: isMobileDevice() ? 7 : 9,
    fontWeight: '600',
    color: THEME.textSecondary,
    textAlign: 'center',
    maxWidth: '90%',
  },
  fullMatchTime: {
    fontSize: isMobileDevice() ? 7 : 9,
    fontWeight: '600',
    color: THEME.primary,
    marginTop: 1,
  },
  fullMatchUbicacion: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  dayNumberOverlay: {
    position: 'absolute',
    top: 2,
    left: 4,
    zIndex: 10,
  },
  dayTextOverlay: {
    fontSize: isMobileDevice() ? 10 : 11,
    fontWeight: '700',
    color: THEME.textSecondary,
  },
  dayTextTodayOverlay: {
    color: THEME.primary,
  },
  
  // Texto de días
  dayText: {
    fontSize: isMobileDevice() ? 11 : 13,
    fontWeight: '600',
    color: THEME.text,
  },
  dayTextOtherMonth: {
    color: THEME.textMuted,
  },
  dayTextToday: {
    color: THEME.primary,
    fontWeight: '700',
  },
  dayTextSelected: {
    color: THEME.primary,
    fontWeight: '700',
  },
  
  // Mini eventos en celda
  miniEventsContainer: {
    flex: 1,
    gap: 2,
  },
  miniEventCard: {
    backgroundColor: THEME.primary + '15',
    borderRadius: 4,
    padding: 3,
    borderLeftWidth: 2,
    borderLeftColor: THEME.primary,
  },
  miniMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  miniBadge: {
    width: isMobileDevice() ? 14 : 18,
    height: isMobileDevice() ? 14 : 18,
  },
  miniBadgePlaceholder: {
    width: isMobileDevice() ? 14 : 18,
    height: isMobileDevice() ? 14 : 18,
    borderRadius: isMobileDevice() ? 7 : 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniResultText: {
    fontSize: isMobileDevice() ? 9 : 11,
    fontWeight: '700',
    color: THEME.text,
  },
  miniTimeText: {
    fontSize: isMobileDevice() ? 8 : 10,
    fontWeight: '600',
    color: THEME.primary,
  },
  miniSessionCard: {
    backgroundColor: THEME.success + '15',
    borderRadius: 6,
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: THEME.success,
    minHeight: 40,
  },
  miniSessionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  miniSessionInfo: {
    flex: 1,
    gap: 2,
  },
  miniBadgeSmall: {
    width: isMobileDevice() ? 14 : 16,
    height: isMobileDevice() ? 14 : 16,
    marginTop: 2,
  },
  miniSessionText: {
    fontSize: isMobileDevice() ? 10 : 11,
    fontWeight: '600',
    color: THEME.success,
    lineHeight: 14,
  },
  miniSessionTime: {
    fontSize: isMobileDevice() ? 9 : 10,
    fontWeight: '500',
    color: THEME.success,
    opacity: 0.8,
  },
  moreEventsText: {
    fontSize: 8,
    fontWeight: '600',
    color: THEME.textSecondary,
    textAlign: 'center',
  },
  
  // Loading
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: THEME.textSecondary,
  },
  
  // Vista previa de eventos
  eventsPreviewContainer: {
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingVertical: 16,
    backgroundColor: THEME.background,
  },
  eventsPreviewHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  eventsPreviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    textTransform: 'capitalize',
  },
  eventsPreviewScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  
  // Tarjeta de vista previa de evento
  eventPreviewCard: {
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 14,
    minWidth: 240,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  
  // Header del partido
  matchPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  eventTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  jornadaText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  
  // Contenedor de equipos del partido
  matchTeamsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  teamInfoPreview: {
    alignItems: 'center',
    flex: 1,
  },
  teamBadgePreview: {
    width: 32,
    height: 32,
    marginBottom: 4,
  },
  teamBadgePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  teamNamePreview: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.text,
    textAlign: 'center',
    maxWidth: 70,
  },
  
  // Resultado del partido
  matchResultContainer: {
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchResultText: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  matchTimePreviewText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },
  matchVsText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  
  // Detalles del partido
  matchDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  matchDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchDetailText: {
    fontSize: 10,
    color: THEME.textSecondary,
  },
  
  // Header de sesión
  sessionPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  // Info de sesión
  sessionInfoContainer: {
    gap: 10,
  },
  sessionTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionTeamBadge: {
    width: 28,
    height: 28,
  },
  sessionTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    flex: 1,
  },
  sessionDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionDetailText: {
    fontSize: 12,
    color: THEME.textSecondary,
    maxWidth: 100,
  },
  sessionTimeText: {
    fontWeight: '600',
    color: THEME.success,
  },
  sessionExercisesCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    marginTop: 6,
  },
  sessionExercisesText: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.success,
  },
});

// ============ ESTILOS PARA VISTA MÓVIL DE SEMANA ============
const mobileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  
  // Header
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 6,
  },
  weekRangeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  todayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.primary,
  },
  
  // Selector de días
  weekDaysRow: {
    flexDirection: 'row',
    backgroundColor: THEME.surface,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  dayBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 12,
    backgroundColor: THEME.background,
    minHeight: 68,
  },
  dayBtnSelected: {
    backgroundColor: THEME.primary,
  },
  dayBtnToday: {
    borderWidth: 2,
    borderColor: THEME.primary,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  dayNameSelected: {
    color: '#fff',
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
  },
  dayNumSelected: {
    color: '#fff',
  },
  dayNumToday: {
    color: THEME.primary,
  },
  eventDots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
    height: 8,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  
  // Contenido del día
  dayContent: {
    flex: 1,
  },
  dayContentInner: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    textTransform: 'capitalize',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  
  // Estado vacío
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: THEME.textMuted,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: THEME.primary + '15',
    borderRadius: 20,
    marginTop: 8,
  },
  emptyAddText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.primary,
  },
  
  // Tarjeta de evento
  eventCard: {
    backgroundColor: THEME.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Partido
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
  },
  teamBadge: {
    width: 44,
    height: 44,
    marginBottom: 6,
    resizeMode: 'contain',
  },
  teamBadgePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '500',
    color: THEME.text,
    textAlign: 'center',
    maxWidth: 80,
  },
  resultCol: {
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.text,
  },
  vsText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  matchInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: THEME.textSecondary,
  },
  
  // Sesión
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionBadge: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  sessionInfo: {
    flex: 1,
    gap: 6,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: THEME.text,
  },
  sessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
