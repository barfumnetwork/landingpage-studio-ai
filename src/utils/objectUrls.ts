interface CachedUrl {
  url: string;
  count: number;
}

const cache = new Map<string, CachedUrl>();

export function retainObjectUrl(blobKey: string, blob: Blob): string {
  const existing = cache.get(blobKey);
  if (existing) {
    existing.count += 1;
    return existing.url;
  }
  const url = URL.createObjectURL(blob);
  cache.set(blobKey, { url, count: 1 });
  return url;
}

export function releaseObjectUrl(blobKey: string): void {
  const existing = cache.get(blobKey);
  if (!existing) return;
  existing.count -= 1;
  if (existing.count > 0) return;
  URL.revokeObjectURL(existing.url);
  cache.delete(blobKey);
}

export function revokeObjectUrlNow(blobKey: string): void {
  const existing = cache.get(blobKey);
  if (!existing) return;
  URL.revokeObjectURL(existing.url);
  cache.delete(blobKey);
}

export function revokeObjectUrls(blobKeys: string[]): void {
  for (const key of blobKeys) {
    revokeObjectUrlNow(key);
  }
}
