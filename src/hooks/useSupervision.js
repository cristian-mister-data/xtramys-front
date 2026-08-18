import { useSelector } from 'react-redux';

export const isSeasonReadOnly = (season, user) =>
  Boolean(season?.archivada && !user?.allowMultiSeasonManagement);

export default function useSupervision() {
  const supervising = useSelector((s) => s.usuario.supervising);
  const user = useSelector((s) => s.usuario.user);
  const season = useSelector((s) => s.season.season);
  const workspace = useSelector((s) => s.workspace.selected);
  const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';
  const archivedSeason = isSeasonReadOnly(season, user);
  const workspaceReadOnly = Boolean(workspace && !workspace.canWrite);
  return {
    supervising,
    isDemo,
    archivedSeason,
    workspaceReadOnly,
    historical: Boolean(workspace?.historical),
    canMutate: !supervising && !isDemo && !archivedSeason && !workspaceReadOnly,
  };
}
