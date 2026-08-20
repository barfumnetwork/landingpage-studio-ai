import { useEffect, type RefObject } from 'react';

function attachMagnetic(el: HTMLElement, strength: number): () => void {
  function onMove(event: PointerEvent): void {
    const rect = el.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    el.style.transform = `translate3d(${((x / rect.width) * strength).toFixed(2)}px, ${((y / rect.height) * strength).toFixed(2)}px, 0)`;
  }

  function onLeave(): void {
    el.style.transform = '';
  }

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    el.style.transform = '';
  };
}

export function useMagnetic(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
  strength = 14,
): void {
  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    return attachMagnetic(node, strength);
  }, [enabled, ref, strength]);
}
