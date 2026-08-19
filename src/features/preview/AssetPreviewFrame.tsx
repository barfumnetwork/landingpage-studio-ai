import { useEffect, useRef } from 'react';
import { de } from '../../i18n/de';
import { useAssetObjectUrl } from '../assets/useAssetObjectUrl';
import type { AssetFile } from '../../types/project';
import styles from './AssetPreviewFrame.module.css';

interface AssetPreviewFrameProps {
  asset: AssetFile | null;
  load: boolean;
  playVideo: boolean;
  className?: string;
  alt: string;
}

function VideoFrame({ url, play, alt }: { url: string; play: boolean; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (play) {
      node.play().catch(() => undefined);
      return;
    }
    node.pause();
  }, [play]);

  return (
    <video
      ref={ref}
      className={styles.media}
      src={url}
      muted
      playsInline
      loop
      aria-label={alt}
    />
  );
}

export function AssetPreviewFrame({
  asset,
  load,
  playVideo,
  className,
  alt,
}: AssetPreviewFrameProps) {
  const url = useAssetObjectUrl(load ? (asset?.blobKey ?? null) : null);
  const isVideo = asset?.kind === 'video';

  if (!asset) {
    return (
      <div className={`${styles.frame} ${className ?? ''}`} aria-hidden="true">
        <div className={styles.placeholder} />
      </div>
    );
  }

  if (!load) {
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

  if (isVideo) {
    return (
      <div className={`${styles.frame} ${className ?? ''}`}>
        <VideoFrame url={url} play={playVideo} alt={alt} />
      </div>
    );
  }

  return (
    <div className={`${styles.frame} ${className ?? ''}`}>
      <img className={styles.media} src={url} alt={alt} />
    </div>
  );
}
