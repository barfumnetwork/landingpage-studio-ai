import { de } from '../../i18n/de';
import {
  requestVideoPlayback,
  releaseVideoPlayback,
} from '../../features/assets/videoPlayback';
import type { AssetFile } from '../../types/project';
import { useEffect, useRef } from 'react';
import styles from './RendererMedia.module.css';

interface RendererMediaProps {
  asset: AssetFile | null;
  url: string | null;
  alt: string;
  className?: string;
  contain?: boolean;
  autoPlay?: boolean;
}

export function RendererMedia({
  asset,
  url,
  alt,
  className,
  contain = false,
  autoPlay = false,
}: RendererMediaProps) {
  if (!asset) {
    return (
      <div className={`${styles.frame} ${className ?? ''}`} aria-hidden="true">
        <div className={styles.placeholder} />
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`${styles.frame} ${className ?? ''}`}>
        <p className={styles.missing}>{de.gallery.missingImage}</p>
      </div>
    );
  }

  if (asset.kind === 'video') {
    return (
      <div className={`${styles.frame} ${className ?? ''}`}>
        <RendererVideo url={url} alt={alt} autoPlay={autoPlay} contain={contain} />
      </div>
    );
  }

  return (
    <div className={`${styles.frame} ${className ?? ''}`}>
      <img
        className={`${styles.media} ${contain ? styles.contain : ''}`}
        src={url}
        alt={alt}
      />
    </div>
  );
}

function RendererVideo({
  url,
  alt,
  autoPlay,
  contain,
}: {
  url: string;
  alt: string;
  autoPlay: boolean;
  contain: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!autoPlay) {
      node.pause();
      return;
    }
    if (!requestVideoPlayback(node)) return;
    node.muted = true;
    node.play().catch(() => undefined);
    return () => releaseVideoPlayback(node);
  }, [autoPlay]);

  return (
    <video
      ref={ref}
      className={`${styles.media} ${contain ? styles.contain : ''}`}
      src={url}
      muted
      playsInline
      loop
      controls={!autoPlay}
      aria-label={alt}
    />
  );
}
