import { useEffect, type RefObject } from 'react';

function attachParallax(el: HTMLElement, strength: number): () => void {
  let frame = 0;
  let currentX = 0;
  let currentY = 0;
  let targetX = 0;
  let targetY = 0;

  let lastPx = '';
  let lastPy = '';

  function tick(): void {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    const px = currentX.toFixed(3);
    const py = currentY.toFixed(3);
    if (px !== lastPx) {
      el.style.setProperty('--px', px);
      lastPx = px;
    }
    if (py !== lastPy) {
      el.style.setProperty('--py', py);
      lastPy = py;
    }
    frame = window.requestAnimationFrame(tick);
  }

  function onMove(event: PointerEvent): void {
    const rect = el.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    targetX = nx * strength;
    targetY = ny * strength;
  }

  function onLeave(): void {
    targetX = 0;
    targetY = 0;
  }

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  frame = window.requestAnimationFrame(tick);
  return () => {
    window.cancelAnimationFrame(frame);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    el.style.removeProperty('--px');
    el.style.removeProperty('--py');
  };
}

export function usePointerParallax(
  ref: RefObject<HTMLElement | null>,
  strength = 12,
  enabled = true,
): void {
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    return attachParallax(node, strength);
  }, [enabled, ref, strength]);
}
