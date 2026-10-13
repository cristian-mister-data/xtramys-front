export const TUTORIAL_TASKS = [
  { id: 'player', path: '/players', title: ['Crear un jugador', 'Create a player'], hint: ['Añade un jugador real a tu plantilla. Recorreremos sus datos, posición y opciones antes de guardarlo.', 'Add a real player to your squad. We will walk through their details, position and options before saving.'] },
  { id: 'exercise', path: '/exercises', title: ['Crear un ejercicio', 'Create an exercise'], hint: ['Completa nombre y duración. Añade descripción, objetivo, material y recursos si los necesitas. Guarda el ejercicio para continuar.', 'Enter a name and duration. Add a description, objective, equipment and resources as needed. Save the exercise to continue.'] },
  { id: 'training', path: '/training', title: ['Crear un entrenamiento', 'Create a training session'], hint: ['Elige fecha y horario, añade ejercicios o tareas y selecciona los jugadores. Revisa los datos y guarda la sesión.', 'Choose the date and time, add exercises or tasks and select players. Review the details and save the session.'] },
  { id: 'rival', path: '/rivals', title: ['Crear un rival', 'Create an opponent'], hint: ['Introduce el nombre del equipo rival. Puedes añadir su escudo y configurar las equipaciones antes de guardarlo.', 'Enter the opponent team name. You can add its badge and configure its kits before saving.'] },
  { id: 'match', path: '/match-sheets', title: ['Crear una ficha de partido', 'Create a match sheet'], hint: ['Completa fecha, rival y ubicación. Revisa convocatoria, alineación y el resto de datos que necesites, y guarda la ficha.', 'Enter the date, opponent and venue. Review the squad, lineup and any other details you need, then save the match sheet.'] },
];
export const PLAYER_FIELDS = [
  ['photo', 'Foto (opcional)', 'Photo (optional)'],
  ['name', 'Nombre obligatorio', 'Required first name', true],
  ['surname', 'Apellido obligatorio', 'Required last name', true],
  ['nickname', 'Apodo (opcional)', 'Nickname (optional)'],
  ['number', 'Dorsal (opcional)', 'Squad number (optional)'],
  ['age', 'Edad (opcional)', 'Age (optional)'],
  ['height', 'Altura (opcional)', 'Height (optional)'],
  ['sex', 'Sexo', 'Sex'],
  ['birth', 'Fecha de nacimiento (opcional)', 'Date of birth (optional)'],
  ['foot', 'Pierna preferida (opcional)', 'Preferred foot (optional)'],
  ['position', 'Posición (opcional)', 'Position (optional)'],
  ['extra', 'Jugador extra y procedencia (opcional)', 'Guest player and origin (optional)'],
];
export const creationTasks = {
  'jugador/createJugador/fulfilled': 'player',
  'ejercicio/createEjercicio/fulfilled': 'exercise',
  'entrenamiento/createEntrenamiento/fulfilled': 'training',
  'rival/createRival/fulfilled': 'rival',
  'matchSheet/create/fulfilled': 'match',
};
export const tutorialCreationMiddleware = () => next => action => {
  const result = next(action);
  if (creationTasks[action.type] && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('xtramys:tutorial-created', { detail: creationTasks[action.type] }));
  }
  return result;
};
export function newTutorial(userId) {
  return { userId, task: 0, phase: 0, outcomes: TUTORIAL_TASKS.map(() => 'pending') };
}
export function advanceTask(session, outcome) {
  return { ...session, task: session.task + 1, phase: 0,
    outcomes: session.outcomes.map((value, index) => index === session.task ? outcome : value) };
}
export function readTutorialSession(userId) {
  try {
    const value = JSON.parse(sessionStorage.getItem('xtramys:guided-tutorial'));
    if (value?.userId === userId && Number.isInteger(value.task) && value.task >= 0 && value.task < TUTORIAL_TASKS.length
      && Number.isInteger(value.phase) && value.phase >= 0 && value.phase <= PLAYER_FIELDS.length + 1
      && value.outcomes?.length === TUTORIAL_TASKS.length && value.outcomes.every(v => ['pending', 'completed', 'skipped'].includes(v))) return value;
  } catch {}
  return null;
}
