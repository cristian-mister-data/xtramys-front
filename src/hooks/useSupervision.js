import { useSelector } from 'react-redux';

export default function useSupervision() {
  const supervising = useSelector((s) => s.usuario.supervising);
  const user = useSelector((s) => s.usuario.user);
  const isDemo = user?.plan === 'demo' || user?.accessMode === 'demo';
  return { supervising, isDemo, canMutate: !supervising && !isDemo };
}
