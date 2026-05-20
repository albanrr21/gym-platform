const requests = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const current = (requests.get(key) ?? []).filter((t) => now - t < windowMs);
  if (current.length >= limit) return false;
  requests.set(key, [...current, now]);
  return true;
}
