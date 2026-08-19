import { useEffect, useRef } from 'react';
import type { AssetFile } from '../../types/project';
import styles from './assets.module.css';
import { useAssetObjectUrl } from './useAssetObjectUrl';
import { releaseVideoPlayback, requestVideoPlayback } from './videoPlayback';

interface VideoPreviewProps {
  asset: AssetFile;
}

export function VideoPreview({ asset }: VideoPreviewProps) {
  const url = useAssetObjectUrl(asset.blobKey);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          if (requestVideoPlayback(video)) {
            void video.play().catch(() => {
              releaseVideoPlayback(video);
            });
          }
          return;
        }
        releaseVideoPlayback(video);
      },
      { threshold: 0.35 },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      releaseVideoPlayback(video);
    };
  }, [url]);

  if (!url) {
    return <div className={styles.thumbWrap} aria-hidden="true" />;
  }

  return (
    <video
      ref={videoRef}
      className={styles.video}
      src={url}
      muted
      playsInline
      loop
      preload="metadata"
      aria-label={asset.name}
    />
  );
}
