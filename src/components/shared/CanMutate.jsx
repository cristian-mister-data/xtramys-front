import useSupervision from '@/hooks/useSupervision';

export default function CanMutate({ children }) {
  const { canMutate } = useSupervision();
  if (!canMutate) return null;
  return children;
}