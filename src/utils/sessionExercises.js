export function getEntityId(value) {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value !== 'object') return '';

  if (value._id || value.id) return getEntityId(value._id || value.id);
  if (value.ejercicio) return getEntityId(value.ejercicio);
  if (value.ejercicioId) return getEntityId(value.ejercicioId);

  return '';
}

export function getSessionExerciseId(item) {
  return getEntityId(item?.ejercicio || item?.ejercicioId || item);
}

export function getSessionExerciseIds(session) {
  const details = Array.isArray(session?.ejerciciosDetalle) ? session.ejerciciosDetalle : [];
  const direct = Array.isArray(session?.ejercicios) ? session.ejercicios : [];
  const source = details.length > 0 ? details : direct;

  return source.map(getSessionExerciseId).filter(Boolean);
}

function getExerciseObject(item) {
  if (!item || typeof item !== 'object') return null;
  if (item.ejercicio && typeof item.ejercicio === 'object') return item.ejercicio;
  if (item.nombre || item.imagen || item.descripcion || item.objetivo) return item;
  return null;
}

export function getEmbeddedSessionExercises(session) {
  const embedded = [];
  const details = Array.isArray(session?.ejerciciosDetalle) ? session.ejerciciosDetalle : [];
  const direct = Array.isArray(session?.ejercicios) ? session.ejercicios : [];

  [...details, ...direct].forEach((item) => {
    const exercise = getExerciseObject(item);
    if (exercise) embedded.push(exercise);
  });

  return embedded;
}

export function mergeExercises(...lists) {
  const byId = new Map();
  lists.flat().forEach((exercise) => {
    const id = getEntityId(exercise);
    if (id && !byId.has(id)) byId.set(id, exercise);
  });
  return Array.from(byId.values());
}

export function buildExerciseMap(exercises) {
  const map = new Map();
  (exercises || []).forEach((exercise) => {
    const id = getEntityId(exercise);
    if (id) map.set(id, exercise);
  });
  return map;
}

/**
 * Returns the full exercise objects belonging to a session.
 * Looks up by ID in the provided exercises list, falling back to
 * objects embedded in ejerciciosDetalle / ejercicios when not found.
 */
export function getSessionExercises(session, exercises = []) {
  const allExercises = mergeExercises(exercises, getEmbeddedSessionExercises(session));
  const exerciseMap = buildExerciseMap(allExercises);
  const exerciseIds = getSessionExerciseIds(session);
  return exerciseIds.map((id) => exerciseMap.get(id)).filter(Boolean);
}
