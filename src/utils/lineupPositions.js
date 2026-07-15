export function buildLineupAssignments(titulares = [], savedPositions = [], formationPositions = []) {
  const assignments = {};
  savedPositions.forEach((saved) => {
    const playerId = typeof saved.player === 'object' ? saved.player?._id : saved.player;
    const index = Number.isInteger(saved.index)
      ? saved.index
      : formationPositions.findIndex((position) => position.pos === saved.posicionTactica && position.x === saved.x && position.y === saved.y);
    if (playerId && index >= 0 && index < formationPositions.length) assignments[index] = playerId;
  });
  if (Object.keys(assignments).length === 0) {
    titulares.forEach((playerId, index) => {
      if (index < formationPositions.length) assignments[index] = playerId;
    });
  }
  return assignments;
}

export function buildVisualPositions(assignments, formationPositions = []) {
  return formationPositions.flatMap((position) => {
    const player = assignments[position.index];
    return player ? [{ player, index: position.index, x: position.x, y: position.y, posicionTactica: position.pos }] : [];
  });
}
