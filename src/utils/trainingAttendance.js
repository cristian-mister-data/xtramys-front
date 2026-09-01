export const trainingPlayerId = (value) => String(value?._id || value?.id || value || '');

export function isPlayerInTraining(session, playerId) {
  const id = trainingPlayerId(playerId);
  return [...(session?.jugadores || []), ...(session?.jugadoresExtras || [])]
    .some((player) => trainingPlayerId(player) === id);
}

export function didPlayerAttendTraining(session, playerId) {
  if (!isPlayerInTraining(session, playerId)) return false;
  if (session?.asistenciaRegistrada !== true) return true;
  const id = trainingPlayerId(playerId);
  return !(session.jugadoresAusentes || []).some((player) => trainingPlayerId(player) === id);
}
