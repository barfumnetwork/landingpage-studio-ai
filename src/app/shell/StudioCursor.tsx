import { useEffect, useRef } from 'react';
import { useFinePointer } from '../../hooks/useFinePointer';
import { useReducedMotion } from '../../renderers/shared/useReducedMotion';
import styles from './StudioCursor.module.css';

export function StudioCursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const enabled = fine && !reduced;

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('has-studio-cursor');
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    const dotEl = dot;
    const ringEl = ring;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let frame = 0;

    function tick(): void {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      dotEl.style.transform = `translate3d(${String(x)}px, ${String(y)}px, 0)`;
      ringEl.style.transform = `translate3d(${String(rx)}px, ${String(ry)}px, 0)`;
      frame = window.requestAnimationFrame(tick);
    }

    function onMove(event: PointerEvent): void {
      x = event.clientX;
      y = event.clientY;
    }

    function onOver(event: PointerEvent): void {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const hot = Boolean(target.closest('a, button, [data-cursor-hot]'));
      document.documentElement.classList.toggle('cursor-hot', hot);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.documentElement.classList.remove('has-studio-cursor', 'cursor-hot');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className={styles.layer} aria-hidden="true">
      <div ref={ringRef} className={styles.ring} />
      <div ref={dotRef} className={styles.dot} />
    </div>
  );
}
