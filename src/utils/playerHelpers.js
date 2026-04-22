/**
 * Helper functions for player data handling
 */

/**
 * Returns the full name of a player (nombre + apellido)
 * @param {Object} player - The player object
 * @returns {string} - Full name or empty string
 */
export const getPlayerFullName = (player) => {
  if (!player) return '';
  const nombre = player.nombre || '';
  const apellido = player.apellidos || player.apellido || '';
  return `${nombre} ${apellido}`.trim();
};

/**
 * Returns only the first name of a player
 * @param {Object} player - The player object
 * @returns {string} - First name or empty string
 */
export const getPlayerFirstName = (player) => {
  if (!player) return '';
  return player.nombre || '';
};

/**
 * Returns the initials of a player
 * @param {Object} player - The player object
 * @returns {string} - Initials (e.g., "JD" for "Juan Diaz")
 */
export const getPlayerInitials = (player) => {
  if (!player) return '';
  const firstName = player.nombre?.charAt(0) || '';
  const lastName = (player.apellidos || player.apellido)?.charAt(0) || '';
  return `${firstName}${lastName}`.toUpperCase();
};
