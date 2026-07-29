export const CUSTOM_TASK_PREFIX = 'custom-task:';

export const getCustomTaskId = (task) => String(task?.id || task?._id || '').trim();

export const getCustomTaskSelectionId = (task) => {
  const id = getCustomTaskId(task);
  return id ? `${CUSTOM_TASK_PREFIX}${id}` : '';
};

export const isCustomTaskSelectionId = (id) => String(id || '').startsWith(CUSTOM_TASK_PREFIX);

export const customTaskAsExercise = (task) => ({
  _id: getCustomTaskSelectionId(task),
  nombre: task?.nombre || 'Tarea',
  imagen: task?.imagen || '',
  descripcion: task?.descripcion || '',
  observacionesPersonalizadas: (task?.observaciones || []).filter(Boolean),
  orden: Number(task?.orden) || 0,
  isCustomTask: true,
});

export const mergeOrderedSessionTasks = (exercises, detailMap, customTasks) => [
  ...(exercises || []).map((exercise) => ({
    ...exercise,
    orden: Number(detailMap?.[exercise._id]?.orden) || 0,
  })),
  ...(customTasks || []).map(customTaskAsExercise),
].sort((a, b) => a.orden - b.orden);
