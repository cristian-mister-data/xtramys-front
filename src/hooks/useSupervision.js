import { useSelector } from 'react-redux';

export default function useSupervision() {
  const supervising = useSelector((s) => s.usuario.supervising);
  return { supervising, canMutate: !supervising };
}