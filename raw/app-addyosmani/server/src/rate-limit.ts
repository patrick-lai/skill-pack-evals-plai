export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string): boolean => {
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs)
    if (recent.length >= limit) {
      hits.set(key, recent)
      return false
    }
    recent.push(now)
    hits.set(key, recent)
    return true
  }
}
