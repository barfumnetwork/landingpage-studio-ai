export function hash32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function conceptSeed(
  projectId: string,
  conceptId: string,
  extra?: number,
): number {
  const base = `${projectId}:${conceptId}`;
  if (extra === undefined) return hash32(base);
  return hash32(`${base}:${extra}`);
}
