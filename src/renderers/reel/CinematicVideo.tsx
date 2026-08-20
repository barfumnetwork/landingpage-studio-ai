import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { de } from '../../i18n/de';
import {
  releaseVideoPlayback,
  requestVideoPlayback,
} from '../../features/assets/videoPlayback';
import styles from './CinematicVideo.module.css';

interface CinematicVideoProps {
  url: string;
  alt: string;
  autoPlay: boolean;
}

function bindTime(video: HTMLVideoElement, onProgress: (value: number) => void): () => void {
  function onTime(): void {
    if (!video.duration) return;
    onProgress(video.currentTime / video.duration);
  }
  video.addEventListener('timeupdate', onTime);
  return () => video.removeEventListener('timeupdate', onTime);
}

export function CinematicVideo({ url, alt, autoPlay }: CinematicVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!playing) {
      node.pause();
      return;
    }
    if (!requestVideoPlayback(node)) {
      setPlaying(false);
      return;
    }
    node.muted = true;
    node.play().catch(() => setPlaying(false));
    return () => releaseVideoPlayback(node);
  }, [playing]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return bindTime(node, setProgress);
  }, []);

  function toggle(): void {
    setPlaying((value) => !value);
  }

  function onSeek(event: PointerEvent<HTMLButtonElement>): void {
    const video = ref.current;
    if (!video?.duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    setProgress(ratio);
  }

  return (
    <div className={styles.stage} data-cursor="play">
      <video
        ref={ref}
        className={styles.video}
        src={url}
        muted
        playsInline
        loop
        aria-label={alt}
        onClick={toggle}
      />
      <div className={styles.chrome}>
        <button
          type="button"
          className={styles.toggle}
          onClick={toggle}
          aria-pressed={playing}
          aria-label={playing ? de.gallery.pause : de.gallery.play}
        >
          {playing ? de.gallery.pause : de.gallery.play}
        </button>
        <button
          type="button"
          className={styles.track}
          onPointerDown={onSeek}
          aria-label={de.gallery.videoHint}
        >
          <span
            className={styles.fill}
            style={{ transform: `scaleX(${String(progress)})` }}
          />
        </button>
      </div>
    </div>
  );
}
