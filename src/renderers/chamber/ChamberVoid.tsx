import { useEffect, useRef } from 'react';
import { startPhoenixWorld } from './phoenixWorld';
import styles from './ChamberVoid.module.css';

interface ChamberVoidProps {
  logoUrl: string | null;
  brandName: string;
  mediaUrl?: string | null;
  mediaKind?: 'image' | 'video' | null;
  compact?: boolean;
  immersive?: boolean;
  environmentUrl?: string | null;
}

export default function ChamberVoid({
  compact = false,
  immersive = false,
  environmentUrl = null,
}: ChamberVoidProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = hostRef.current;
    if (!node) return undefined;
    return startPhoenixWorld(node, compact, immersive, environmentUrl);
  }, [compact, immersive, environmentUrl]);

  return (
    <div
      ref={hostRef}
      className={`${styles.void} ${compact ? styles.compact : ''}`}
      aria-hidden="true"
    />
  );
}
