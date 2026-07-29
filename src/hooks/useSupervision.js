import { useSelector } from 'react-redux';

export const isSeasonReadOnly = (season, user) =>
  Boolean(season?.archivada && !user?.allowMultiSeasonManagement);

export default function useSupervision() {
  const supervising = useSelector((s) => s.usuario.supervising);
  const user = useSelector((s) => s.usuario.user);
  const season = useSelector((s) => s.season.season);
  const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';
  const archivedSeason = isSeasonReadOnly(season, user);
  return { supervising, isDemo, archivedSeason, canMutate: !supervising && !isDemo && !archivedSeason };
}
