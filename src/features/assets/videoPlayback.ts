const MAX_PLAYING = 3;
const playing = new Set<HTMLVideoElement>();

export function requestVideoPlayback(video: HTMLVideoElement): boolean {
  if (playing.has(video)) return true;
  if (playing.size >= MAX_PLAYING) return false;
  playing.add(video);
  return true;
}

export function releaseVideoPlayback(video: HTMLVideoElement): void {
  playing.delete(video);
  video.pause();
}
