export function getNewSeasonName(year, existingSeasons) {
  const names = new Set(existingSeasons.map(season => season.año));
  let name = year;
  for (let index = 2; names.has(name); index++) name = `${year} (${index})`;
  return name;
}
