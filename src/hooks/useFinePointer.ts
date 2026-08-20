import { useEffect, useState } from 'react';

export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sync = () => setFine(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return fine;
}
