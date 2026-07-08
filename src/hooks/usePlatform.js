import { useEffect, useState } from 'react';
import { isNative, platform } from '@/platform/capacitor';

export function useIsMobile() {
  const getValue = () => isNative || window.matchMedia('(max-width: 700px)').matches;
  const [mobile, setMobile] = useState(getValue);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setMobile(getValue());
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return mobile;
}

export function usePlatform() {
  return { platform, isNative, isMobile: useIsMobile() };
}
