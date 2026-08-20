import { useEffect, useRef } from 'react';
import { useFinePointer } from '../../hooks/useFinePointer';
import { useReducedMotion } from '../../renderers/shared/useReducedMotion';
import styles from './StudioCursor.module.css';

const CURSOR_KEYS = ['view', 'play', 'open', 'explore', 'next', 'close', 'drag'] as const;

function cursorFrom(target: EventTarget | null): string {
  if (!(target instanceof Element)) return '';
  const node = target.closest('[data-cursor]');
  if (!(node instanceof HTMLElement)) return '';
  const value = node.dataset.cursor ?? '';
  return (CURSOR_KEYS as readonly string[]).includes(value) ? value : '';
}

export function StudioCursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const enabled = fine && !reduced;

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('has-studio-cursor');
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;
    const dotEl = dot;
    const ringEl = ring;
    const labelEl = label;
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
      labelEl.style.transform = `translate3d(${String(rx + 22)}px, ${String(ry - 10)}px, 0)`;
      frame = window.requestAnimationFrame(tick);
    }

    function onMove(event: PointerEvent): void {
      x = event.clientX;
      y = event.clientY;
    }

    function onOver(event: PointerEvent): void {
      const mode = cursorFrom(event.target);
      document.documentElement.classList.toggle('cursor-hot', Boolean(mode));
      document.documentElement.dataset.cursor = mode;
      labelEl.textContent = mode ? mode.toUpperCase() : '';
      labelEl.dataset.on = mode ? 'true' : 'false';
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.documentElement.classList.remove('has-studio-cursor', 'cursor-hot');
      delete document.documentElement.dataset.cursor;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className={styles.layer} aria-hidden="true">
      <div ref={ringRef} className={styles.ring} />
      <div ref={dotRef} className={styles.dot} />
      <div ref={labelRef} className={styles.label} />
    </div>
  );
}
