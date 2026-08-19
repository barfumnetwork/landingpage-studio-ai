import { useEffect, useState } from 'react';

export function useReducedMotion(override?: boolean): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (override !== undefined) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [override]);

  return override ?? matches;
}
