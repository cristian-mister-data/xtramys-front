// Helpers compartidos para sesiones de entrenamiento

/**
 * Obtiene el estado de una lesión
 * @param {Object} injury - Objeto de lesión
 * @returns {Object|null} - Estado de la lesión o null si no está activa
 */
export function getInjuryStatus(injury) {
  if (!injury) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const fechaInicio = new Date(injury.fechaInicio);
  fechaInicio.setHours(0, 0, 0, 0);
  
  const fechaFin = injury.fechaFin ? new Date(injury.fechaFin) : null;
  if (fechaFin) fechaFin.setHours(0, 0, 0, 0);

  // Si ya terminó la lesión
  if (fechaFin && fechaFin < today) {
    return null;
  }

  // Si está lesionado actualmente
  if (fechaInicio <= today && (!fechaFin || fechaFin >= today)) {
    return { status: 'injured', color: '#ef4444' };
  }

  // Si es una lesión futura (poco común pero posible)
  if (fechaInicio > today) {
    return { status: 'recovering', color: '#f59e0b' };
  }

  return null;
}

/**
 * Obtiene el estado de lesión de un jugador
 * @param {string} playerId - ID del jugador
 * @param {Array} injuries - Lista de lesiones
 * @returns {Object|null} - Estado de la lesión o null
 */
export function getPlayerInjuryStatus(playerId, injuries) {
  if (!injuries || !Array.isArray(injuries)) return null;

  const playerInjuries = injuries.filter(i => {
    if (!i.jugador) return false;
    // Si jugador es un objeto con _id
    if (typeof i.jugador === 'object' && i.jugador._id) {
      return i.jugador._id === playerId;
    }
    // Si jugador es un string directamente
    return i.jugador === playerId;
  });

  if (playerInjuries.length === 0) return null;
  
  // Obtener la lesión más reciente
  const latestInjury = playerInjuries.sort(
    (a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio)
  )[0];
  
  return getInjuryStatus(latestInjury);
}

/**
 * Formatea una fecha de sesión para mostrar
 * @param {string} fechaStr - Fecha en string
 * @param {string} horaInicio - Hora de inicio
 * @param {string} horaFin - Hora de fin
 * @param {Function} t - Función de traducción
 * @returns {string} - Fecha formateada
 */
export function formatFechaSesion(fechaStr, horaInicio, horaFin, t) {
  const fecha = new Date(fechaStr);
  if (isNaN(fecha.getTime())) return '';
  
  const dias = t ? [
    t('weekdays.sunday'),
    t('weekdays.monday'),
    t('weekdays.tuesday'),
    t('weekdays.wednesday'),
    t('weekdays.thursday'),
    t('weekdays.friday'),
    t('weekdays.saturday')
  ] : ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  return `${dias[fecha.getDay()]} ${fecha.toLocaleDateString()} - ${horaInicio || '--:--'}h - ${horaFin || '--:--'}h`;
}

/**
 * Formatea una fecha a YYYY-MM-DD
 * @param {Date} date - Fecha
 * @returns {string} - Fecha formateada
 */
export function formatDateToYMD(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Añade un cero inicial a números menores a 10
 * @param {number} n - Número
 * @returns {string} - Número con padding
 */
export function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Valida formato de hora HH:MM (01-24:00-59)
 * @param {string} str - String de hora
 * @returns {boolean} - Si es válido
 */
export function isValidTime(str) {
  if (!/^([0][1-9]|1\d|2[0-4]):[0-5]\d$/.test(str)) return false;
  if (str.startsWith('24') && str !== '24:00') return false;
  return true;
}

/**
 * Compara dos horas en formato HH:MM
 * @param {string} a - Primera hora
 * @param {string} b - Segunda hora
 * @returns {number} - Diferencia en minutos (positivo si a > b)
 */
export function compareTimes(a, b) {
  const [ha, ma] = a.split(':').map(Number);
  const [hb, mb] = b.split(':').map(Number);
  return ha * 60 + ma - (hb * 60 + mb);
}

/**
 * Parsea un string de hora a objeto {h, m}
 * @param {string} str - Hora en formato HH:MM
 * @returns {Object} - {h: number, m: number}
 */
export function parseTimeToHM(str) {
  if (isValidTime(str)) {
    const [h, m] = str.split(':').map(Number);
    return { h, m };
  }
  return { h: 1, m: 0 };
}

// Arrays de horas y minutos para selectores
export const HOURS = Array.from({ length: 24 }, (_, i) => i + 1);
export const MINUTES_ALL = Array.from({ length: 60 }, (_, i) => i);

/**
 * Calcula la duración total de los ejercicios
 * @param {Array} ejercicios - Lista de ejercicios con tiempo y descanso
 * @returns {number} - Duración total en minutos
 */
export function calcularDuracionTotal(ejercicios) {
  if (!ejercicios || ejercicios.length === 0) return 0;
  
  return ejercicios.reduce((total, ej, idx) => {
    const tiempo = parseInt(ej.tiempo) || 0;
    const descanso = idx < ejercicios.length - 1 ? (parseInt(ej.tiempoDescanso) || 0) : 0;
    return total + tiempo + descanso;
  }, 0);
}

/**
 * Obtiene el nombre completo de un jugador
 * @param {Object} player - Objeto jugador
 * @returns {string} - Nombre completo
 */
export function getPlayerFullName(player) {
  if (!player) return '';
  const nombre = player.nombre || '';
  const apellidos = player.apellidos || '';
  return `${nombre} ${apellidos}`.trim();
}

/**
 * Obtiene las iniciales de un jugador
 * @param {Object} player - Objeto jugador
 * @returns {string} - Iniciales
 */
export function getPlayerInitials(player) {
  if (!player) return '??';
  const nombre = player.nombre || '';
  const apellidos = player.apellidos || '';
  const inicial1 = nombre.charAt(0).toUpperCase();
  const inicial2 = apellidos.charAt(0).toUpperCase();
  return `${inicial1}${inicial2}` || '??';
}
