import { useEffect, useState, type RefObject } from 'react';

export function useInView(ref: RefObject<Element | null>, enabled = true): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setInView(entry.isIntersecting && entry.intersectionRatio > 0.2);
      },
      { threshold: [0.2, 0.5, 0.8], rootMargin: '80px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, ref]);

  return inView;
}
